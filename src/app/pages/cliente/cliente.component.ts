import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, UntypedFormControl, UntypedFormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BaseComponent } from 'src/app/shared/components/base.component';
import { Cliente, ClienteService } from 'src/app/core/services/cliente.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';
import { PhoneValidatorService } from 'src/app/shared/services/phone-validator.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';
import { ClienteFormModalComponent } from './cliente-form-modal/cliente-form-modal.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ConfirmModalComponent, ClienteFormModalComponent],
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
  
  // Cache completo de clientes
  clientesCache: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
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
    // Buscar clientes (o cache está no serviço, não no componente)
    this.clienteService.buscarTodosClientesParaCache().subscribe({
      next: (data) => {
        this.clientesCache = data;
        this.clientesFiltrados = data;
        this.totalItems = data.length;
        
        // Atualizar paginação local
        this.atualizarPaginacaoLocal();
        this.loaderService.closeLoading();
      },
      error: (error) => {
        console.error('Erro ao carregar clientes:', error);
        this.messageService.error('Erro ao carregar clientes');
        this.loaderService.closeLoading();
      }
    });
  }

  // Paginação local em memória
  override async buscarItensPaginados(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    searchTerm?: string
  ) {
    // Não usado mais - mantido por compatibilidade
    return { items: [], total: 0 };
  }
  
  // Atualizar paginação local
  atualizarPaginacaoLocal(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.items = this.clientesFiltrados.slice(startIndex, endIndex);
    this.totalItems = this.clientesFiltrados.length;
    this.totalPages = Math.ceil(this.clientesFiltrados.length / this.pageSize);
    this.hasMore = this.currentPage < this.totalPages;
  }
  
  // Sobrescrever método de busca
  override async buscarPorTermo(termo: string): Promise<void> {
    this.searchTerm = termo;
    
    if (!termo || termo.trim() === '') {
      this.clientesFiltrados = this.clientesCache;
    } else {
      const termoUpper = termo.toLocaleUpperCase();
      this.clientesFiltrados = this.clientesCache.filter(cliente =>
        cliente.nome.toLocaleUpperCase().includes(termoUpper)
      );
    }
    
    this.currentPage = 1;
    this.atualizarPaginacaoLocal();
  }
  
  // Sobrescrever limpar busca
  override limparBusca(): void {
    this.searchTerm = '';
    this.clientesFiltrados = this.clientesCache;
    this.currentPage = 1;
    this.atualizarPaginacaoLocal();
  }
  
  // Sobrescrever navegação de páginas
  override proximaPagina(): void {
    const totalPages = Math.ceil(this.clientesFiltrados.length / this.pageSize);
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.atualizarPaginacaoLocal();
    }
  }
  
  override paginaAnterior(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.atualizarPaginacaoLocal();
    }
  }
  
  override primeiraPagina(): void {
    this.currentPage = 1;
    this.atualizarPaginacaoLocal();
  }
  
  override alterarTamanhoPagina(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    if (selectElement) {
      this.pageSize = Number(selectElement.value);
      this.paginationConfig.pageSize = this.pageSize;
      this.currentPage = 1;
      this.atualizarPaginacaoLocal();
    }
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
    this.deleteItem(() => {
      return this.clienteService.excluirCliente(this.itemToDelete!.id, this.itemToDelete!.nome).then(() => {
        // SEMPRE recarregar cache após exclusão (forçar reload do banco)
        this.clienteService.buscarTodosClientesParaCache(true).subscribe({
          next: (data) => {
            this.clientesCache = data;
            this.clientesFiltrados = data;
            this.totalItems = data.length;
            this.atualizarPaginacaoLocal();
          }
        });
      });
    });
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
    // SEMPRE recarregar cache completo após salvar (forçar reload do banco)
    this.clienteService.buscarTodosClientesParaCache(true).subscribe({
      next: (data) => {
        this.clientesCache = data;
        this.clientesFiltrados = data;
        this.totalItems = data.length;
        this.atualizarPaginacaoLocal();
        this.loaderService.closeLoading();
      },
      error: (error) => {
        console.error('Erro ao recarregar cache:', error);
        this.loaderService.closeLoading();
      }
    });
    
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
    this.initializePaginationConfig();
    this.loaderService.showLoading();
    
    // Verificar query parameters antes de carregar dados
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

    // Carregar dados (NÃO chamar super.ngOnInit pois usamos cache local)
    this.onLoadValues();

    // Se há página específica para restaurar, fazer isso após o carregamento inicial
    this.route.queryParams.subscribe(params => {
      if (params['page'] && parseInt(params['page']) > 1) {
        const targetPage = parseInt(params['page']);
        setTimeout(() => {
          // Com paginação local, apenas ir para a página
          this.currentPage = targetPage;
          this.atualizarPaginacaoLocal();
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
    
    // Resetar para cache completo
    this.clientesFiltrados = this.clientesCache;
    this.currentPage = 1;
    this.atualizarPaginacaoLocal();
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
