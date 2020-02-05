import ora from 'ora';
import boxen from 'boxen';
import inquirer from 'inquirer';
import request from 'request-promise-native';
import accounting from 'accounting';

const currencyMap = {
    GBP: '£',
    USD: '$',
    EUR: '€'
};

export async function init(config) {
    const questions = [
        {
            name: 'token',
            message: 'Personal Access Token'
        }
    ];
    const { token } = await inquirer.prompt(questions);
    const spinner = ora({ text: 'Fetching accounts...', color: 'yellow' }).start();
    try {
        const { accounts } = await request.get('https://api.starlingbank.com/api/v2/accounts', {
            json: true,
            auth: {
                bearer: token
            }
        });
        config.set({ token, accounts });
        spinner.succeed('Accounts saved');
    } catch (error) {
        spinner.fail(error.error.error_description);
    }
}

export async function checkBalance(config) {
    const spinner = ora({ text: 'Fetching balances...', color: 'yellow' }).start();
    try {
        const accounts = config.get('accounts');
        const balances = [];
        for (const acc of accounts) {
            const bearer = config.get('token');
            const { effectiveBalance } = await request.get(`https://api.starlingbank.com/api/v2/accounts/${acc.accountUid}/balance`, {
                json: true,
                auth: {
                    bearer
                }
            });
            const balance = accounting.formatMoney(effectiveBalance.minorUnits / 100, { symbol: currencyMap[acc.currency], });
            balances.push(balance);
        }
        spinner.stop();
        console.log(boxen(balances.join('\n'), { padding: 1, margin: 1, borderStyle: 'double', borderColor: 'green' }));
    } catch (error) {
        spinner.fail(error.error.error_description);
    }
}
