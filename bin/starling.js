#!/usr/bin/env node

import program from "commander";
import Configstore from "configstore";
import updateNotifier from "update-notifier";
import { readFile } from "fs/promises";
import {
  init,
  checkBalance,
  listTransactions,
  listMandates,
  listAccounts
} from "../src/main.js";

const pkg = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url))
);

updateNotifier({ pkg }).notify();

const config = new Configstore(pkg.name);

program.version(pkg.version);

program
  .command("init")
  .alias("i")
  .description("Initialise connection to Starling")
  .action(() => {
    init(config);
  });

program
  .command("balance")
  .alias("b")
  .description("Fetch your Starling account balance")
  .action(() => {
    checkBalance(config);
  });

program
  .command("transactions")
  .alias("tx")
  .description("Fetch your Starling account transactions")
  .action(() => {
    listTransactions(config);
  });

program
  .command("mandates")
  .alias("dd")
  .description("Fetch the Direct Debit mandates on your Starling account")
  .action(() => {
    listMandates(config);
  });

program
  .command('accounts')
  .alias('a')
  .description('List your Starling bank accounts')
  .action(() => {
    listAccounts(config);
  });

program.parse(process.argv);
