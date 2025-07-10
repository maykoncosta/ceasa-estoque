import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { BaseComponent } from 'src/app/shared/components/base.component';
import { Venda, VendaService } from 'src/app/core/services/venda.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { PrintService } from 'src/app/shared/services/print.service';

@Component({
  selector: 'app-venda',
  templateUrl: './venda.component.html',
  styleUrls: ['./venda.component.css']
})
export class VendaComponent extends BaseComponent<Venda> {


  constructor(
    messageService: MessageService,
    loaderService: LoaderService,
    private vendaService: VendaService,
    private router: Router,
    private printService: PrintService
  ) {
    super(loaderService, messageService);
  }

  override initializePaginationConfig(): void {
    this.paginationConfig = { 
      pageSize: 10, 
      orderByField: 'data' 
    };
    this.pageSize = this.paginationConfig.pageSize;
    this.pageSizeOptions = [5, 10, 20, 50];
  }

  // Implementação do método abstrato do BaseComponent para buscar itens paginados com suporte a busca
  override async buscarItensPaginados(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    searchTerm?: string
  ) {
    return this.vendaService.buscarVendasPaginadas(pageSize, startAfterDoc, searchTerm);
  }

  // Método para listagem simples (sem paginação) - mantido para compatibilidade
  override listarItens(): void {
    this.vendaService.listarVendas().subscribe(data => {
      this.items = data;
      this.loaderService.closeLoading();
    });
  }

  override saveItem(): void {
    // Não implementado - redirecionamento para formulário
  }

  override onCreateItem(): void {
    this.router.navigate(['/vendas/nova']);
  }

  override onEditItem(venda: Venda): void {
    this.router.navigate(['/vendas/editar', venda.id]);
  }

  // Método para lidar com a exclusão de vendas
  onDeleteItem(): void {
    console.log('Excluindo venda:', this.itemToDelete);
    this.deleteItem(() => this.vendaService.excluirVenda(this.itemToDelete!.id));
  }

  // Método utilitário para expandir/contrair detalhes da venda
  toggleExpand(item: any): void {
    item.expandido = !item.expandido;
  }

  // Método para formatar data
  formatarData(dataStr: string): string {
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR');
  }

  /**
   * Imprime o cupom não fiscal da venda
   * @param venda Dados da venda para impressão
   */
  imprimirCupom(venda: Venda): void {
    try {
      this.loaderService.showLoading();
      this.printService.gerarCupomVenda(venda);
      this.messageService.success('Cupom gerado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao imprimir cupom:', error);
      this.messageService.error(error.message || 'Erro ao gerar cupom');
    } finally {
      this.loaderService.closeLoading();
    }
  }

  override onLoadValues(): void {
  }
}
