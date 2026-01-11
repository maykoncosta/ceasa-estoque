import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Venda, VendaService } from 'src/app/core/services/venda.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  selector: 'app-cliente-vendas',
  templateUrl: './cliente-vendas.component.html',
  styleUrls: ['./cliente-vendas.component.css']
})
export class ClienteVendasComponent implements OnInit {
  nomeCliente: string = '';
  vendas: Venda[] = [];
  vendaEditando: string | null = null;
  valorPagoTemp: { [key: string]: number } = {};
  
  // Paginação
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;
  hasMore: boolean = false;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  lastVisible?: QueryDocumentSnapshot<DocumentData>;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vendaService: VendaService,
    private loaderService: LoaderService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.nomeCliente = params['nome'];
      if (this.nomeCliente) {
        this.carregarVendas();
      } else {
        this.voltarParaClientes();
      }
    });
  }

  async carregarVendas(): Promise<void> {
    this.loaderService.showLoading();
    
    try {
      const result = await this.vendaService.buscarVendasPorCliente(
        this.nomeCliente,
        this.pageSize,
        this.currentPage === 1 ? undefined : this.lastVisible,
        true // apenasNaoPagas
      );
      
      this.vendas = result.items;
      this.totalItems = result.total;
      this.hasMore = result.hasMore ?? false;
      this.totalPages = Math.ceil(this.totalItems / this.pageSize);
      this.lastVisible = result.lastVisible;
      
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
      this.messageService.error('Erro ao carregar vendas do cliente');
    } finally {
      this.loaderService.closeLoading();
    }
  }

  iniciarEdicao(venda: Venda): void {
    this.vendaEditando = venda.id;
    this.valorPagoTemp[venda.id] = venda.valor_pago || 0;
  }

  cancelarEdicao(): void {
    this.vendaEditando = null;
    this.valorPagoTemp = {};
  }

  async salvarValorPago(venda: Venda): Promise<void> {
    const novoValor = this.valorPagoTemp[venda.id] || 0;
    
    if (novoValor < 0) {
      this.messageService.error('O valor pago não pode ser negativo');
      return;
    }

    if (novoValor > venda.valor_total) {
      this.messageService.error('O valor pago não pode ser maior que o valor total da venda');
      return;
    }

    try {
      await this.vendaService.atualizarValorPago(venda.id, novoValor);
      venda.valor_pago = novoValor;
      this.vendaEditando = null;
      this.valorPagoTemp = {};
      this.messageService.success('Valor pago atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar valor pago:', error);
      this.messageService.error('Erro ao atualizar valor pago');
    }
  }

  formatarData(data: any): string {
    if (!data) return 'Data não informada';
    
    try {
      const dataObj = data.toDate ? data.toDate() : new Date(data);
      // Usar getFullYear, getMonth, getDate para evitar problemas de fuso horário
      const year = dataObj.getFullYear();
      const month = String(dataObj.getMonth() + 1).padStart(2, '0');
      const day = String(dataObj.getDate()).padStart(2, '0');
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'Data inválida';
    }
  }

  calcularSaldo(venda: Venda): number {
    const valorPago = venda.valor_pago || 0;
    return venda.valor_total - valorPago;
  }

  isVendaPaga(venda: Venda): boolean {
    return this.calcularSaldo(venda) <= 0;
  }

  voltarParaClientes(): void {
    // Restaurar contexto se existir nos query parameters
    this.route.queryParams.subscribe((params: any) => {
      const queryParams: any = {};
      
      if (params['searchTerm']) {
        queryParams.searchTerm = params['searchTerm'];
      }
      
      if (params['page']) {
        queryParams.page = params['page'];
      }
      
      if (params['pageSize']) {
        queryParams.pageSize = params['pageSize'];
      }
      
      if (params['filtro']) {
        queryParams.filtro = params['filtro'];
      }
      
      if (params['clientes']) {
        queryParams.clientes = params['clientes'];
      }
      
      this.router.navigate(['/clientes'], { 
        queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined 
      });
    });
  }

  // Métodos de paginação
  async proximaPagina(): Promise<void> {
    if (this.hasMore && this.lastVisible) {
      this.currentPage++;
      await this.carregarVendas();
    }
  }

  async paginaAnterior(): Promise<void> {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.lastVisible = undefined;
      await this.carregarVendas();
    }
  }

  async primeiraPagina(): Promise<void> {
    this.currentPage = 1;
    this.lastVisible = undefined;
    await this.carregarVendas();
  }

  async alterarTamanhoPagina(event: any): Promise<void> {
    this.pageSize = parseInt(event.target.value);
    this.currentPage = 1;
    this.lastVisible = undefined;
    await this.carregarVendas();
  }

  // Estatísticas
  calcularTotalGeral(): number {
    return this.vendas.reduce((total, venda) => total + venda.valor_total, 0);
  }

  calcularTotalPago(): number {
    return this.vendas.reduce((total, venda) => total + (venda.valor_pago || 0), 0);
  }

  calcularTotalSaldo(): number {
    return this.calcularTotalGeral() - this.calcularTotalPago();
  }

  get Math() {
    return Math;
  }
}
