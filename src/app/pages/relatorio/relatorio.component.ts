import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormControl, UntypedFormGroup, ReactiveFormsModule } from '@angular/forms';
import { EstatisticasService } from 'src/app/core/services/estatisticas.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';

interface ProdutoVendido {
  produto_id: string;
  nome: string;
  quantidade_total: number;
  valor_total: number;
  unidade_medida: string;
}

interface ClienteInfo {
  nome: string;
  quantidade_compras: number;
  valor_total: number;
}

interface ResumoVendas {
  total_vendas: number;
  valor_total: number;
  lucro_total: number;
  media_por_venda: number;
  produtos_mais_vendidos: ProdutoVendido[];
  produtos_mais_lucrativos: (ProdutoVendido & { lucro_total: number })[];
  vendas_por_dia: { data: string, valor: number, quantidade: number }[];
  clientes_mais_frequentes: ClienteInfo[];
  analise_mensal: { mes: string, valor: number, quantidade: number }[];
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-relatorio',
  templateUrl: './relatorio.component.html',
  styleUrls: ['./relatorio.component.css']
})
export class RelatorioComponent implements OnInit {
  
  form!: UntypedFormGroup;
  resumo: ResumoVendas = {
    total_vendas: 0,
    valor_total: 0,
    lucro_total: 0,
    media_por_venda: 0,
    produtos_mais_vendidos: [],
    produtos_mais_lucrativos: [],
    vendas_por_dia: [],
    clientes_mais_frequentes: [],
    analise_mensal: []
  };
  
  dataHoje = new Date();
  visualizacaoAtual: 'tabela' | 'grafico' = 'tabela';
  
  constructor(
    private estatisticasService: EstatisticasService,
    private loaderService: LoaderService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.form = new UntypedFormGroup({
      mesInicial: new UntypedFormControl(this.formatarMes(this.dataHoje)),
      mesFinal: new UntypedFormControl(this.formatarMes(this.dataHoje)),
    });

    this.gerarRelatorio();
  }

  // Alterna entre visualização de tabela e gráfico
  alternarVisualizacao() {
    this.visualizacaoAtual = this.visualizacaoAtual === 'tabela' ? 'grafico' : 'tabela';
  }

  // Formata a data para o formato yyyy-MM para usar nos inputs month do HTML
  formatarMes(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}`;
  }

  // Gera o relatório com base nos meses selecionados
  async gerarRelatorio() {
    if (!this.form.valid) {
      this.messageService.info('Selecione um período válido');
      return;
    }
    
    this.loaderService.showLoading();
    
    try {
      // Pegar os valores no formato YYYY-MM
      const mesInicial = this.form.get('mesInicial')?.value; // YYYY-MM
      const mesFinal = this.form.get('mesFinal')?.value; // YYYY-MM
      
      // Converter para Date (primeiro dia do mês) - usando horário local para evitar problemas de fuso horário
      const [anoInicial, mesInicialNum] = mesInicial.split('-');
      const [anoFinal, mesFinalNum] = mesFinal.split('-');
      const dataInicial = new Date(parseInt(anoInicial), parseInt(mesInicialNum) - 1, 1);
      const dataFinal = new Date(parseInt(anoFinal), parseInt(mesFinalNum) - 1, 1);
      
      // Usar sempre estatísticas mensais para relatórios
      const estatisticas = await this.estatisticasService.buscarEstatisticasMeses(dataInicial, dataFinal);
      
      // Mapear para o formato esperado pelo componente (limitar a 5 produtos)
      this.resumo = {
        total_vendas: estatisticas.total_vendas,
        valor_total: estatisticas.valor_total,
        lucro_total: estatisticas.lucro_total,
        media_por_venda: estatisticas.total_vendas > 0 ? estatisticas.valor_total / estatisticas.total_vendas : 0,
        produtos_mais_vendidos: estatisticas.produtos_mais_vendidos.slice(0, 5).map((p: any) => ({
          produto_id: p.produto_id,
          nome: p.nome,
          quantidade_total: p.quantidade || p.quantidade_total,
          valor_total: p.valor_total,
          unidade_medida: p.unidade_medida || ''
        })),
        produtos_mais_lucrativos: estatisticas.produtos_mais_lucrativos.slice(0, 5).map((p: any) => ({
          produto_id: p.produto_id,
          nome: p.nome,
          quantidade_total: p.quantidade || p.quantidade_total,
          valor_total: p.valor_total,
          lucro_total: p.lucro_total,
          unidade_medida: p.unidade_medida || ''
        })),
        vendas_por_dia: estatisticas.vendas_por_dia.map((v: any) => ({
          data: v.data,
          valor: v.valor_total,
          quantidade: v.total_vendas
        })),
        clientes_mais_frequentes: estatisticas.clientes_mais_frequentes.map((c: any) => ({
          nome: c.nome,
          quantidade_compras: c.quantidade_compras,
          valor_total: c.valor_total
        })),
        analise_mensal: this.gerarAnaliseMensal(estatisticas.vendas_por_dia)
      };
      
      this.loaderService.closeLoading();
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      this.messageService.error('Erro ao buscar dados do relatório');
      this.loaderService.closeLoading();
    }
  }
  
  // Calcula diferença em meses entre duas datas
  calcularDiferencaMeses(dataInicial: Date, dataFinal: Date): number {
    const meses = (dataFinal.getFullYear() - dataInicial.getFullYear()) * 12;
    return meses - dataInicial.getMonth() + dataFinal.getMonth();
  }
  
  // Agrupa as vendas por dia em análise mensal
  gerarAnaliseMensal(vendasPorDia: any[]): { mes: string, valor: number, quantidade: number }[] {
    const analiseMensalMap = new Map<string, { valor: number, quantidade: number }>();
    
    vendasPorDia.forEach(venda => {
      const [ano, mes] = venda.data.split('-');
      const mesAno = `${ano}-${mes}`;
      
      if (analiseMensalMap.has(mesAno)) {
        const dadosAnteriores = analiseMensalMap.get(mesAno)!;
        analiseMensalMap.set(mesAno, {
          valor: dadosAnteriores.valor + venda.valor_total,
          quantidade: dadosAnteriores.quantidade + venda.total_vendas
        });
      } else {
        analiseMensalMap.set(mesAno, {
          valor: venda.valor_total,
          quantidade: venda.total_vendas
        });
      }
    });
    
    // Converter para array e formatar os meses
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    return Array.from(analiseMensalMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mesAno, dados]) => {
        const [ano, mes] = mesAno.split('-');
        return {
          mes: `${meses[parseInt(mes) - 1]}/${ano}`,
          valor: dados.valor,
          quantidade: dados.quantidade
        };
      });
  }

  // Exporta os dados do relatório para um arquivo CSV
  exportarParaCSV(): void {
    // Criar dados do CSV
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Cabeçalho - Resumo
    csvContent += 'Relatório de Vendas\n';
    csvContent += `Período: ${this.formatarMesParaExibicao(this.form.get('mesInicial')?.value)} a ${this.formatarMesParaExibicao(this.form.get('mesFinal')?.value)}\n\n`;
    csvContent += `Total de Vendas,${this.resumo.total_vendas}\n`;
    csvContent += `Valor Total,${this.resumo.valor_total}\n`;
    csvContent += `Média por Venda,${this.resumo.media_por_venda}\n\n`;
    
    // Produtos Mais Vendidos
    csvContent += 'PRODUTOS MAIS VENDIDOS\n';
    csvContent += 'Produto,Quantidade,Unidade,Valor Total,Percentual\n';
    this.resumo.produtos_mais_vendidos.forEach(produto => {
      const percentual = this.calcularPercentual(produto.valor_total);
      csvContent += `${produto.nome},${produto.quantidade_total},${produto.unidade_medida},${produto.valor_total},${percentual.toFixed(1)}%\n`;
    });
    csvContent += '\n';
    
    // Vendas por Dia
    csvContent += 'VENDAS POR DIA\n';
    csvContent += 'Data,Valor Total,Quantidade\n';
    this.resumo.vendas_por_dia.forEach(venda => {
      csvContent += `${this.formatarDataParaExibicao(venda.data)},${venda.valor},${venda.quantidade}\n`;
    });
    csvContent += `Total,${this.resumo.valor_total},${this.resumo.total_vendas}\n\n`;
    
    // Codificar e criar link para download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dataAtual = new Date().toISOString().split('T')[0].replace(/-/g, '_');
    link.setAttribute('download', `relatorio_vendas_${dataAtual}.csv`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
    this.messageService.success('Relatório exportado com sucesso!');
  }
  
  // Exporta os dados do relatório para impressão (abre uma nova janela)
  imprimirRelatorio(): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.messageService.error('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está ativado.');
      return;
    }
    
    // Construir o conteúdo HTML para impressão
    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Vendas</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2 { color: #2553EB; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f2f2f2; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Relatório de Vendas</h1>
        <p>Período: ${this.formatarMesParaExibicao(this.form.get('mesInicial')?.value)} a ${this.formatarMesParaExibicao(this.form.get('mesFinal')?.value)}</p>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div style="border: 1px solid #ddd; padding: 10px; width: 30%;">
            <h3>Total de Vendas</h3>
            <p style="font-size: 24px; font-weight: bold;">${this.resumo.total_vendas}</p>
          </div>
          <div style="border: 1px solid #ddd; padding: 10px; width: 30%;">
            <h3>Valor Total</h3>
            <p style="font-size: 24px; font-weight: bold;">${this.formatarMoeda(this.resumo.valor_total)}</p>
          </div>
          <div style="border: 1px solid #ddd; padding: 10px; width: 30%;">
            <h3>Média por Venda</h3>
            <p style="font-size: 24px; font-weight: bold;">${this.formatarMoeda(this.resumo.media_por_venda)}</p>
          </div>
        </div>
        
        <h2>Produtos Mais Vendidos</h2>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Quantidade</th>
              <th>Unidade</th>
              <th class="text-right">Valor Total</th>
              <th class="text-right">% do Total</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    this.resumo.produtos_mais_vendidos.forEach(produto => {
      printContent += `
        <tr>
          <td>${produto.nome}</td>
          <td>${produto.quantidade_total}</td>
          <td>${produto.unidade_medida}</td>
          <td class="text-right">${this.formatarMoeda(produto.valor_total)}</td>
          <td class="text-right">${this.calcularPercentual(produto.valor_total).toFixed(1)}%</td>
        </tr>
      `;
    });
    
    printContent += `
          </tbody>
        </table>
        
        <h2>Vendas por Dia</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th class="text-right">Quantidade</th>
              <th class="text-right">Valor Total</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    this.resumo.vendas_por_dia.forEach(venda => {
      printContent += `
        <tr>
          <td>${this.formatarDataParaExibicao(venda.data)}</td>
          <td class="text-right">${venda.quantidade}</td>
          <td class="text-right">${this.formatarMoeda(venda.valor)}</td>
        </tr>
      `;
    });
    
    printContent += `
          <tr class="total-row">
            <td>Total Geral</td>
            <td class="text-right">${this.resumo.total_vendas}</td>
            <td class="text-right">${this.formatarMoeda(this.resumo.valor_total)}</td>
          </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Aguardar o carregamento do conteúdo antes de imprimir
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  // Formatar a data para exibição
  formatarDataParaExibicao(dataString: string): string {
    if (dataString.includes('-')) {
      const [ano, mes, dia] = dataString.split('-');
      return `${dia}/${mes}/${ano}`;
    }
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  }

  // Formatar o mês para exibição
  formatarMesParaExibicao(mesString: string): string {
    const [ano, mes] = mesString.split('-');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[parseInt(mes) - 1]} de ${ano}`;
  }

  // Formatar o valor monetário para exibição
  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Calcula o percentual do produto em relação ao total
  calcularPercentual(valorProduto: number): number {
    if (this.resumo.valor_total === 0) return 0;
    return (valorProduto / this.resumo.valor_total) * 100;
  }

  // Calcula o percentual de lucro em relação ao lucro total
  calcularPercentualLucro(lucro: number): number {
    if (!this.resumo || !this.resumo.lucro_total || this.resumo.lucro_total === 0) {
      return 0;
    }
    return (lucro / this.resumo.lucro_total) * 100;
  }
}