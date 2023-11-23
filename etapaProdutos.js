import coletarProdutos from "./webScraperProdutos.js"
import chalk from "chalk"
import pesquisaProdutos from "./pesquisaProdutos.js"
import searchInFile from "./searchInFile.js"

// Substitua 'caminho/do/seu/arquivo.txt' pelo caminho real do seu arquivo TXT
const filePath = './internal_table.txt';


async function main(palavraChave) {

    console.log(chalk.blue("Termo buscado: " + palavraChave + "\n"))

    const maxTentativas = 3
    let tentativa = 0
    let delay = 1300

    while (tentativa < maxTentativas) {
        try {
            await pesquisaProdutos(delay, palavraChave)
            // Chama a função de busca
            searchInFile(filePath, (result) => {
                coletarProdutos(result, palavraChave);
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

export default main