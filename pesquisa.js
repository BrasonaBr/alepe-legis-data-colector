import * as puppeteer from "puppeteer"
import * as fs from 'fs';
import chalk from "chalk"
import cliProgress from "cli-progress"

process.stdout.write('\x1Bc');

async function realizarPesquisa(delay = 1000, mes = null, ano = null) {

    const dataAtual = new Date();

    // Obtenha o ano atual
    const anoAtual = dataAtual.getFullYear();

    const ultimoMes = dataAtual.getMonth();

    if (mes === null) {
        mes = ultimoMes
    }
    if (ano === null) {
        ano = anoAtual
    }

    const ultimoDia = new Date(ano, mes, 0);

    const dia = ultimoDia.getDate();

    if (mes < 10) {
        mes = `0${mes}`
    }

    // Data que você deseja inserir
    const dataDesejadaInicio = `01/${mes}/${ano}`; // Substitua pela data que você deseja

    console.log(chalk.blue("Data inicial:", dataDesejadaInicio))

    // Data que você deseja inserir
    const dataDesejadaFim = `${dia}/${mes}/${ano}`; // Substitua pela data que você deseja

    console.log(chalk.blue("Data final:", dataDesejadaFim))

    const browser = await puppeteer.launch({
        headless: 'new', //false// Definindo explicitamente o novo modo Headless
    });

    const page = await browser.newPage();

    const progressBar = new cliProgress.SingleBar({
        format: chalk.bold.cyan('{bar} {percentage}% ') + chalk.bold.green('| Tempo estimado: {eta}s'),
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });

    console.log(chalk.green.bold("Coletando tabela"))
    progressBar.start(100, 0);

    let etapa = 0
    const total = 35

    // URL da página de pesquisa
    const url = 'https://legis.alepe.pe.gov.br/pesquisaAvancada.aspx';

    await page.goto(url);

    etapa = 1
    progressBar.update((((etapa) / total) * 100));

    // Seletor da caixa de texto de pesquisa
    const caixaPesquisaSelector = 'insira_seletor_aqui';

    const linkSelector = 'li#li-publicacao a.li-pa';

    // Clicar no link
    await page.click(linkSelector);


    // Aguarde alguns segundos para garantir que os resultados sejam carregados
    await page.waitForTimeout();

    etapa = 2
    progressBar.update((((etapa) / total) * 100));

    const caixaDataSelectorInicio = 'input#tbxDataInicialPublicacao';

    const caixaDataSelectorFim = 'input#tbxDataFinalPublicacao';

    const menuSuspensoSelector = 'select#ddlPublicacao';

    // Selecionar a segunda opção do menu suspenso (índice 1)
    await page.select(menuSuspensoSelector, 'DOE - Poder Executivo');
    await page.waitForTimeout(delay / 2);

    etapa = 3
    progressBar.update((((etapa) / total) * 100));

    // Preencher a caixa de texto da data
    await page.type(caixaDataSelectorInicio, dataDesejadaInicio);
    await page.waitForTimeout(delay / 2);
    etapa = 4
    progressBar.update((((etapa) / total) * 100));
    await page.type(caixaDataSelectorFim, dataDesejadaFim);
    await page.waitForTimeout(delay / 2);
    etapa = 5
    progressBar.update((((etapa) / total) * 100));

    const botaoPesquisarSelector = 'input#btnPesquisar';

    // Clicar no botão de pesquisa
    await page.click(botaoPesquisarSelector);

    // Aguarde alguns segundos para garantir que a ação seja concluída
    await page.waitForTimeout(delay * 5);
    etapa = 15
    progressBar.update((((etapa) / total) * 100));

    const itensPaginaSelector = 'select#ddlTamPagina'

    // Selecionar a segunda opção do menu suspenso (índice 1)
    await page.select(itensPaginaSelector, '200');

    // Obter o texto do elemento <p>
    const quantidadeResultadosSelector = 'p span #lblQtd';
    const quantidadeResultados = await page.evaluate((selector) => {
        const elemento = document.querySelector(selector);
        return elemento.innerText;
    }, quantidadeResultadosSelector);

    //console.log(chalk.blue(`Quantidade de resultados:${quantidadeResultados}`));

    await page.waitForTimeout(delay * 5);
    etapa = 25
    progressBar.update((((etapa) / total) * 100));

    // Obter o código HTML da tabela na primeira página
    const tabelaHtmlPrimeiraPagina = await page.evaluate(() => {
        const tabelaSelector = 'table.table.table-hover.table-responsive';
        const tabela = document.querySelector(tabelaSelector);
        return tabela.outerHTML;
    });

    //console.log(chalk.green("Tabela na primeira página carregada"));

    let textoConcatenado

    if (parseInt(quantidadeResultados, 10) > 200) {

        // Clicar no link para ir para a segunda página
        const linkSegundaPaginaSelector = 'a#lbtn2';
        await page.click(linkSegundaPaginaSelector);

        // Aguarde alguns segundos para garantir que a ação seja concluída
        await page.waitForTimeout(delay * 5);
        etapa = 35
        progressBar.update((((etapa) / total) * 100));

        // Obter o código HTML da tabela na segunda página
        const tabelaHtmlSegundaPagina = await page.evaluate(() => {
            const tabelaSelector = 'table.table.table-hover.table-responsive';
            const tabela = document.querySelector(tabelaSelector);
            return tabela.outerHTML;
        });

        textoConcatenado = tabelaHtmlPrimeiraPagina + '\n' + tabelaHtmlSegundaPagina;
    } else {
        etapa = 35
        progressBar.update((((etapa) / total) * 100));
        textoConcatenado = tabelaHtmlPrimeiraPagina
    }

    // Gravar o texto concatenado em um arquivo .txt
    fs.writeFileSync('tabela.txt', textoConcatenado);

    // Feche o navegador
    progressBar.stop();
    await browser.close();
}

//realizarPesquisa();

export default realizarPesquisa