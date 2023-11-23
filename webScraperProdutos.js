import * as fs from "fs/promises";
import * as puppeteer from "puppeteer"
import chalk from "chalk"
import cliProgress from "cli-progress"
import ExcelJS from "exceljs"

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Plan 1');

async function coletarProdutos(ocorrencias, palavraChave, multi, batchSize) {
    const total = ocorrencias.length - 1

    console.log(chalk.blue(`Número de decretos com produtos publicados: ${ocorrencias.length}`))

    const browser = await puppeteer.launch({
        headless: 'new', //false// Definindo explicitamente o novo modo Headless
    });

    const page = await browser.newPage();

    // Array para armazenar os resultados
    const resultados = [];

    resultados.push(`#Id@Decreto@Mês@Ano@${palavraChave.charAt(0).toUpperCase() + palavraChave.slice(1)}`);
    worksheet.addRow(['Id', 'Decreto', 'Mês', 'Ano', palavraChave.charAt(0).toUpperCase() + palavraChave.slice(1)]);

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

                    let mesNum = '??'; // Default value in case the input is not recognized

                    switch (mes) {
                        case 'JANEIRO':
                            mesNum = "01";
                            break;
                        case 'FEVEREIRO':
                            mesNum = "02";
                            break;
                        case 'MARÇO':
                            mesNum = "03";
                            break;
                        case 'ABRIL':
                            mesNum = "04";
                            break;
                        case 'MAIO':
                            mesNum = "05";
                            break;
                        case 'JUNHO':
                            mesNum = "06";
                            break;
                        case 'JULHO':
                            mesNum = "07";
                            break;
                        case 'AGOSTO':
                            mesNum = "08";
                            break;
                        case 'SETEMBRO':
                            mesNum = "09";
                            break;
                        case 'OUTUBRO':
                            mesNum = "10";
                            break;
                        case 'NOVEMBRO':
                            mesNum = "11";
                            break;
                        case 'DEZEMBRO':
                            mesNum = "12";
                    }

                    const mesIndex = bodyText.indexOf(mes)
                    const anoIndex = mesIndex + mes.length + 4
                    const ano = bodyText.substring(anoIndex, anoIndex + 4);
                    obj.decreto = [palavraInclusa, textoSeguinte.slice(0, -1), mesNum, ano];
                }

                return obj;
            }, {});

            return result;
        }, palavras);
    }

    var totalProdutos = 0

    function escreverArquivo(i, decreto, produtos) {
        const produtosArray = produtos[1].split(";");
        produtosArray[0] = produtosArray[0].replace(new RegExp('\\b' + palavraChave + ': \\b', 'g'), '');
        totalProdutos += (produtosArray.length - 1)
        const produtosTxt = produtos[1].replace(/;/g, "*").replace(new RegExp('\\b' + palavraChave + '\\b', 'g'), '');

        const linhaExcel = [i, decreto[1], decreto[2], decreto[3], ...produtosArray]

        if (produtos[0]) {
            resultados.push(`#${i}@${decreto[1]}@${decreto[2]}@${decreto[3]}@${produtosTxt}`);
            worksheet.addRow(linhaExcel);
        }
    }

    if (multi) {
        console.log(chalk.bgRgb(105, 0, 255).bold("Modo de multiprocessamento"));

        const totalBatches = Math.ceil(ocorrencias.length / batchSize);

        console.log(chalk.yellow.bold("Coletando decretos"));
        progressBar.start(100, 0);

        let progressoBarra = 0;

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const batchStart = batchIndex * batchSize;
            const batchEnd = Math.min((batchIndex + 1) * batchSize, ocorrencias.length);
            const batchPromises = ocorrencias.slice(batchStart, batchEnd).map(async (ocorrencia) => {
                const i = ocorrencia.nextNumber;
                const url = `https://legis.alepe.pe.gov.br/texto.aspx?id=${i}&tipo=`;

                const context = await browser.createIncognitoBrowserContext();
                const page = await context.newPage();

                await page.goto(url, { timeout: 120000 });

                const buscaNaPagina = await buscarNaPagina(page, palavraChave);

                escreverArquivo(i, buscaNaPagina.decreto, buscaNaPagina.produtos)

                await page.close();
                await context.close();
            });

            // Aguardar a resolução do lote atual antes de prosseguir
            await Promise.all(batchPromises.map((promise, index) =>
                promise.then(() => {
                    progressoBarra++;
                    progressBar.update((((progressoBarra) / total) * 100));
                    if (progressoBarra % batchSize !== 0) {
                        progressBar.updateETA()
                    }

                }).catch(error => {
                    console.error(`Promessa ${batchStart + index} falhou:`, error);
                    // faça qualquer coisa que você precisa com a promessa rejeitada
                })
            ));
        }
    } else {
        console.log(chalk.yellow.bold("Coletando produtos"))
        progressBar.start(100, 0);

        for (let index = 0; index < ocorrencias.length; index++) {
            const i = ocorrencias[(ocorrencias.length - 1) - index].nextNumber

            await page.goto(`https://legis.alepe.pe.gov.br/texto.aspx?id=${i}&tipo=`, { timeout: 120000 });

            const buscaNaPagina = await buscarNaPagina(page, palavraChave);

            escreverArquivo(i, buscaNaPagina.decreto, buscaNaPagina.produtos)

            progressBar.update(((index / total) * 100));
            progressBar.updateETA();
        }
    }

    progressBar.stop();

    await browser.close();

    console.log(chalk.blue(`Número de decretos Prodepe com produtos: ${resultados.length - 1}`))

    console.log(chalk.blue("Número de produtos encontrados: " + totalProdutos))

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