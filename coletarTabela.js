import coletarDados from "./index.js"
import chalk from "chalk"
import realizarPesquisa from "./pesquisa.js"
import searchInFile from "./searchInFile.js"

// Substitua 'caminho/do/seu/arquivo.txt' pelo caminho real do seu arquivo TXT
const filePath = './internal_table.txt';


async function coletarTabela(mes = null, ano = null, multi) {

    const maxTentativas = 3
    let tentativa = 0
    let delay = 1000

    while (tentativa < maxTentativas) {
        try {
            await realizarPesquisa(delay, mes, ano)
            // Chama a função de busca
            searchInFile(filePath, (result) => {
                coletarDados(result, multi);
            });
            break
        } catch (error) {
            if (tentativa < maxTentativas - 1) {
                console.log(chalk.red.bold(` Tentativa falhou. Tentando novamente...`));
            } else {
                console.log(chalk.red.bold(` Cancelando busca`));
                process.exit(0);
            }

            tentativa++
            delay *= 1.5
        }
    }
}

export default coletarTabela