import ora from 'ora';
import boxen from 'boxen';
import inquirer from 'inquirer';
import request from 'request-promise-native';
import accounting from 'accounting';
import columnify from 'columnify';
import chalk from 'chalk';

const currencyMap = {
    GBP: '£',
    USD: '$',
    EUR: '€'
};

const directionMap = {
    IN: chalk.green,
    OUT: chalk.red
};

function isValidDate(dateString) {
    const regEx = /^\d{4}-\d{2}-\d{2}$/;
    return dateString.match(regEx) != null;
}

function getFirstDayOfMonth() {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dateToYMD(date) {
    var d = date.getDate();
    var m = date.getMonth() + 1; // Month from 0 to 11
    var y = date.getFullYear();
    return '' + y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
}

export async function init(config) {
    const questions = [
        {
            type: 'password',
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
    } catch ({ error }) {
        spinner.fail(error.error_description);
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
            const balance = accounting.formatMoney(effectiveBalance.minorUnits / 100, { symbol: currencyMap[acc.currency] });
            balances.push(balance);
        }
        spinner.stop();
        console.log(boxen(balances.join('\n'), { padding: 1, margin: 1, borderStyle: 'double', borderColor: 'green' }));
    } catch ({ error }) {
        spinner.fail(error.error_description);
    }
}

export async function listTransactions(config) {
    const accounts = config.get('accounts');
    const questions = [
        {
            type: 'list',
            name: 'account',
            message: 'Select account',
            choices: accounts.map(a => ({ name: a.currency, value: a }))
        },
        {
            name: 'startDate',
            message: 'Transactions start date (YYYY-MM-DD)',
            default: dateToYMD(getFirstDayOfMonth()),
            validate: (input) => {
                return isValidDate(input) ? true : 'Date is invalid. Re-enter'
            }
        }
    ];
    const { account, startDate } = await inquirer.prompt(questions);
    const spinner = ora({ text: 'Fetching transactions...', color: 'yellow' }).start();
    try {
        const bearer = config.get('token');
        const { feedItems } = await request.get(`https://api.starlingbank.com/api/v2/feed/account/${account.accountUid}/category/${account.defaultCategory}`, {
            json: true,
            auth: {
                bearer
            },
            qs: {
                changesSince: new Date(startDate)
            }
        });
        spinner.stop();
        displayTransactions(feedItems);
    } catch ({ error }) {
        spinner.fail(error.error_description);
    }
}

function displayTransactions(feedItems) {
    const columns = columnify(feedItems.map(fi => {
        return {
            time: dateToYMD(new Date(fi.transactionTime)),
            amount: directionMap[fi.direction](accounting.formatMoney(fi.amount.minorUnits / 100, { symbol: currencyMap[fi.amount.currency] })),
            name: fi.counterPartyName,
            type: fi.source
        };
    }));
    console.log(columns);
}
