import * as fs from "fs/promises";
import * as puppeteer from "puppeteer"
import chalk from "chalk"
import cliProgress from "cli-progress"

async function coletarDados(ocorrencias) {
    const browser = await puppeteer.launch({
        headless: 'new', //false// Definindo explicitamente o novo modo Headless
    });
    //process.stdout.write('\x1Bc');
    const page = await browser.newPage();

    // Array para armazenar os resultados
    const resultados = [];

    resultados.push(`#id@CNPJ@decreto@mes@tipo@decOrig`);

    const progressBar = new cliProgress.SingleBar({
        format: chalk.bold.cyan('{bar} {percentage}% ') + chalk.bold.green('| Tempo estimado: {eta}s'),
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });

    console.log(chalk.green.bold("Coletando decretos"))
    progressBar.start(100, 0);

    const inicio = 0
    const fim = ocorrencias.length - 1
    const total = fim - inicio

    //for (let i = inicio; i <= fim; i++) {
    for (let index = 0; index < ocorrencias.length; index++) {
        let i = ocorrencias[(ocorrencias.length - 1) - index].nextNumber
        //console.log("Ocorrencia: ", i)
        await page.goto(`https://legis.alepe.pe.gov.br/texto.aspx?id=${i}&tipo=`);

        const cnpj = 'CNPJ/MF n';
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
        }, decretoRenovador);

        if (resultadoCNPJ[0]) {
            if (resultadoAlterador[0]) {
                resultados.push(`#${i}@${resultadoCNPJ[1]}@${resultadoDecretoOriginal[1]}@${resultadoDecretoOriginal[2]}@A@${resultadoAlterador[1]}`);
            } else if (resultadoProrrogador[0]) {
                resultados.push(`#${i}@${resultadoCNPJ[1]}@${resultadoDecretoOriginal[1]}@${resultadoDecretoOriginal[2]}@P@${resultadoProrrogador[1]}`);
            } else if (resultadoRenovador[0]) {
                resultados.push(`#${i}@${resultadoCNPJ[1]}@${resultadoDecretoOriginal[1]}@${resultadoDecretoOriginal[2]}@R@${resultadoRenovador[1]}`);
            } else {
                resultados.push(`#${i}@${resultadoCNPJ[1]}@${resultadoDecretoOriginal[1]}@${resultadoDecretoOriginal[2]}@C@${resultadoDecretoOriginal[1]}`);
            }
        } else if (resultadoAlterador[0]) {
            resultados.push(`#${i}@00.000.000/0000-00@${resultadoDecretoOriginal[1]}@${resultadoDecretoOriginal[2]}@A@${resultadoAlterador[1]}`);
        }

        progressBar.update((((index - inicio) / total) * 100));
        progressBar.updateETA();
    }

    progressBar.stop();

    await browser.close();

    try {
        await fs.writeFile('resultados.txt', resultados.join('\n'));
        console.log(chalk.bold.cyan('\nResultados gravados com sucesso no arquivo resultados.txt'));
    } catch (error) {
        console.error(chalk.red('\nErro ao gravar resultados no arquivo:', error));
    }
}

export default coletarDados