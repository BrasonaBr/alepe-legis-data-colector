import coletarTabela from "./coletarTabela.js"

const argumentosDoUsuario = process.argv.slice(2);

if (argumentosDoUsuario.length === 1) {
    coletarTabela(parseInt(argumentosDoUsuario[0]))
} else if (argumentosDoUsuario.length === 2) {
    coletarTabela(parseInt(argumentosDoUsuario[0]), parseInt(argumentosDoUsuario[1]))
} else if (argumentosDoUsuario.length === 0) {
    coletarTabela()
}