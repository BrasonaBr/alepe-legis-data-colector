import * as fs from "fs/promises";
import * as puppeteer from "puppeteer"
import chalk from "chalk"
import cliProgress from "cli-progress"
import ExcelJS from "exceljs"

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Plan 1');

async function coletarDados(ocorrencias, multi = false, batchSize = 15) {
    const total = ocorrencias.length - 1

    console.log(chalk.blue(`Número de decretos publicados: ${ocorrencias.length}`))

    const browser = await puppeteer.launch({
        headless: 'new', //false// Definindo explicitamente o novo modo Headless
    });
    //process.stdout.write('\x1Bc');
    const page = await browser.newPage();

    // Array para armazenar os resultados
    const resultados = [];

    resultados.push(`#Id@CNPJ@Decreto@Mês@Tipo@DecOrig@Programa`);
    worksheet.addRow(['Id', 'CNPJ', 'Decreto', 'Mês', 'Tipo', 'DecOrig', 'Programa']);

    const progressBar = new cliProgress.SingleBar({
        format: chalk.bold.cyan('{bar} {percentage}% ') + chalk.cyan('| Tempo estimado: {eta}s'),
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });

    async function buscarNaPagina(page) {
        const palavras = ['CNPJ/MF n', 'DECRETO N', 'Introduz alterações no Decreto', 'prorrogação do prazo de fruição', 'renovação do prazo de fruição', "PRODEPE", "PROIND"];

        return await page.evaluate((palavras) => {
            const bodyText = document.body.innerText;
            const result = palavras.reduce((obj, palavra) => {
                const indexPalavra = bodyText.indexOf(palavra);
                const palavraInclusa = bodyText.includes(palavra)
                let textoSeguinte;

                if (palavra === "PRODEPE" && palavraInclusa) {
                    obj.programa = palavra
                } else if (palavra === "PROIND" && palavraInclusa) {
                    obj.programa = palavra
                }

                if (palavra === 'CNPJ/MF n' || palavra === 'DECRETO N') {
                    textoSeguinte = bodyText.substring(indexPalavra + palavra.length + 1).split(' ')[1];

                    if (palavra === 'CNPJ/MF n') {
                        obj.cnpj = [palavraInclusa, textoSeguinte];
                    } else {
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

                        obj.decOrg = [palavraInclusa, textoSeguinte.slice(0, -1), mesNum];
                    }
                } else {
                    const n = bodyText.indexOf("Decreto n");
                    textoSeguinte = bodyText.substring(n + 10).split(' ')[1];
                    const retorno = [palavraInclusa, textoSeguinte.slice(0, -1)];

                    if (palavra === 'Introduz alterações no Decreto') {
                        obj.alterador = retorno;
                    } else if (palavra === 'prorrogação do prazo de fruição') {
                        obj.prorrogador = retorno;
                    } else {
                        obj.renovador = retorno;
                    }
                }

                return obj;
            }, {});

            return result;
        }, palavras);
    }

    function escreverArquivo(i, cnpj, decOrg, alterador, prorrogador, renovador, programa) {
        if (cnpj[0]) {
            if (alterador[0]) {
                resultados.push(`#${i}@${cnpj[1]}@${decOrg[1]}@${decOrg[2]}@A@${alterador[1]}@${programa}`);
                worksheet.addRow([i, cnpj[1], decOrg[1], decOrg[2], "A", alterador[1], programa]);
            } else if (prorrogador[0]) {
                resultados.push(`#${i}@${cnpj[1]}@${decOrg[1]}@${decOrg[2]}@P@${prorrogador[1]}@${programa}`);
                worksheet.addRow([i, cnpj[1], decOrg[1], decOrg[2], "P", prorrogador[1], programa]);
            } else if (renovador[0]) {
                resultados.push(`#${i}@${cnpj[1]}@${decOrg[1]}@${decOrg[2]}@R@${renovador[1]}@${programa}`);
                worksheet.addRow([i, cnpj[1], decOrg[1], decOrg[2], "R", renovador[1], programa]);
            } else {
                resultados.push(`#${i}@${cnpj[1]}@${decOrg[1]}@${decOrg[2]}@C@${decOrg[1]}@${programa}`);
                worksheet.addRow([i, cnpj[1], decOrg[1], decOrg[2], "C", decOrg[1], programa]);
            }
        } else if (alterador[0]) {
            resultados.push(`#${i}@00.000.000/0000-00@${decOrg[1]}@${decOrg[2]}@A@${alterador[1]}@${programa}`);
            worksheet.addRow([i, '00.000.000/0000-00', decOrg[1], decOrg[2], "A", alterador[1], programa]);
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

                const buscaNaPagina = await buscarNaPagina(page);

                escreverArquivo(i, buscaNaPagina.cnpj, buscaNaPagina.decOrg, buscaNaPagina.alterador, buscaNaPagina.prorrogador, buscaNaPagina.renovador, buscaNaPagina.programa);

                await page.close();
                await context.close();
            });

            // Aguardar a resolução do lote atual antes de prosseguir
            await Promise.all(batchPromises.map((promise, index) =>
                promise.then(() => {
                    progressoBarra++;
                    progressBar.update((((progressoBarra) / total) * 100));
                    progressBar.updateETA();
                }).catch(error => {
                    console.error(`Promessa ${batchStart + index} falhou:`, error);
                    // faça qualquer coisa que você precisa com a promessa rejeitada
                })
            ));
        }

        progressBar.stop();
    } else {
        console.log(chalk.yellow.bold("Coletando decretos"))
        progressBar.start(100, 0);

        for (let index = 0; index < ocorrencias.length; index++) {
            const i = ocorrencias[(ocorrencias.length - 1) - index].nextNumber

            await page.goto(`https://legis.alepe.pe.gov.br/texto.aspx?id=${i}&tipo=`, { timeout: 120000 });

            const buscaNaPagina = await buscarNaPagina(page);

            escreverArquivo(i, buscaNaPagina.cnpj, buscaNaPagina.decOrg, buscaNaPagina.alterador, buscaNaPagina.prorrogador, buscaNaPagina.renovador, buscaNaPagina.programa)

            progressBar.update((((index) / total) * 100));
            progressBar.updateETA();
        }
        progressBar.stop();
    }

    await browser.close();

    console.log(chalk.blue(`Número de decretos Prodepe e Proind: ${resultados.length - 1}`))

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

export default coletarDados