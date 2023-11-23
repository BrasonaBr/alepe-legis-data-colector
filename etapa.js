import coletarDados from "./webScraper.js"
import chalk from "chalk"
import realizarPesquisa from "./pesquisa.js"
import searchInFile from "./searchInFile.js"
import pesquisaProdutos from "./pesquisaProdutos.js"
import coletarProdutos from "./webScraperProdutos.js"

// Substitua 'caminho/do/seu/arquivo.txt' pelo caminho real do seu arquivo TXT
const filePath = './internal_table.txt';


async function main(mes = null, ano = null, multi = false, palavraChave) {

    const maxTentativas = 3
    let tentativa = 0
    let delay = 1000

    if (palavraChave) {
        delay = 1500
    }

    while (tentativa < maxTentativas) {
        try {
            if (palavraChave) {
                await pesquisaProdutos(delay, palavraChave)
                // Chama a função de busca
                searchInFile(filePath, (result) => {
                    coletarProdutos(result, palavraChave);
                });
                break
            } else {
                await realizarPesquisa(delay, mes, ano)
                // Chama a função de busca
                searchInFile(filePath, (result) => {
                    coletarDados(result, multi);
                });
                break
            }
        } catch (error) {
            if (tentativa < maxTentativas - 1) {
                console.log(chalk.red.bold(` Tentativa falhou. Tentando novamente...`));
            } else {
                console.log(chalk.red.bold(` Cancelando busca (conexão instável)`));
                process.exit(0);
            }

            tentativa++
            delay *= 1.3
        }
    }
}

export default main