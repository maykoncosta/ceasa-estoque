import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProdutoService, Produto } from 'src/app/core/services/produto.service';
import { VendaService, Venda } from 'src/app/core/services/venda.service';
import { LoaderService } from 'src/app/shared/services/loader.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  
  vendasHoje: number = 0;
  valorTotalHoje: number = 0;
  produtosBaixoEstoque: Produto[] = [];
  clientesMaisFrequentes: any[] = [];
  produtosMaisVendidos: any[] = [];
  vendasSemanais: Venda[] = [];
  
  // Para o gráfico
  dadosGrafico: any = {
    labels: [],
    datasets: []
  };

  loading = true;
  
  // Disponibilizando o Math para uso no template
  Math = Math;
  
  constructor(
    private router: Router,
    private produtoService: ProdutoService,
    private vendaService: VendaService,
    private loaderService: LoaderService
  ) {}

  ngOnInit(): void {
    this.carregarDados();
  }
  
  carregarDados() {
    this.loaderService.showLoading();
    
    // Obter a data de hoje e data de 7 dias atrás
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setDate(hoje.getDate() - 7);
    
    // Carregar vendas da última semana
    this.vendaService.listarVendas().subscribe({
      next: vendas => {
        // Filtrar vendas da última semana
        const vendasRecentes = vendas.filter(v => {
          const dataVenda = new Date(v.data);
          return dataVenda >= dataInicio && dataVenda <= hoje;
        });
        
        // Armazenar vendas semanais para exibição
        this.vendasSemanais = vendasRecentes.sort((a, b) => 
          new Date(b.data).getTime() - new Date(a.data).getTime()
        );
        
        // Vendas de hoje
        const vendasHoje = vendas.filter(v => {
          const dataVenda = new Date(v.data);
          return dataVenda.toDateString() === hoje.toDateString();
        });
        
        this.vendasHoje = vendasHoje.length;
        this.valorTotalHoje = vendasHoje.reduce((acc, v) => acc + v.valor_total, 0);
        
        // Processar dados para o gráfico
        this.prepararDadosGrafico(vendasRecentes);
        
        // Produtos mais vendidos
        this.calcularProdutosMaisVendidos(vendasRecentes);
        
        // Clientes mais frequentes
        this.calcularClientesMaisFrequentes(vendas);

        // Carregar produtos com estoque baixo
        this.produtoService.listarProdutos().subscribe({
          next: produtos => {
            // Produtos com estoque baixo (exemplo: menos de 10 unidades)
            this.produtosBaixoEstoque = produtos
              .filter(p => p.estoque < 10)
              .sort((a, b) => a.estoque - b.estoque)
              .slice(0, 5);
            
            this.loading = false;
            this.loaderService.closeLoading();
          },
          error: error => {
            console.error('Erro ao carregar produtos:', error);
            this.loading = false;
            this.loaderService.closeLoading();
          }
        });
      },
      error: error => {
        console.error('Erro ao carregar vendas:', error);
        this.loading = false;
        this.loaderService.closeLoading();
      }
    });
  }
  
  prepararDadosGrafico(vendas: Venda[]) {
    // Agrupar vendas por data
    const vendasPorDia = vendas.reduce((acc: any, venda) => {
      const dataStr = this.formatarDataParaBR(new Date(venda.data));
      if (!acc[dataStr]) {
        acc[dataStr] = 0;
      }
      acc[dataStr] += venda.valor_total;
      return acc;
    }, {});
    
    // Últimos 7 dias
    const ultimos7Dias = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i)); // Ajustado para começar com 6 dias atrás e terminar hoje
      return this.formatarDataParaBR(d);
    });
    
    this.dadosGrafico = {
      labels: ultimos7Dias,
      datasets: [
        {
          label: 'Vendas (R$)',
          data: ultimos7Dias.map(dia => vendasPorDia[dia] || 0),
          backgroundColor: '#2553EB',
          borderColor: '#2553EB',
          tension: 0.4
        }
      ]
    };
  }
  
  formatarDataParaBR(data: Date): string {
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  
  calcularProdutosMaisVendidos(vendas: Venda[]) {
    // Map para manter contagem de produtos
    const produtosCount: { [key: string]: { id: string; nome: string; quantidade: number; total: number; unidade_medida?: string } } = {};
    
    vendas.forEach(venda => {
      venda.produtos.forEach(p => {
        if (!produtosCount[p.produto_id]) {
          produtosCount[p.produto_id] = { 
            id: p.produto_id,
            nome: p.nome, 
            quantidade: 0, 
            total: 0,
            unidade_medida: p.unidade_medida 
          };
        }
        produtosCount[p.produto_id].quantidade += p.quantidade;
        produtosCount[p.produto_id].total += p.total;
      });
    });
    
    // Converter para array e ordenar
    this.produtosMaisVendidos = Object.values(produtosCount)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
      
    // Calcular percentuais para o gráfico
    if (this.produtosMaisVendidos.length > 0) {
      const valorMaximo = this.produtosMaisVendidos[0].total;
      this.produtosMaisVendidos.forEach(p => {
        p.percentual = (p.total / valorMaximo) * 100;
      });
    }
  }
  
  calcularClientesMaisFrequentes(vendas: Venda[]) {
    // Map para manter contagem de clientes
    const clientesCount: { [key: string]: { nome: string; quantidade: number; total: number; } } = {};
    
    vendas.forEach(venda => {
      if (!venda.cliente) return; // Ignora vendas sem cliente
      
      if (!clientesCount[venda.cliente]) {
        clientesCount[venda.cliente] = { nome: venda.cliente, quantidade: 0, total: 0 };
      }
      clientesCount[venda.cliente].quantidade++;
      clientesCount[venda.cliente].total += venda.valor_total;
    });
    
    // Converter para array e ordenar
    this.clientesMaisFrequentes = Object.values(clientesCount)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 3);
  }
  
  formatarData(dataStr: string): string {
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR');
  }
  
  navegarPara(rota: string) {
    this.router.navigateByUrl(rota);
  }

  navegarParaVendasHoje() {
    this.router.navigateByUrl('/relatorios');
  }

  navegarParaProdutosBaixoEstoque() {
    this.router.navigate(['/produtos'], { 
      queryParams: { 
        filtro: 'baixo-estoque'
      }
    });
  }

  navegarParaClientesFrequentes() {
    // Extrair apenas os nomes dos clientes frequentes
    const nomesClientes = this.clientesMaisFrequentes.map(c => c.nome);
    
    this.router.navigate(['/clientes'], { 
      queryParams: { 
        filtro: 'frequentes',
        clientes: encodeURIComponent(JSON.stringify(nomesClientes))
      }
    });
  }

  navegarParaProdutosMaisVendidos() {
    // Extrair apenas os IDs dos produtos mais vendidos
    const idsProdutos = this.produtosMaisVendidos.map(p => p.id);
    
    this.router.navigate(['/produtos'], { 
      queryParams: { 
        filtro: 'mais-vendidos',
        produtos: encodeURIComponent(JSON.stringify(idsProdutos))
      }
    });
  }
}
