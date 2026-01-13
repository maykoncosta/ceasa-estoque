import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, UntypedFormControl, UntypedFormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BaseComponent } from 'src/app/shared/components/base.component';
import { Produto, ProdutoService } from 'src/app/core/services/produto.service';
import { UnidadeMedidaService } from 'src/app/core/services/unidade-medida.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';
import { PrintService } from 'src/app/shared/services/print.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';
import { ProdutoFormModalComponent } from './produto-form-modal/produto-form-modal.component';
import { ProdutoEstoqueModalComponent } from './produto-estoque-modal/produto-estoque-modal.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ConfirmModalComponent, ProdutoFormModalComponent, ProdutoEstoqueModalComponent],
  selector: 'app-produto',
  templateUrl: './produto.component.html',
  styleUrls: ['./produto.component.css']
})
export class ProdutoComponent extends BaseComponent<Produto> {
  unidades: any[] = [];
  showFormModal = false;
  selectedProduto: Produto | null = null;
  
  // Modal de ajuste de estoque
  showEstoqueModal = false;
  produtoParaAjuste: Produto | null = null;
  
  // Filtros específicos
  filtroAtivo: string | null = null;
  produtosMaisVendidosIds: string[] = [];
  
  // Cache completo de produtos
  produtosCache: Produto[] = [];
  produtosFiltrados: Produto[] = [];
    constructor(
    messageService: MessageService,
    loaderService: LoaderService,
    private produtoService: ProdutoService,
    private unidadeService: UnidadeMedidaService,
    private route: ActivatedRoute,
    private printService: PrintService
  ) {
    super(loaderService, messageService);
  }

  override initializePaginationConfig(): void {
    this.paginationConfig = { 
      pageSize: 5, 
      orderByField: 'nome' 
    };
    this.pageSize = this.paginationConfig.pageSize;
    this.pageSizeOptions = [5, 10, 20, 50];
  }

  override onLoadValues(): void {
    this.unidadeService.listarUnidades().subscribe(data => {
      this.unidades = data;
    });
    
    // Buscar produtos (o cache está no serviço, não no componente)
    this.produtoService.buscarTodosProdutosParaCache().subscribe({
      next: (data) => {
        this.produtosCache = data;
        this.produtosFiltrados = data;
        this.totalItems = data.length;
        
        // Atualizar paginação local
        this.atualizarPaginacaoLocal();
        this.loaderService.closeLoading();
      },
      error: (error) => {
        console.error('Erro ao carregar produtos:', error);
        this.messageService.error('Erro ao carregar produtos');
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
    this.items = this.produtosFiltrados.slice(startIndex, endIndex);
    this.totalItems = this.produtosFiltrados.length;
    this.totalPages = Math.ceil(this.produtosFiltrados.length / this.pageSize);
    this.hasMore = this.currentPage < this.totalPages;
  }
  
  // Sobrescrever método de busca
  override async buscarPorTermo(termo: string): Promise<void> {
    this.searchTerm = termo;
    
    if (!termo || termo.trim() === '') {
      this.produtosFiltrados = this.produtosCache;
    } else {
      const termoUpper = termo.toLocaleUpperCase();
      this.produtosFiltrados = this.produtosCache.filter(produto =>
        produto.nome.toLocaleUpperCase().includes(termoUpper)
      );
    }
    
    this.currentPage = 1;
    this.atualizarPaginacaoLocal();
  }
  
  // Sobrescrever limpar busca
  override limparBusca(): void {
    this.searchTerm = '';
    this.produtosFiltrados = this.produtosCache;
    this.currentPage = 1;
    this.atualizarPaginacaoLocal();
  }
  
  // Sobrescrever navegação de páginas
  override proximaPagina(): void {
    const totalPages = Math.ceil(this.produtosFiltrados.length / this.pageSize);
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
  
  onPageSizeChange(): void {
    this.currentPage = 1;
    this.atualizarPaginacaoLocal();
  }

  // Método para listagem simples (sem paginação) - mantido para compatibilidade
  override listarItens(): void {
    this.produtoService.listarProdutos().subscribe(data => {
      this.items = data;
      this.loaderService.closeLoading();
    });
  }
  override saveItem(): void {
    // Este método agora será chamado pelo modal com os dados do formulário
    // A lógica de salvamento será movida para saveProdutoFromModal
  }

  // Método para lidar com a exclusão de produtos
  onDeleteItem(): void {
    this.deleteItem(() => {
      return this.produtoService.excluirProduto(this.itemToDelete!.id).then(() => {
        // SEMPRE recarregar cache após exclusão (forçar reload do banco)
        this.produtoService.buscarTodosProdutosParaCache(true).subscribe({
          next: (data) => {
            this.produtosCache = data;
            this.produtosFiltrados = data;
            this.totalItems = data.length;
            this.atualizarPaginacaoLocal();
          }
        });
      });
    });
  }
  // Métodos para gerenciar o modal de formulário
  openFormModal(isEdit: boolean, produto?: Produto): void {
    this.onEdit = isEdit;
    this.onCreate = !isEdit;
    this.selectedProduto = produto || null;
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.onEdit = false;
    this.onCreate = false;
    this.selectedProduto = null;
  }

  // Sobrescrevendo os métodos do BaseComponent
  override onCreateItem(): void {
    this.openFormModal(false);
  }

  override onEditItem(item: Produto): void {
    this.openFormModal(true, item);
  }

  override onCancel(): void {
    this.closeFormModal();
  }

  // Sobrescrevendo o método para salvar e controlar o modal
  override aposSalvar(): void {
    // SEMPRE recarregar cache completo após salvar (forçar reload do banco)
    this.produtoService.buscarTodosProdutosParaCache(true).subscribe({
      next: (data) => {
        this.produtosCache = data;
        this.produtosFiltrados = data;
        this.totalItems = data.length;
        this.atualizarPaginacaoLocal();
      }
    });
    
    this.closeFormModal();
    this.messageService.success();
  }
  // Método para salvar o produto do formulário modal
  saveProdutoFromModal(produto: Produto): void {
    this.loaderService.showLoading();

    if (this.onEdit) {
      this.produtoService.atualizarProduto(produto.id, produto)
        .then(() => this.aposSalvar())
        .catch(() => this.messageService.error())
        .finally(() => this.loaderService.closeLoading());
    } else {
      const user = this.produtoService.adicionarProduto(produto);
      if (!user) {
        this.messageService.error("Erro ao adicionar produto. Usuário não autenticado.");
        this.loaderService.closeLoading();
        return;
      }

      user.then(() => this.aposSalvar())
        .catch(() => {
          this.messageService.error()
          this.loaderService.closeLoading()
        });
    }
  }

  override ngOnInit(): void {
    this.initializePaginationConfig();
    this.loaderService.showLoading();
    // NÃO chamar listarItensPaginados - usamos cache local
    this.onLoadValues();
    
    // Verificar se há query parameters de filtro
    this.route.queryParams.subscribe(params => {
      this.filtroAtivo = params['filtro'] || null;
      
      // Se há filtro de produtos mais vendidos, extrair a lista de IDs
      if (this.filtroAtivo === 'mais-vendidos' && params['produtos']) {
        try {
          this.produtosMaisVendidosIds = JSON.parse(decodeURIComponent(params['produtos']));
        } catch (e) {
          console.error('Erro ao parsear lista de produtos mais vendidos:', e);
          this.produtosMaisVendidosIds = [];
        }
      }
    });
  }

  limparFiltros(): void {
    this.filtroAtivo = null;
    this.produtosMaisVendidosIds = [];
    
    // Resetar para cache completo
    this.produtosFiltrados = this.produtosCache;
    this.currentPage = 1;
    this.atualizarPaginacaoLocal();
  }  // Método para imprimir produtos
  imprimirProdutos(): void {
    try {
      this.printService.imprimirListaProdutos(this.items);
    } catch (error) {
      this.messageService.error(error instanceof Error ? error.message : 'Erro ao imprimir lista de produtos');
    }  }

  // Métodos para ajuste de estoque
  openEstoqueModal(produto: Produto): void {
    this.produtoParaAjuste = produto;
    this.showEstoqueModal = true;
  }

  closeEstoqueModal(): void {
    this.showEstoqueModal = false;
    this.produtoParaAjuste = null;
  }
  async ajustarEstoque(event: { produto: Produto, ajuste: number }): Promise<void> {
    this.loaderService.showLoading();
    
    try {
      const novoEstoque = await this.produtoService.ajustarEstoque(
        event.produto, 
        event.ajuste
      );
      
      this.messageService.success(
        `Estoque ajustado com sucesso! Novo estoque: ${novoEstoque}`
      );
      
      this.closeEstoqueModal();
      
      // SEMPRE recarregar cache após ajustar estoque (forçar reload do banco)
      this.produtoService.buscarTodosProdutosParaCache(true).subscribe({
        next: (data) => {
          this.produtosCache = data;
          this.produtosFiltrados = data;
          this.totalItems = data.length;
          this.atualizarPaginacaoLocal();
        }
      });
      
    } catch (error) {
      console.error('Erro ao ajustar estoque:', error);
      this.messageService.error('Erro ao ajustar estoque');
    } finally {
      this.loaderService.closeLoading();
    }
  }

  // Controle do modal de confirmação para zerar estoque
  showZerarEstoqueModal = false;

  // Método para mostrar modal de confirmação de zerar estoque
  confirmarZerarEstoque(): void {
    this.showZerarEstoqueModal = true;
  }

  // Método para zerar estoque de todos os produtos
  async zerarEstoqueTodosProdutos(): Promise<void> {
    this.loaderService.showLoading();
    
    try {
      const quantidadeZerada = await this.produtoService.zerarEstoqueTodosProdutos();
      
      this.messageService.success(
        `Estoque zerado com sucesso! ${quantidadeZerada} produto(s) foram zerados.`
      );
      
      this.showZerarEstoqueModal = false;
      this.recarregarItensManterContexto(); // Recarregar mantendo contexto da busca e página
      
    } catch (error) {
      console.error('Erro ao zerar estoque:', error);
      this.messageService.error('Erro ao zerar estoque de todos os produtos');
    } finally {
      this.loaderService.closeLoading();
    }
  }
}
