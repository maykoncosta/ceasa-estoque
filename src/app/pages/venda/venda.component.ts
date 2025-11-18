import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { BaseComponent } from 'src/app/shared/components/base.component';
import { Venda, VendaService } from 'src/app/core/services/venda.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { PrintService } from 'src/app/shared/services/print.service';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ConfirmModalComponent],
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
    private route: ActivatedRoute,
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
    // Preservar contexto atual ao navegar para criar nova venda
    const queryParams = this.buildQueryParams();
    this.router.navigate(['/vendas/nova'], { queryParams });
  }

  override onEditItem(venda: Venda): void {
    // Preservar contexto atual ao navegar para editar venda
    const queryParams = this.buildQueryParams();
    this.router.navigate(['/vendas/editar', venda.id], { queryParams });
  }

  // Método auxiliar para construir query parameters do contexto atual
  private buildQueryParams(): any {
    const params: any = {};
    
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      params.searchTerm = this.searchTerm;
    }
    
    if (this.currentPage > 1) {
      params.page = this.currentPage;
    }
    
    if (this.pageSize !== 10) { // 10 é o padrão
      params.pageSize = this.pageSize;
    }
    
    return Object.keys(params).length > 0 ? params : null;
  }

  // Método para lidar com a exclusão de vendas
  onDeleteItem(): void {
    this.deleteItem(() => this.vendaService.excluirVenda(this.itemToDelete!.id));
  }

  // Método utilitário para expandir/contrair detalhes da venda
  toggleExpand(item: any): void {
    item.expandido = !item.expandido;
  }
  // Método para formatar data
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

  /**
   * Imprime o cupom diretamente abrindo a tela de impressão
   * @param venda Dados da venda para impressão
   */
  imprimirCupomDireto(venda: Venda): void {
    try {
      this.loaderService.showLoading();
      this.printService.imprimirCupomDireto(venda);
      this.messageService.success('Abrindo tela de impressão...');
    } catch (error: any) {
      console.error('Erro ao imprimir cupom:', error);
      this.messageService.error(error.message || 'Erro ao abrir tela de impressão');
    } finally {
      this.loaderService.closeLoading();
    }
  }

  override onLoadValues(): void {
    // Verificar se há parâmetros de contexto para restaurar
    this.route.queryParams.subscribe((params: any) => {
      if (params['searchTerm']) {
        this.searchTerm = params['searchTerm'];
      }
      
      if (params['pageSize']) {
        this.pageSize = parseInt(params['pageSize']);
        this.paginationConfig.pageSize = this.pageSize;
      }
      
      // Se há página específica, será restaurada após o carregamento inicial
      if (params['page']) {
        const targetPage = parseInt(params['page']);
        // Aguardar o carregamento inicial e depois navegar para a página específica
        setTimeout(() => {
          this.navegarParaPaginaEspecifica(targetPage);
        }, 100);
      }
    });
  }

  // Método para navegar para uma página específica (público para uso interno)
  private async navegarParaPaginaEspecifica(targetPage: number): Promise<void> {
    if (targetPage <= 1 || targetPage === this.currentPage) {
      return;
    }

    try {
      this.loaderService.showLoading();
      
      let currentDoc: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
      this.pageHistory = [];
      
      // Navegar página por página até a página desejada
      for (let page = 1; page < targetPage; page++) {
        const result: {
          items: Venda[],
          total: number,
          lastVisible?: QueryDocumentSnapshot<DocumentData>
        } = await this.buscarItensPaginados(this.pageSize, currentDoc, this.searchTerm);
        
        if (result.lastVisible) {
          this.pageHistory.push(result.lastVisible);
          currentDoc = result.lastVisible;
        }
      }
      
      // Carregar a página final
      const finalResult: {
        items: Venda[],
        total: number,
        lastVisible?: QueryDocumentSnapshot<DocumentData>
      } = await this.buscarItensPaginados(this.pageSize, currentDoc, this.searchTerm);
      
      this.items = finalResult.items;
      this.lastVisible = finalResult.lastVisible;
      this.currentPage = targetPage;
      
    } catch (error) {
      console.error('Erro ao restaurar página:', error);
      this.messageService.error('Erro ao restaurar posição na lista');
    } finally {
      this.loaderService.closeLoading();
    }
  }

  override ngOnInit(): void {
    super.ngOnInit();
    
    // Limpar query parameters após restaurar o contexto para manter a URL limpa
    setTimeout(() => {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true
      });
    }, 500);
  }
}
