import * as fs from "fs/promises";
import * as puppeteer from "puppeteer"
import chalk from "chalk"
import cliProgress from "cli-progress"
import ExcelJS from "exceljs"

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Plan 1');

async function coletarProdutos(ocorrencias, palavraChave) {
    const inicio = 0
    const fim = ocorrencias.length - 1
    const total = fim - inicio

    console.log(chalk.blue(`Número de decretos com produtos publicados: ${ocorrencias.length}`))

    const browser = await puppeteer.launch({
        headless: 'new', //false// Definindo explicitamente o novo modo Headless
    });

    const page = await browser.newPage();

    // Array para armazenar os resultados
    const resultados = [];

    resultados.push(`#Id@Decreto@Mês@Ano@Produtos`);
    worksheet.addRow(['Id', 'Decreto', 'Mês', 'Ano', 'Produtos']);

    const progressBar = new cliProgress.SingleBar({
        format: chalk.bold.cyan('{bar} {percentage}% ') + chalk.cyan('| Tempo estimado: {eta}s'),
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });

    async function buscarNaPagina(page, nomeBuscado) {
        const palavras = ['DECRETO N', nomeBuscado];

        return await page.evaluate((palavras) => {
            const bodyText = document.body.innerText;
            const result = palavras.reduce((obj, palavra) => {
                const indexPalavra = bodyText.indexOf(palavra);
                const palavraInclusa = bodyText.includes(palavra)
                let textoSeguinte;

                if (palavra === palavras[1]) {
                    const fimParagrafo = bodyText.indexOf('\n', indexPalavra);
                    textoSeguinte = bodyText.substring(indexPalavra, fimParagrafo);
                    obj.produtos = [palavraInclusa, textoSeguinte]
                }

                if (palavra === 'DECRETO N') {
                    textoSeguinte = bodyText.substring(indexPalavra + palavra.length + 1).split(' ')[1];
                    const mes = bodyText.substring(indexPalavra + palavra.length).split(' ')[5];
                    const mesIndex = bodyText.indexOf(mes)
                    const anoIndex = mesIndex + mes.length + 4
                    const ano = bodyText.substring(anoIndex, anoIndex + 4);
                    obj.decreto = [palavraInclusa, textoSeguinte.slice(0, -1), mes, ano];
                } 

                return obj;
            }, {});

            return result;
        }, palavras);
    }

    function escreverArquivo(i, decreto, produtos) {
        const produtosArray = produtos[1].split(";");
        const produtosTxt = produtos[1].replace(/;/g, "*");

        const linhaExcel = [i, decreto[1], decreto[2], decreto[3], ...produtosArray]

        if (produtos[0]) {
            resultados.push(`#${i}@${decreto[1]}@${decreto[2]}@${decreto[3]}@${produtosTxt}`);
            worksheet.addRow(linhaExcel);
        }
    }

    console.log(chalk.yellow.bold("Coletando produtos"))
    progressBar.start(100, 0);

    for (let index = 0; index < ocorrencias.length; index++) {
        const i = ocorrencias[(ocorrencias.length - 1) - index].nextNumber

        await page.goto(`https://legis.alepe.pe.gov.br/texto.aspx?id=${i}&tipo=`);

        const buscaNaPagina = await buscarNaPagina(page, palavraChave);

        escreverArquivo(i, buscaNaPagina.decreto, buscaNaPagina.produtos)

        progressBar.update((((index - inicio) / total) * 100));
        progressBar.updateETA();
    }
    progressBar.stop();

    await browser.close();

    console.log(chalk.blue(`Número de decretos Prodepe com produtos: ${resultados.length - 1}`))

    try {
        await fs.writeFile('resultadoTexto.txt', resultados.join('\n'));
        console.log(chalk.bold.green('\nResultados gravados com sucesso no arquivo resultadoTexto.txt'));
    } catch (error) {
        console.error(chalk.red('\nErro ao gravar resultados no arquivo:', error));
    }

    // Salvar a planilha em um arquivo
    workbook.xlsx.writeFile('resultadoExcel.xlsx')
        .then(() => {
            console.log(chalk.green.bold('Resultados gravados com sucesso no arquivo resultadoExcel.xlsx'));
        })
        .catch((err) => {
            console.error(chalk.red('Erro ao gerar o arquivo Excel:', err));
        });
}

export default coletarProdutos