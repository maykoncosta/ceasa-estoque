import { Injectable } from '@angular/core';
import * as jsPDF from 'jspdf';
import { Venda } from 'src/app/core/services/venda.service';
import { Produto } from 'src/app/core/services/produto.service';

@Injectable({
    providedIn: 'root'
})
export class PrintService {

    constructor() { }

    /**
     * Gera um PDF de cupom não fiscal da venda para download
     * @param venda Dados da venda para impressão
     */
    gerarCupomVenda(venda: Venda): void {
        try {
            const { pdf, cupomId } = this.criarPdfCupom(venda);

            // --- SALVAR O PDF ---
            const agora = new Date();
            const clienteNormalizado = venda.cliente.replace(/[^a-zA-Z0-9]/g, '_');
            const dataArquivo = agora.toISOString().split('T')[0];
            const nomeArquivo = `cupom_${clienteNormalizado}_${dataArquivo}_${cupomId}.pdf`;

            pdf.save(nomeArquivo);

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            throw new Error('Erro ao gerar o cupom. Verifique os dados e tente novamente.');
        }
    }    /**
     * Imprime o cupom diretamente (abre a tela de impressão do navegador)
     * @param venda Dados da venda para impressão
     */
    imprimirCupomDireto(venda: Venda): void {
        try {
            const { pdf } = this.criarPdfCupom(venda);

            // --- ABRIR PARA IMPRESSÃO ---
            // Gerar o PDF como Data URL
            const pdfDataUri = pdf.output('datauristring');
            
            // Criar uma nova janela/aba com o PDF
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Cupom - ${venda.cliente}</title>
                      <style>
                        body { margin: 0; padding: 0; }
                        iframe { width: 100%; height: 100vh; border: none; }
                      </style>
                    </head>
                    <body>
                      <iframe src="${pdfDataUri}"></iframe>
                    </body>
                  </html>
                `);
                printWindow.document.close();
                
                // Aguardar o carregamento e abrir a tela de impressão
                setTimeout(() => {
                  printWindow.focus();
                  printWindow.print();
                }, 1000);
            } else {
                // Fallback: se não conseguir abrir nova janela, gerar PDF para download
                throw new Error('Não foi possível abrir a janela de impressão. Bloqueador de pop-ups pode estar ativo.');
            }

        } catch (error) {
            console.error('Erro ao imprimir cupom:', error);
            throw new Error('Erro ao abrir a tela de impressão. Verifique se o bloqueador de pop-ups está desabilitado.');
        }
    }

    /**
     * Gera um PDF da lista de produtos para download
     * @param produtos Lista de produtos para impressão
     */
    gerarPdfListaProdutos(produtos: Produto[]): void {
        if (produtos.length === 0) {
            throw new Error('Não há produtos para gerar PDF');
        }

        try {
            const { pdf } = this.criarPdfListaProdutos(produtos);

            // --- SALVAR O PDF ---
            const agora = new Date();
            const dataArquivo = agora.toISOString().split('T')[0];
            const nomeArquivo = `lista_produtos_${dataArquivo}.pdf`;

            pdf.save(nomeArquivo);

        } catch (error) {
            console.error('Erro ao gerar PDF da lista de produtos:', error);
            throw new Error('Erro ao gerar o PDF. Verifique os dados e tente novamente.');
        }
    }

    /**
     * Imprime lista de produtos com nome e estoque
     * @param produtos Lista de produtos para impressão
     */
    imprimirListaProdutos(produtos: Produto[]): void {
        if (produtos.length === 0) {
            throw new Error('Não há produtos para imprimir');
        }

        try {
            const { pdf } = this.criarPdfListaProdutos(produtos);

            // --- ABRIR PARA IMPRESSÃO ---
            // Gerar o PDF como Data URL
            const pdfDataUri = pdf.output('datauristring');
            
            // Criar uma nova janela/aba com o PDF
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Lista de Produtos - CEASA Estoque</title>
                      <style>
                        body { margin: 0; padding: 0; }
                        iframe { width: 100%; height: 100vh; border: none; }
                      </style>
                    </head>
                    <body>
                      <iframe src="${pdfDataUri}"></iframe>
                    </body>
                  </html>
                `);
                printWindow.document.close();
                
                // Aguardar o carregamento e abrir a tela de impressão
                setTimeout(() => {
                  printWindow.focus();
                  printWindow.print();
                }, 1000);
            } else {
                // Fallback: se não conseguir abrir nova janela, gerar PDF para download
                throw new Error('Não foi possível abrir a janela de impressão. Bloqueador de pop-ups pode estar ativo.');
            }

        } catch (error) {
            console.error('Erro ao imprimir lista de produtos:', error);
            throw new Error('Erro ao abrir a tela de impressão. Verifique se o bloqueador de pop-ups está desabilitado.');
        }
    }

    /**
     * Método privado para criar o PDF da lista de produtos
     * @param produtos Lista de produtos para impressão
     * @returns Objeto contendo o PDF gerado
     */
    private criarPdfListaProdutos(produtos: Produto[]): { pdf: jsPDF.jsPDF } {
        // --- CONFIGURAÇÕES DO PDF ---
        const larguraCupom = 80; // Largura do cupom em mm
        const margem = 5;
        let alturaAtual = 0;

        // Calcular altura necessária dinamicamente
        const alturaLinha = 4;
        const linhasCabecalho = 8;
        const linhasProdutos = produtos.length; // 1 linha por produto
        const linhasRodape = 6;
        const alturaTotal = (linhasCabecalho + linhasProdutos + linhasRodape) * alturaLinha;

        // Criar PDF com tamanho customizado
        const pdf = new jsPDF.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [larguraCupom, Math.max(alturaTotal, 150)] // Altura mínima de 150mm
        });

        // Função auxiliar para adicionar linha e controlar posição
        const adicionarLinha = (texto: string, align: 'left' | 'center' | 'right' = 'left', fontSize: number = 8) => {
            alturaAtual += alturaLinha;
            pdf.setFontSize(fontSize);
            let x = margem;

            if (align === 'center') {
                const textWidth = pdf.getTextWidth(texto);
                x = (larguraCupom - textWidth) / 2;
            } else if (align === 'right') {
                const textWidth = pdf.getTextWidth(texto);
                x = larguraCupom - margem - textWidth;
            }

            pdf.text(texto, x, alturaAtual);
        };

        // --- CABEÇALHO ---
        pdf.setFont('helvetica', 'bold');
        adicionarLinha('R e K FRUTAS', 'center', 12);
        pdf.setFont('helvetica', 'normal');
        adicionarLinha('LISTA DE PRODUTOS', 'center', 10);

        // Data e hora da impressão
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        const horaAtual = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        adicionarLinha(`${dataAtual} - ${horaAtual}`, 'center', 8);

        // Linha separadora
        alturaAtual += 2;
        pdf.setLineWidth(0.3);
        pdf.line(margem, alturaAtual, larguraCupom - margem, alturaAtual);
        alturaAtual += 2;

        // --- CABEÇALHO DA TABELA ---
        pdf.setFont('courier', 'bold');
        pdf.setFontSize(8);
        adicionarLinha('PRODUTO                    ESTOQUE', 'left', 8);

        // Linha sob o cabeçalho
        pdf.setLineWidth(0.2);
        pdf.line(margem, alturaAtual + 1, larguraCupom - margem, alturaAtual + 1);
        alturaAtual += 2;

        // --- PRODUTOS ---
        pdf.setFont('courier', 'bold');

        produtos.forEach((produto) => {
            // Nome do produto (truncado se necessário)
            const nomeProduto = produto.nome.length > 20 ?
                produto.nome.substring(0, 17) + '...' :
                produto.nome.padEnd(20, ' ');

            // Formatação do estoque com alinhamento à direita
            const estoque = produto.estoque.toString().padStart(7, ' ');

            const linhaProduto = `${nomeProduto}${estoque}`;
            adicionarLinha(linhaProduto, 'left', 8);

            // Pequeno espaço entre produtos
            alturaAtual += 0.5;
        });

        // --- RODAPÉ ---
        // Linha separadora
        alturaAtual += 2;
        pdf.setLineWidth(0.3);
        pdf.line(margem, alturaAtual, larguraCupom - margem, alturaAtual);
        alturaAtual += 2;

        pdf.setFont('helvetica', 'normal');
        adicionarLinha(`Total: ${produtos.length} produtos`, 'center', 9);
        
        alturaAtual += 2;
        pdf.setFont('helvetica', 'bold');
        adicionarLinha('Sistema CEASA Estoque', 'center', 8);

        return { pdf };
    }

    /**
     * Método privado para criar o PDF do cupom (reutilizado pelos métodos públicos)
     * @param venda Dados da venda para impressão
     * @returns Objeto contendo o PDF gerado e o ID do cupom
     */
    private criarPdfCupom(venda: Venda): { pdf: jsPDF.jsPDF, cupomId: string } {
        // --- CONFIGURAÇÕES DO PDF ---
        const larguraCupom = 80; // Largura do cupom em mm
        const margem = 5;
        let alturaAtual = 0;

        // Calcular altura necessária dinamicamente
        const alturaLinha = 4;
        const linhasCabecalho = 8;
        const linhasProdutos = venda.produtos.length * 2; // 2 linhas por produto
        const linhasRodape = 8;
        const alturaTotal = (linhasCabecalho + linhasProdutos + linhasRodape) * alturaLinha;

        // Criar PDF com tamanho customizado
        const pdf = new jsPDF.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [larguraCupom, Math.max(alturaTotal, 150)] // Altura mínima de 150mm
        });

        // Função auxiliar para adicionar linha e controlar posição
        const adicionarLinha = (texto: string, align: 'left' | 'center' | 'right' = 'left', fontSize: number = 8) => {
            alturaAtual += alturaLinha;
            pdf.setFontSize(fontSize);
            let x = margem;

            if (align === 'center') {
                const textWidth = pdf.getTextWidth(texto);
                x = (larguraCupom - textWidth) / 2;
            } else if (align === 'right') {
                const textWidth = pdf.getTextWidth(texto);
                x = larguraCupom - margem - textWidth;
            }

            pdf.text(texto, x, alturaAtual);
        };

        // --- CABEÇALHO ---
        pdf.setFont('helvetica', 'bold');
        adicionarLinha('R e K FRUTAS', 'center', 12);
        pdf.setFont('helvetica', 'normal');
        adicionarLinha('CUPOM NÃO FISCAL', 'center', 10);

        // Linha separadora
        alturaAtual += 2;
        pdf.setLineWidth(0.3);
        pdf.line(margem, alturaAtual, larguraCupom - margem, alturaAtual);
        alturaAtual += 2;

        // --- DADOS DA VENDA ---
        const dataFormatada = this.formatarData(venda.data);
        const agora = new Date();
        const horaAtual = agora.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        adicionarLinha(`Cliente: ${venda.cliente}`, 'left', 8);
        adicionarLinha(`Data: ${dataFormatada}    Hora: ${horaAtual}`, 'left', 8);

        // Linha separadora
        alturaAtual += 2;
        pdf.line(margem, alturaAtual, larguraCupom - margem, alturaAtual);
        alturaAtual += 2;

        // --- CABEÇALHO DA TABELA ---
        pdf.setFont('courier', 'bold');
        pdf.setFontSize(8);
        adicionarLinha('PRODUTO           QTD UN  PREÇO  TOTAL', 'left', 8);

        // Linha sob o cabeçalho
        pdf.setLineWidth(0.2);
        pdf.line(margem, alturaAtual + 1, larguraCupom - margem, alturaAtual + 1);
        alturaAtual += 2;

        // --- PRODUTOS ---
        pdf.setFont('courier', 'bold');

        venda.produtos.forEach((produto) => {
            // Nome do produto (truncado se necessário)
            const nomeProduto = produto.nome.length > 18 ?
                produto.nome.substring(0, 15) + '...' :
                produto.nome.padEnd(18, ' ');

            // Formatação dos valores com alinhamento melhorado
            const qtd = produto.quantidade.toString().padStart(3, ' ');
            const unidade = (produto.unidade_medida || 'un').substring(0, 2).padEnd(3, ' ');
            const preco = produto.preco_venda.toFixed(2).padStart(6, ' ');
            const total = (produto.total || produto.quantidade * produto.preco_venda).toFixed(2).padStart(7, ' ');

            const linhaProduto = `${nomeProduto}${qtd} ${unidade}${preco}${total}`;
            adicionarLinha(linhaProduto, 'left', 8);

            // Pequeno espaço entre produtos
            alturaAtual += 0.5;
        });

        // --- TOTAL ---
        // Linha separadora
        alturaAtual += 2;
        pdf.setLineWidth(0.3);
        pdf.line(margem, alturaAtual, larguraCupom - margem, alturaAtual);
        alturaAtual += 2;

        pdf.setFont('helvetica', 'bold');
        const totalTexto = `TOTAL: R$ ${venda.valor_total.toFixed(2)}`;
        adicionarLinha(totalTexto, 'center', 12);

        // --- RODAPÉ ---
        alturaAtual += 3;
        pdf.line(margem, alturaAtual, larguraCupom - margem, alturaAtual);
        alturaAtual += 2;

        pdf.setFont('helvetica', 'normal');
        const cupomId = agora.getTime().toString().slice(-8);
        adicionarLinha(`Cupom: #${cupomId}`, 'left', 8);

        const dataHoraImpressao = agora.toLocaleString('pt-BR');
        adicionarLinha(`Impresso: ${dataHoraImpressao}`, 'left', 7);

        alturaAtual += 2;
        pdf.setFont('helvetica', 'bold');
        adicionarLinha('Obrigado pela preferência!', 'center', 9);
        adicionarLinha('Volte sempre!', 'center', 8);

        return { pdf, cupomId };
    }

    /**
     * Formatar data para exibição
     */
    private formatarData(data: any): string {
        if (!data) return 'Data não informada';

        try {
            const dataObj = data.toDate ? data.toDate() : new Date(data);
            return dataObj.toLocaleDateString('pt-BR');
        } catch (error) {
            return 'Data inválida';
        }
    }
}
