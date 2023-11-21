import * as fs from "fs/promises";
import * as puppeteer from "puppeteer"
import chalk from "chalk"
import cliProgress from "cli-progress"
import ExcelJS from "exceljs"

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Plan 1');

async function coletarDados(ocorrencias) {
    const inicio = 0
    const fim = ocorrencias.length - 1
    const total = fim - inicio

    console.log(chalk.blue(`Número de decretos publicados: ${ocorrencias.length}`))

    const browser = await puppeteer.launch({
        headless: false, //false// Definindo explicitamente o novo modo Headless
    });
    //process.stdout.write('\x1Bc');
    const page = await browser.newPage();

    // Array para armazenar os resultados
    const resultados = [];

    resultados.push(`#id@CNPJ@decreto@mes@tipo@decOrig`);
    worksheet.addRow(['Id', 'CNPJ', 'Decreto', 'Mês', 'Tipo', 'DecOrig']);

    const progressBar = new cliProgress.SingleBar({
        format: chalk.bold.cyan('{bar} {percentage}% ') + chalk.cyan('| Tempo estimado: {eta}s'),
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });

    console.log(chalk.yellow.bold("Coletando decretos"))
    progressBar.start(100, 0);

    for (let index = 0; index < ocorrencias.length; index++) {
        const i = ocorrencias[(ocorrencias.length - 1) - index].nextNumber

        await page.goto(`https://legis.alepe.pe.gov.br/texto.aspx?id=${i}&tipo=`);

        const palavras = ['CNPJ/MF n', 'DECRETO N', 'Introduz alterações no Decreto', 'prorrogação do prazo de fruição', 'renovação do prazo de fruição']

        const buscaNaPagina = await page.evaluate((palavras) => {
            const bodyText = document.body.innerText;
            const result = palavras.reduce((obj, palavra) => {
                const indexPalavra = bodyText.indexOf(palavra);
                let textoSeguinte;
        
                if (palavra === 'CNPJ/MF n' || palavra === 'DECRETO N') {
                    textoSeguinte = bodyText.substring(indexPalavra + palavra.length + 1).split(' ')[1];
        
                    if (palavra === 'CNPJ/MF n') {
                        obj.cnpj = [bodyText.includes(palavra), textoSeguinte];
                    } else {
                        const mes = bodyText.substring(indexPalavra + palavra.length).split(' ')[5];
                        obj.decOrg = [bodyText.includes(palavra), textoSeguinte.slice(0, -1), mes];
                    }
                } else {
                    const n = bodyText.indexOf("Decreto n");
                    textoSeguinte = bodyText.substring(n + 10).split(' ')[1];
                    const retorno = [bodyText.includes(palavra), textoSeguinte.slice(0, -1)];
        
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

        const cnpj = buscaNaPagina.cnpj
        const decOrg = buscaNaPagina.decOrg
        const alterador = buscaNaPagina.alterador
        const prorrogador = buscaNaPagina.prorrogador
        const renovador = buscaNaPagina.renovador

        if (cnpj[0]) {
            if (alterador[0]) {
                resultados.push(`#${i}@${cnpj[1]}@${decOrg[1]}@${decOrg[2]}@A@${alterador[1]}`);
                worksheet.addRow([i, cnpj[1], decOrg[1], decOrg[2], "A", alterador[1]]);
            } else if (prorrogador[0]) {
                resultados.push(`#${i}@${cnpj[1]}@${decOrg[1]}@${decOrg[2]}@P@${prorrogador[1]}`);
                worksheet.addRow([i, cnpj[1], decOrg[1], decOrg[2], "P", prorrogador[1]]);
            } else if (renovador[0]) {
                resultados.push(`#${i}@${cnpj[1]}@${decOrg[1]}@${decOrg[2]}@R@${renovador[1]}`);
                worksheet.addRow([i, cnpj[1], decOrg[1], decOrg[2], "R", renovador[1]]);
            } else {
                resultados.push(`#${i}@${cnpj[1]}@${decOrg[1]}@${decOrg[2]}@C@${decOrg[1]}`);
                worksheet.addRow([i, cnpj[1], decOrg[1], decOrg[2], "C", decOrg[1]]);
            }
        } else if (alterador[0]) {
            resultados.push(`#${i}@00.000.000/0000-00@${decOrg[1]}@${decOrg[2]}@A@${alterador[1]}`);
            worksheet.addRow([i, '00.000.000/0000-00', decOrg[1], decOrg[2], "A", alterador[1]]);
        }

        progressBar.update((((index - inicio) / total) * 100));
        progressBar.updateETA();
    }

    progressBar.stop();

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

/*const cnpj = 'CNPJ/MF n';
        const resultadoCNPJ = await page.evaluate((palavra) => {

            const bodyText = document.body.innerText;
            const indexPalavra = bodyText.indexOf(palavra);
            const textoSeguinte = bodyText.substring(indexPalavra + palavra.length + 1).split(' ')[1];
            return [bodyText.includes(palavra), textoSeguinte];
        }, cnpj);

        const decretoOriginal = 'DECRETO N';
        const resultadoDecretoOriginal = await page.evaluate((palavra) => {
            const bodyText = document.body.innerText;
            const indexPalavra = bodyText.indexOf(palavra);
            const textoSeguinte = bodyText.substring(indexPalavra + palavra.length + 1).split(' ')[1];
            const mes = bodyText.substring(indexPalavra + palavra.length).split(' ')[5];
            return [bodyText.includes(palavra), textoSeguinte.slice(0, -1), mes];
        }, decretoOriginal);

        const decretoAlterador = 'Introduz alterações no Decreto';
        const resultadoAlterador = await page.evaluate((palavra) => {

            const bodyText = document.body.innerText;
            const indexPalavra = bodyText.indexOf(palavra);
            const n = bodyText.indexOf("Decreto n");
            const textoSeguinte = bodyText.substring(n + 10).split(' ')[1];
            return [bodyText.includes(palavra), textoSeguinte.slice(0, -1)];
        }, decretoAlterador);

        const decretoProrrogador = 'prorrogação do prazo de fruição';
        const resultadoProrrogador = await page.evaluate((palavra) => {

            const bodyText = document.body.innerText;
            const indexPalavra = bodyText.indexOf(palavra);
            const n = bodyText.indexOf("Decreto n");
            const textoSeguinte = bodyText.substring(n + 10).split(' ')[1];
            return [bodyText.includes(palavra), textoSeguinte.slice(0, -1)];
        }, decretoProrrogador);

        const decretoRenovador = 'renovação do prazo de fruição';
        const resultadoRenovador = await page.evaluate((palavra) => {

            const bodyText = document.body.innerText;
            const indexPalavra = bodyText.indexOf(palavra);
            const n = bodyText.indexOf("Decreto n");
            const textoSeguinte = bodyText.substring(n + 10).split(' ')[1];
            return [bodyText.includes(palavra), textoSeguinte.slice(0, -1)];
        }, decretoRenovador);*/

export default coletarDados