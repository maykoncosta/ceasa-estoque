import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { VendaService, Venda } from 'src/app/core/services/venda.service';
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
  media_por_venda: number;
  produtos_mais_vendidos: ProdutoVendido[];
  vendas_por_dia: { data: string, valor: number, quantidade: number }[];
  clientes_mais_frequentes: ClienteInfo[];
  analise_mensal: { mes: string, valor: number, quantidade: number }[];
}

@Component({
  selector: 'app-relatorio',
  templateUrl: './relatorio.component.html',
  styleUrls: ['./relatorio.component.css']
})
export class RelatorioComponent implements OnInit {
  
  form!: UntypedFormGroup;
  vendas: Venda[] = [];
  resumo: ResumoVendas = {
    total_vendas: 0,
    valor_total: 0,
    media_por_venda: 0,
    produtos_mais_vendidos: [],
    vendas_por_dia: [],
    clientes_mais_frequentes: [],
    analise_mensal: []
  };
  
  dataHoje = new Date();
  dataInicioMes = new Date(this.dataHoje.getFullYear(), this.dataHoje.getMonth(), 1);
  visualizacaoAtual: 'tabela' | 'grafico' = 'tabela';
  
  opcoesPeriodo: { label: string, dias: number }[] = [
    { label: 'Hoje', dias: 0 },
    { label: 'Últimos 7 dias', dias: 7 },
    { label: 'Últimos 30 dias', dias: 30 },
    { label: 'Este mês', dias: -1 } // Valor especial
  ];
  
  constructor(
    private vendaService: VendaService,
    private loaderService: LoaderService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.form = new UntypedFormGroup({
      dataInicial: new UntypedFormControl(this.formatarData(this.dataInicioMes)),
      dataFinal: new UntypedFormControl(this.formatarData(this.dataHoje)),
    });

    this.gerarRelatorio();
  }

  // Aplica um filtro rápido pré-definido
  aplicarFiltroPeriodo(dias: number): void {
    const hoje = new Date();
    let dataInicial: Date;
    
    if (dias === -1) {
      // Caso especial: início do mês atual
      dataInicial = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    } else {
      // Outros casos: hoje menos a quantidade de dias
      dataInicial = new Date(hoje);
      dataInicial.setDate(hoje.getDate() - dias);
    }
    
    this.form.patchValue({
      dataInicial: this.formatarData(dataInicial),
      dataFinal: this.formatarData(hoje)
    });
    
    this.gerarRelatorio();
  }

  // Alterna entre visualização de tabela e gráfico
  alternarVisualizacao() {
    this.visualizacaoAtual = this.visualizacaoAtual === 'tabela' ? 'grafico' : 'tabela';
  }

  // Formata a data para o formato yyyy-MM-dd para usar nos inputs date do HTML
  formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  // Converte a string de data do Firebase para um objeto Date
  parsearData(dataString: string): Date {
    // Verificar se a data é uma string no formato ISO
    if (typeof dataString === 'string' && dataString.includes('T')) {
      return new Date(dataString);
    }
    // Verificar se é apenas uma data (yyyy-MM-dd)
    if (typeof dataString === 'string' && dataString.includes('-')) {
      const [ano, mes, dia] = dataString.split('-').map(Number);
      return new Date(ano, mes - 1, dia);
    }
    // Caso seja outro formato, retorna a string convertida
    return new Date(dataString);
  }

  // Filtra as vendas pelo período selecionado
  filtrarVendasPorPeriodo(): Venda[] {
    const dataInicial = new Date(this.form.get('dataInicial')?.value);
    const dataFinal = new Date(this.form.get('dataFinal')?.value);
    
    // Configurar o final do dia para a data final
    dataFinal.setHours(23, 59, 59, 999);
    
    return this.vendas.filter(venda => {
      const dataVenda = this.parsearData(venda.data);
      return dataVenda >= dataInicial && dataVenda <= dataFinal;
    });
  }

  // Gera as estatísticas com base nas vendas do período
  gerarEstatisticas(vendasFiltradas: Venda[]): ResumoVendas {
    // Calcula total de vendas e valor total
    const totalVendas = vendasFiltradas.length;
    const valorTotal = vendasFiltradas.reduce((sum, venda) => sum + venda.valor_total, 0);
    const mediaPorVenda = totalVendas > 0 ? valorTotal / totalVendas : 0;
    
    // Calcula produtos mais vendidos
    const produtosMap = new Map<string, ProdutoVendido>();
    
    vendasFiltradas.forEach(venda => {
      venda.produtos.forEach(produto => {
        if (produtosMap.has(produto.produto_id)) {
          const produtoExistente = produtosMap.get(produto.produto_id)!;
          produtoExistente.quantidade_total += produto.quantidade;
          produtoExistente.valor_total += produto.total;
        } else {
          produtosMap.set(produto.produto_id, {
            produto_id: produto.produto_id,
            nome: produto.nome,
            quantidade_total: produto.quantidade,
            valor_total: produto.total,
            unidade_medida: produto.unidade_medida || ''
          });
        }
      });
    });
    
    // Converte o Map para array e ordena por quantidade total decrescente
    const produtosMaisVendidos = Array.from(produtosMap.values())
      .sort((a, b) => b.quantidade_total - a.quantidade_total);
    
    // Calcula vendas por dia
    const vendasPorDiaMap = new Map<string, { valor: number, quantidade: number }>();
    
    vendasFiltradas.forEach(venda => {
      const dataVenda = this.parsearData(venda.data);
      const dataFormatada = this.formatarData(dataVenda);
      
      if (vendasPorDiaMap.has(dataFormatada)) {
        const dadosAnteriores = vendasPorDiaMap.get(dataFormatada)!;
        vendasPorDiaMap.set(dataFormatada, {
          valor: dadosAnteriores.valor + venda.valor_total,
          quantidade: dadosAnteriores.quantidade + 1
        });
      } else {
        vendasPorDiaMap.set(dataFormatada, {
          valor: venda.valor_total,
          quantidade: 1
        });
      }
    });
    
    // Converte o Map para array e ordena por data
    const vendasPorDia = Array.from(vendasPorDiaMap.entries())
      .map(([data, dados]) => ({ data, valor: dados.valor, quantidade: dados.quantidade }))
      .sort((a, b) => a.data.localeCompare(b.data));
      
    // Calcular clientes mais frequentes
    const clientesMap = new Map<string, ClienteInfo>();
    
    vendasFiltradas.forEach(venda => {
      if (!venda.cliente) return; // Ignora vendas sem cliente
      
      if (clientesMap.has(venda.cliente)) {
        const clienteInfo = clientesMap.get(venda.cliente)!;
        clienteInfo.quantidade_compras += 1;
        clienteInfo.valor_total += venda.valor_total;
      } else {
        clientesMap.set(venda.cliente, {
          nome: venda.cliente,
          quantidade_compras: 1,
          valor_total: venda.valor_total
        });
      }
    });
    
    const clientesMaisFrequentes = Array.from(clientesMap.values())
      .sort((a, b) => b.quantidade_compras - a.quantidade_compras);
      
    // Análise mensal (agrupa por mês)
    const analiseMensalMap = new Map<string, { valor: number, quantidade: number }>();
    
    vendasFiltradas.forEach(venda => {
      const dataVenda = this.parsearData(venda.data);
      const mesAno = `${dataVenda.getFullYear()}-${String(dataVenda.getMonth() + 1).padStart(2, '0')}`;
      
      if (analiseMensalMap.has(mesAno)) {
        const dadosAnteriores = analiseMensalMap.get(mesAno)!;
        analiseMensalMap.set(mesAno, {
          valor: dadosAnteriores.valor + venda.valor_total,
          quantidade: dadosAnteriores.quantidade + 1
        });
      } else {
        analiseMensalMap.set(mesAno, {
          valor: venda.valor_total,
          quantidade: 1
        });
      }
    });
    
    const analisesMensal = Array.from(analiseMensalMap.entries())
      .map(([mes, dados]) => ({ mes, valor: dados.valor, quantidade: dados.quantidade }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
    
    return {
      total_vendas: totalVendas,
      valor_total: valorTotal,
      media_por_venda: mediaPorVenda,
      produtos_mais_vendidos: produtosMaisVendidos.slice(0, 10), // Top 10 produtos
      vendas_por_dia: vendasPorDia,
      clientes_mais_frequentes: clientesMaisFrequentes.slice(0, 5), // Top 5 clientes
      analise_mensal: analisesMensal
    };
  }

  gerarRelatorio(): void {
    if (!this.form.valid) {
      this.messageService.info('Selecione um período válido');
      return;
    }
    
    this.loaderService.showLoading();
    
    this.vendaService.listarVendas().subscribe({
      next: (vendas) => {
        this.vendas = vendas;
        const vendasFiltradas = this.filtrarVendasPorPeriodo();
        this.resumo = this.gerarEstatisticas(vendasFiltradas);
        this.loaderService.closeLoading();
      },
      error: (err) => {
        console.error('Erro ao buscar vendas:', err);
        this.messageService.error('Erro ao buscar dados das vendas');
        this.loaderService.closeLoading();
      }
    });
  }

  // Exporta os dados do relatório para um arquivo CSV
  exportarParaCSV(): void {
    // Criar dados do CSV
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Cabeçalho - Resumo
    csvContent += 'Relatório de Vendas\n';
    csvContent += `Período: ${this.formatarDataParaExibicao(this.form.get('dataInicial')?.value)} a ${this.formatarDataParaExibicao(this.form.get('dataFinal')?.value)}\n\n`;
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
    link.setAttribute('download', `relatorio_vendas_${this.formatarData(new Date()).replace(/-/g, '_')}.csv`);
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
        <p>Período: ${this.formatarDataParaExibicao(this.form.get('dataInicial')?.value)} a ${this.formatarDataParaExibicao(this.form.get('dataFinal')?.value)}</p>
        
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
    const data = this.parsearData(dataString);
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
  
//   // Exportar dados para CSV
//   exportarCSV(tipo: 'produtos' | 'vendas'): void {
//     let csvContent = '';
//     let filename = '';
    
//     const dataInicial = this.formatarDataParaExibicao(this.form.get('dataInicial')?.value);
//     const dataFinal = this.formatarDataParaExibicao(this.form.get('dataFinal')?.value);
    
//     if (tipo === 'produtos') {
//       // Cabeçalho do CSV para produtos
//       csvContent = 'Produto,Quantidade,Unidade,Valor Total,Percentual\n';
      
//       // Dados dos produtos
//       this.resumo.produtos_mais_vendidos.forEach(p => {
//         csvContent += `"${p.nome}",${p.quantidade_total},"${p.unidade_medida}",${p.valor_total.toFixed(2)},${this.calcularPercentual(p.valor_total).toFixed(2)}\n`;
//       });
      
//       filename = `produtos-mais-vendidos_${dataInicial.replace(/\//g, '-')}_a_${dataFinal.replace(/\//g, '-')}.csv`;
//     } else if (tipo === 'vendas') {
//       // Cabeçalho do CSV para vendas
//       csvContent = 'Data,Cliente,Produtos,Valor Total\n';
      
//       // Dados das vendas
//       this.vendasFiltradas.forEach(v => {
//         csvContent += `"${this.formatarDataParaExibicao(v.data)}","${v.cliente}",${v.produtos.length},${v.valor_total.toFixed(2)}\n`;
//       });
      
//       filename = `vendas_${dataInicial.replace(/\//g, '-')}_a_${dataFinal.replace(/\//g, '-')}.csv`;
//     }
    
//     // Criar o blob para download
//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const link = document.createElement('a');
    
//     // Criar link para download
//     const url = URL.createObjectURL(blob);
//     link.setAttribute('href', url);
//     link.setAttribute('download', filename);
//     link.style.visibility = 'hidden';
    
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
    
//     this.messageService.success(`Relatório ${filename} exportado com sucesso!`);
//   }
}
