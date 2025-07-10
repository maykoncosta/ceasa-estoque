import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { Venda } from 'src/app/core/services/venda.service';

@Injectable({
    providedIn: 'root'
})
export class PrintService {

    constructor() { }  /**
   * Gera um PDF de cupom não fiscal da venda com formatação de tabela manual
   * @param venda Dados da venda para impressão
   */
    gerarCupomVenda(venda: Venda): void {
        try {
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
            const pdf = new jsPDF({
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
            adicionarLinha('CEASA ESTOQUE', 'center', 12);
            pdf.setLineWidth(0.3);
            pdf.setLineWidth(0.3);
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
            alturaAtual += 2;      // --- CABEÇALHO DA TABELA ---
            pdf.setFont('courier', 'bold');
            pdf.setFontSize(8);
            adicionarLinha('PRODUTO           QTD UN  PREÇO  TOTAL', 'left', 8);

            // Linha sob o cabeçalho
            pdf.setLineWidth(0.2);
            pdf.line(margem, alturaAtual + 1, larguraCupom - margem, alturaAtual + 1);
            alturaAtual += 2;

            // --- PRODUTOS ---
            pdf.setFont('courier', 'normal');

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

            // --- SALVAR O PDF ---
            const clienteNormalizado = venda.cliente.replace(/[^a-zA-Z0-9]/g, '_');
            const dataArquivo = agora.toISOString().split('T')[0];
            const nomeArquivo = `cupom_${clienteNormalizado}_${dataArquivo}_${cupomId}.pdf`;

            pdf.save(nomeArquivo);

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            throw new Error('Erro ao gerar o cupom. Verifique os dados e tente novamente.');
        }
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
