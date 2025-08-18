import { Component } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BaseComponent } from 'src/app/shared/components/base.component';
import { Cliente, ClienteService } from 'src/app/core/services/cliente.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';
import { PhoneValidatorService } from 'src/app/shared/services/phone-validator.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';

@Component({
  selector: 'app-cliente',
  templateUrl: './cliente.component.html',
  styleUrls: ['./cliente.component.css']
})
export class ClienteComponent extends BaseComponent<Cliente> {
  showFormModal = false;
  selectedCliente: Cliente | null = null;
  
  // Filtros específicos
  filtroAtivo: string | null = null;
  clientesFrequentesNomes: string[] = [];
  constructor(
    messageService: MessageService,
    loaderService: LoaderService,
    private clienteService: ClienteService,
    private phoneValidator: PhoneValidatorService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    super(loaderService, messageService);
  }

  override initializePaginationConfig(): void {
    this.paginationConfig = { 
      pageSize: 10, 
      orderByField: 'nome' 
    };
    this.pageSize = this.paginationConfig.pageSize;
    this.pageSizeOptions = [5, 10, 20, 50];
  }

  override onLoadValues(): void {
    // Não há valores adicionais para carregar neste componente
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
          items: Cliente[],
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
        items: Cliente[],
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

  // Implementação do método abstrato do BaseComponent para buscar itens paginados com suporte a busca
  override async buscarItensPaginados(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    searchTerm?: string
  ) {
    // Se há filtro de clientes frequentes ativo, usar o método específico
    if (this.filtroAtivo === 'frequentes' && this.clientesFrequentesNomes.length > 0) {
      return this.clienteService.buscarClientesFrequentesPaginados(
        pageSize, 
        startAfterDoc, 
        this.clientesFrequentesNomes
      );
    }
    
    // Caso contrário, usar o método padrão
    return this.clienteService.buscarClientesPaginadas(pageSize, startAfterDoc, searchTerm);
  }

  // Método para listagem simples (sem paginação) - mantido para compatibilidade
  override listarItens(): void {
    this.clienteService.listarClientes().subscribe(data => {
      this.items = data;
      this.loaderService.closeLoading();
    });
  }
  override saveItem(): void {
    // Este método agora será chamado pelo modal com os dados do formulário
    // A lógica de salvamento será movida para saveClienteFromModal
  }

  // Método para lidar com a exclusão de clientes
  onDeleteItem(): void {
    this.deleteItem(() => this.clienteService.excluirCliente(this.itemToDelete!.id, this.itemToDelete!.nome));
  }
  // Métodos para gerenciar o modal de formulário
  openFormModal(isEdit: boolean, cliente?: Cliente): void {
    this.onEdit = isEdit;
    this.onCreate = !isEdit;
    this.selectedCliente = cliente || null;
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.onEdit = false;
    this.onCreate = false;
    this.selectedCliente = null;
  }

  // Sobrescrevendo os métodos do BaseComponent
  override onCreateItem(): void {
    this.openFormModal(false);
  }

  override onEditItem(item: Cliente): void {
    this.openFormModal(true, item);
  }

  override onCancel(): void {
    this.closeFormModal();
  }

  // Sobrescrevendo o método para salvar e controlar o modal
  override aposSalvar(): void {
    this.recarregarItensManterContexto(); // Mantém o contexto da busca e página atual
    this.closeFormModal();
    this.messageService.success();
  }
  // Método para salvar o cliente do formulário modal
  saveClienteFromModal(cliente: Cliente): void {
    this.loaderService.showLoading();

    if (this.onEdit) {
      this.clienteService.atualizarCliente(cliente.id, cliente)
        .then(() => this.aposSalvar())
        .catch((error) => {
          this.messageService.error(error.message);
          this.loaderService.closeLoading();
        });
    } else {
      this.clienteService.adicionarCliente(cliente)
        .then(() => this.aposSalvar())
        .catch((error) => {
          this.messageService.error(error.message);
          this.loaderService.closeLoading();
        });
    }
  }

  // Método para formatar celular na exibição
  formatarCelular(celular: string): string {
    return this.phoneValidator.formatarParaExibicao(celular);
  }

  override ngOnInit(): void {
    // Verificar query parameters antes de chamar o ngOnInit do pai
    this.route.queryParams.subscribe(params => {
      // Verificar se estamos restaurando contexto de navegação
      const isRestoringContext = params['searchTerm'] || params['page'] || params['pageSize'];
      
      if (isRestoringContext) {
        // Restaurar contexto de navegação
        if (params['searchTerm']) {
          this.searchTerm = params['searchTerm'];
        }
        
        if (params['pageSize']) {
          this.pageSize = parseInt(params['pageSize']);
          this.paginationConfig.pageSize = this.pageSize;
        }
        
        if (params['filtro']) {
          this.filtroAtivo = params['filtro'];
        }
        
        if (params['clientes']) {
          try {
            this.clientesFrequentesNomes = JSON.parse(decodeURIComponent(params['clientes']));
          } catch (e) {
            console.error('Erro ao parsear lista de clientes frequentes:', e);
            this.clientesFrequentesNomes = [];
          }
        }
      } else {
        // Lógica original para filtros vindos do dashboard
        this.filtroAtivo = params['filtro'] || null;
        
        if (this.filtroAtivo === 'frequentes' && params['clientes']) {
          try {
            this.clientesFrequentesNomes = JSON.parse(decodeURIComponent(params['clientes']));
          } catch (e) {
            console.error('Erro ao parsear lista de clientes frequentes:', e);
            this.clientesFrequentesNomes = [];
          }
        }
      }
    });

    // Chamar o ngOnInit da classe pai
    super.ngOnInit();

    // Se há página específica para restaurar, fazer isso após o carregamento inicial
    this.route.queryParams.subscribe(params => {
      if (params['page'] && parseInt(params['page']) > 1) {
        const targetPage = parseInt(params['page']);
        setTimeout(() => {
          this.navegarParaPaginaEspecifica(targetPage);
        }, 200);
      }

      // Limpar query parameters de contexto após uso (mas manter filtros originais)
      if (params['searchTerm'] || params['page'] || params['pageSize']) {
        setTimeout(() => {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
              // Manter apenas parâmetros de filtro originais se existirem
              ...(this.filtroAtivo && !params['searchTerm'] ? { filtro: this.filtroAtivo } : {}),
              ...(this.clientesFrequentesNomes.length > 0 && !params['searchTerm'] ? { clientes: encodeURIComponent(JSON.stringify(this.clientesFrequentesNomes)) } : {})
            },
            replaceUrl: true
          });
        }, 1000);
      }
    });
  }

  limparFiltros(): void {
    this.filtroAtivo = null;
    this.clientesFrequentesNomes = [];
    // Recarregar dados sem filtros
    this.listarItensPaginados();
  }

  verVendasCliente(nomeCliente: string): void {
    // Preservar contexto atual ao navegar para vendas do cliente
    const queryParams = this.buildQueryParams();
    this.router.navigate(['/clientes', nomeCliente, 'vendas'], { queryParams });
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
    
    if (this.filtroAtivo) {
      params.filtro = this.filtroAtivo;
    }
    
    if (this.clientesFrequentesNomes.length > 0) {
      params.clientes = encodeURIComponent(JSON.stringify(this.clientesFrequentesNomes));
    }
    
    return Object.keys(params).length > 0 ? params : null;
  }
}
