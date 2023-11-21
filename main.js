import coletarTabela from "./coletarTabela.js"
import chalk from "chalk";
import { readFile } from 'fs/promises';
import path from 'path';

process.stdout.write('\x1Bc');

async function lerPackageJson() {
  const filePath = path.resolve('./package.json');
  const content = await readFile(filePath, 'utf-8');
  const packageJson = JSON.parse(content);

  console.log(chalk.bgWhite.black.bold(`${packageJson.name} | v${packageJson.version} | ${packageJson.author}\n`));
}

await lerPackageJson();

const argumentosDoUsuario = process.argv.slice(2);

if (argumentosDoUsuario.length === 1) {
    coletarTabela(parseInt(argumentosDoUsuario[0]))
} else if (argumentosDoUsuario.length === 2) {
    coletarTabela(parseInt(argumentosDoUsuario[0]), parseInt(argumentosDoUsuario[1]))
} else if (argumentosDoUsuario.length === 0) {
    coletarTabela()
}