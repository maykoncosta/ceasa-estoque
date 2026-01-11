import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ProdutoService, Produto } from 'src/app/core/services/produto.service';
import { EstatisticasService } from 'src/app/core/services/estatisticas.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { EmpresaService } from 'src/app/core/services/empresa.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  vendasHoje: number = 0;
  valorTotalHoje: number = 0;
  lucroTotalHoje: number = 0;
  produtosBaixoEstoque: Produto[] = [];
  clientesMaisFrequentes: any[] = [];
  produtosMaisVendidos: any[] = [];
  
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
    private estatisticasService: EstatisticasService,
    private loaderService: LoaderService,
    private empresaService: EmpresaService
  ) {}

  async ngOnInit() {
    await this.inicializarEmpresa();
    await this.carregarDados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async inicializarEmpresa(): Promise<void> {
    try {
      await this.empresaService.inicializarEmpresaSeNecessario();
    } catch (error) {
      console.error('Erro ao inicializar empresa:', error);
    }
  }
  
  async carregarDados() {
    this.loaderService.showLoading();
    
    try {
      // Carregar estatísticas de hoje
      const estatisticasHoje = await this.estatisticasService.buscarEstatisticasHoje();
      
      if (estatisticasHoje) {
        this.vendasHoje = estatisticasHoje.total_vendas;
        this.valorTotalHoje = estatisticasHoje.valor_total;
        this.lucroTotalHoje = estatisticasHoje.lucro_total;
      }
      
      // Carregar estatísticas dos últimos 7 dias
      const ultimos7Dias = await this.estatisticasService.buscarEstatisticasUltimosDias(7);
      
      // Produtos mais vendidos
      this.produtosMaisVendidos = ultimos7Dias.produtos_mais_vendidos.slice(0, 5);
      
      // Calcular percentuais para o gráfico de produtos
      if (this.produtosMaisVendidos.length > 0) {
        const valorMaximo = this.produtosMaisVendidos[0].valor_total;
        this.produtosMaisVendidos.forEach((p: any) => {
          p.percentual = (p.valor_total / valorMaximo) * 100;
          p.id = p.produto_id;
          p.total = p.valor_total;
        });
      }
      
      // Clientes mais frequentes
      this.clientesMaisFrequentes = ultimos7Dias.clientes_mais_frequentes.slice(0, 3);
      
      // Preparar dados para o gráfico
      this.prepararDadosGrafico(ultimos7Dias.vendas_por_dia);
      
      // Carregar produtos com estoque baixo usando a query otimizada
      const produtosBaixoEstoque = await this.produtoService.buscarProdutosBaixoEstoquePaginados(5);
      this.produtosBaixoEstoque = produtosBaixoEstoque.items;
      
      this.loading = false;
      this.loaderService.closeLoading();
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      this.loading = false;
      this.loaderService.closeLoading();
    }
  }
  
  prepararDadosGrafico(vendasPorDia: any[]) {
    // Criar array com últimos 7 dias
    const hoje = new Date();
    const ultimos7Dias = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(hoje.getDate() - (6 - i));
      return this.formatarDataYYYYMMDD(d);
    });
    
    // Mapear vendas por dia
    const vendasMap = new Map(vendasPorDia.map(v => [v.data, v.valor_total]));
    
    // Labels em formato BR
    const labels = ultimos7Dias.map(data => {
      const [ano, mes, dia] = data.split('-');
      return `${dia}/${mes}`;
    });
    
    // Dados para o gráfico
    const dados = ultimos7Dias.map(data => vendasMap.get(data) || 0);
    
    this.dadosGrafico = {
      labels: labels,
      datasets: [
        {
          label: 'Vendas (R$)',
          data: dados,
          backgroundColor: '#2553EB',
          borderColor: '#2553EB',
          tension: 0.4
        }
      ]
    };
  }
  
  formatarDataYYYYMMDD(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
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
