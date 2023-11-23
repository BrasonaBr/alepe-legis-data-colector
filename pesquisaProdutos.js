import * as puppeteer from "puppeteer"
import * as fs from 'fs';
import chalk from "chalk"
import cliProgress from "cli-progress"

async function pesquisaProdutos(delay = 1500, palavraChave, ano) {

    let anoAtual = ano

    console.log(chalk.blue(`Termo buscado: ${palavraChave} \n`))

    const browser = await puppeteer.launch({
        headless: false, //false// Definindo explicitamente o novo modo Headless
    });

    const page = await browser.newPage();

    const progressBar = new cliProgress.SingleBar({
        format: chalk.bold.cyan('{bar} {percentage}% ') + chalk.cyan('| Tempo estimado: {eta}s'),
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });

    console.log(chalk.yellow.bold("Coletando tabela"))
    progressBar.start(100, 0);

    // URL da página de pesquisa
    const url = 'https://legis.alepe.pe.gov.br/pesquisaAvancada.aspx';

    await page.goto(url);

    const decretoExecutivoInput = "input#cblTipoNorma_3"

    await page.click(decretoExecutivoInput);

    await page.waitForTimeout(delay / 3);

    if (ano) {
        const linkSelectorPublicacao = 'li#li-publicacao a.li-pa';

        await page.click(linkSelectorPublicacao);

        await page.waitForTimeout(delay / 3);

        const caixaDataSelectorInicio = 'input#tbxDataInicialPublicacao';

        const caixaDataSelectorFim = 'input#tbxDataFinalPublicacao';

        // Preencher a caixa de texto da data
        await page.type(caixaDataSelectorInicio, `01/01/${anoAtual}`);
        await page.waitForTimeout(delay / 3);

        await page.type(caixaDataSelectorFim, `31/12/${anoAtual}`);
        await page.waitForTimeout(delay / 3);
    }

    const linkSelector = 'li#li-pesquisa a.li-pa';

    await page.click(linkSelector);

    await page.waitForTimeout(delay / 3);

    const inputPalavraChave = "input#tbxTextoPesquisa"

    await page.type(inputPalavraChave, palavraChave);

    await page.waitForTimeout(delay / 3);

    const botaoPesquisarSelector = 'input#btnPesquisar';

    await page.click(botaoPesquisarSelector);

    await page.waitForTimeout(delay * 2);

    // Obter o texto do elemento <p>
    const quantidadeResultadosSelector = 'p span #lblQtd';
    const quantidadeResultados = await page.evaluate((selector) => {
        const elemento = document.querySelector(selector);
        return elemento.innerText;
    }, quantidadeResultadosSelector);

    const itensPaginaSelector = 'select#ddlTamPagina'

    await page.select(itensPaginaSelector, '200');

    await page.waitForTimeout(delay * 3);

    async function coletarHTML() {
        return await page.evaluate(() => {
            const tabelaSelector = 'table.table.table-hover.table-responsive';
            const tabela = document.querySelector(tabelaSelector);
            return tabela.outerHTML;
        });
    }

    async function clicarBotaoPag(numPag) {
        const linkPaginaSelector = `a#lbtn${numPag}`;
        await page.click(linkPaginaSelector);
    }

    async function clicarProxIntervalo() {
        const linkPaginaSelector = `a#lbtnProx`;
        await page.click(linkPaginaSelector);
    }

    let textoConcatenado = "Página: 1 \n"

    async function addHTML(paginaAtual) {
        textoConcatenado += await coletarHTML() + "\n Página: " + (paginaAtual + 1) + "\n"
    }

    const numPaginas = Math.ceil(parseInt(quantidadeResultados, 10) / 200)
    const intevalos = Math.ceil(numPaginas / 5)
    const elementosUltimoIntervalo = numPaginas % 5

    await page.waitForTimeout(delay * 2);

    let doidice = true
    let paginaAtual = 0

    if (numPaginas === 1) {
        await addHTML(paginaAtual)
        progressBar.update(100);
    } else {
        for (let i = 0; i < intevalos; i++) {
            for (let j = 1; j <= 5; j++) {
                paginaAtual++

                if (i === intevalos - 1 && doidice && intevalos > 1) {
                    if (elementosUltimoIntervalo !== 0) {
                        clicarBotaoPag(6 - elementosUltimoIntervalo)
                        doidice = false
                        paginaAtual--
                    }
                } else if (paginaAtual <= numPaginas) {
                    progressBar.update((((paginaAtual) / numPaginas) * 100));
                    await addHTML(paginaAtual)

                    if (paginaAtual < numPaginas) {
                        if (j < 5) {
                            clicarBotaoPag(j + 1)
                        } else if (j === 5) {
                            clicarProxIntervalo()
                        }
                    }
                }
                await page.waitForTimeout(delay * 5);
            }
        }
    }

    progressBar.stop();

    // Gravar o texto concatenado em um arquivo .txt
    fs.writeFileSync('internal_table.txt', textoConcatenado);

    // Feche o navegador
    await browser.close();
}

export default pesquisaProdutos