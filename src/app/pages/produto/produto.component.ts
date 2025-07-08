import { Component } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from 'src/app/shared/components/base.component';
import { Produto, ProdutoService } from 'src/app/core/services/produto.service';
import { UnidadeMedidaService } from 'src/app/core/services/unidade-medida.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';

@Component({
  selector: 'app-produto',
  templateUrl: './produto.component.html',
  styleUrls: ['./produto.component.css']
})
export class ProdutoComponent extends BaseComponent<Produto> {
  unidades: any[] = [];
  showFormModal = false;
  selectedProduto: Produto | null = null;
  
  // Filtros específicos
  filtroAtivo: string | null = null;
  produtosMaisVendidosIds: string[] = [];
  
  constructor(
    messageService: MessageService,
    loaderService: LoaderService,
    private produtoService: ProdutoService,
    private unidadeService: UnidadeMedidaService,
    private route: ActivatedRoute
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
  }

  // Implementação do método abstrato do BaseComponent para buscar itens paginados com suporte a busca
  override async buscarItensPaginados(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    searchTerm?: string
  ) {
    // Se há filtro de baixo estoque ativo, usar o método específico
    if (this.filtroAtivo === 'baixo-estoque') {
      return this.produtoService.buscarProdutosBaixoEstoquePaginados(pageSize, startAfterDoc);
    }
    
    // Se há filtro de produtos mais vendidos ativo, usar o método específico
    if (this.filtroAtivo === 'mais-vendidos' && this.produtosMaisVendidosIds.length > 0) {
      return this.produtoService.buscarProdutosMaisVendidosPaginados(
        pageSize, 
        startAfterDoc, 
        this.produtosMaisVendidosIds
      );
    }
    
    // Caso contrário, usar o método padrão
    return this.produtoService.buscarProdutosPaginados(pageSize, startAfterDoc, searchTerm);
  }

  // Método para listagem simples (sem paginação) - mantido para compatibilidade
  override listarItens(): void {
    this.produtoService.listarProdutos().subscribe(data => {
      this.items = data;
      this.loaderService.closeLoading();
    });
  }

  override saveItem(): void {
    if (this.form.invalid) {
      this.messageService.info("Preencha todos os campos obrigatórios corretamente.");
      return;
    }

    const produto: Produto = this.form.getRawValue();
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
        .catch(() => this.messageService.error())
        .finally(() => this.loaderService.closeLoading());
    }
  }

  // Método para lidar com a exclusão de produtos
  onDeleteItem(): void {
    this.deleteItem(() => this.produtoService.excluirProduto(this.itemToDelete!.id));
  }

  // Métodos para gerenciar o modal de formulário
  openFormModal(isEdit: boolean, produto?: Produto): void {
    this.onEdit = isEdit;
    this.onCreate = !isEdit;
    this.selectedProduto = produto || null;
    this.form.reset();
    
    if (isEdit && produto) {
      this.form.patchValue(produto);
    }
    
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.onEdit = false;
    this.onCreate = false;
    this.selectedProduto = null;
    this.form.reset();
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
    this.listarItensPaginados(); // Usa a paginação por padrão
    this.closeFormModal();
    this.messageService.success();
  }

  // Método para salvar o produto do formulário modal
  saveProdutoFromModal(produto: Produto): void {
    // Reutiliza a lógica existente
    this.saveItem();
  }

  override ngOnInit(): void {
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

    // Chamar o ngOnInit da classe pai
    super.ngOnInit();
  }

  limparFiltros(): void {
    this.filtroAtivo = null;
    this.produtosMaisVendidosIds = [];
    // Recarregar dados sem filtros
    this.listarItensPaginados();
  }
}
