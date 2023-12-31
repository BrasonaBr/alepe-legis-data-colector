import * as fs from "fs"
import chalk from "chalk"

// Função para buscar texto em um arquivo
function searchInFile(filePath, callback) {
    const searchText = '<span class="nome-norma"><a href="texto.aspx?id=';
    // Lê o conteúdo do arquivo de forma assíncrona
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error(chalk.red('Erro ao ler o arquivo:', err));
            return;
        }

        // Divide o conteúdo do arquivo em linhas
        const lines = data.split('\n');

        // Array para armazenar as ocorrências encontradas
        const occurrences = [];

        // Itera sobre cada linha para verificar a presença do texto
        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            const line = lines[lineNumber];
            const index = line.indexOf(searchText);

            if (index !== -1) {
                // Verifica se há um próximo caractere
                const nextChar = line[index + searchText.length];

                // Extrai o número completo
                const numberRegex = /\d+/; // Expressão regular para extrair números
                const match = line.substring(index + searchText.length).match(numberRegex);

                // Adiciona a ocorrência ao array
                if (match) {
                    const dateLine = lines[lineNumber + 1]; // Obtém a linha seguinte como a linha de data

                    // Busca pela primeira "/" na linha da data
                    const firstSlashIndex = dateLine.indexOf('/');
                    const datePart = firstSlashIndex !== -1 ? dateLine.substring(firstSlashIndex + 1).match(numberRegex) : dateLine;

                    occurrences.push({
                        lineNumber: lineNumber + 1, // Adiciona 1 porque os números de linha começam do 1
                        content: line.trim(),
                        nextNumber: parseInt(match[0]), // Converte o número para inteiro
                        date: datePart, // Adiciona a parte antes da primeira "/" à ocorrência
                    });
                }
            }
        }

        // Verifica se foram encontradas ocorrências
        if (occurrences.length > 0) {
            occurrences.sort(function (a, b) {
                return b.nextNumber - a.nextNumber;
            });

            // Encontra o maior e o menor número
            const numbers = occurrences.map((occurrence) => occurrence.nextNumber);
            const maxNumber = Math.max(...numbers);
            const minNumber = Math.min(...numbers);

            callback(occurrences);
        } else {
            console.log(chalk.red(`Texto não encontrado em ${filePath}`));
        }
    });
}

export default searchInFile