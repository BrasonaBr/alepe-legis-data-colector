import coletarTabela from "./coletarTabela.js"
import chalk from "chalk";
import { readFile } from 'fs/promises';
import path from 'path';
import { isBooleanObject } from "util/types";

process.stdout.write('\x1Bc');

async function lerPackageJson() {
    const filePath = path.resolve('./package.json');
    const content = await readFile(filePath, 'utf-8');
    const packageJson = JSON.parse(content);

    console.log(chalk.bgWhite.black.bold(`${packageJson.name} | v${packageJson.version} | ${packageJson.author}\n`));
}

await lerPackageJson();

function start() {
    const argumentosDoUsuario = process.argv.slice(2);

    /*if (argumentosDoUsuario.length === 1) {
        coletarTabela(parseInt(argumentosDoUsuario[0], null))
    } else if (argumentosDoUsuario.length === 2) {
        coletarTabela(parseInt(argumentosDoUsuario[0]), parseInt(argumentosDoUsuario[1]))
    } else if (argumentosDoUsuario.length === 0) {
        coletarTabela(null, null)
    }*/

    let mes = null
    let ano = null
    let multi = false

    if (argumentosDoUsuario.length >= 1 && argumentosDoUsuario.length <= 3) {
        if (parseInt(argumentosDoUsuario[0]) <= 12) {
            mes = parseInt(argumentosDoUsuario[0])
        } else if (parseInt(argumentosDoUsuario[0]) > 12) {
            ano = parseInt(argumentosDoUsuario[0])
        } else if (argumentosDoUsuario[0] === 'm') {
            multi = true
        }

        if (parseInt(argumentosDoUsuario[1]) > 12) {
            ano = parseInt(argumentosDoUsuario[1])
        } else if (argumentosDoUsuario[1] === 'm') {
            multi = true
        }

        if (argumentosDoUsuario[2] === 'm') {
            multi = true
        }
        coletarTabela(mes, ano, multi)
    }
}

start()