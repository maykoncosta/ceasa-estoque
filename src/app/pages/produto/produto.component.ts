import { Component } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
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
  
  constructor(
    messageService: MessageService,
    loaderService: LoaderService,
    private produtoService: ProdutoService,
    private unidadeService: UnidadeMedidaService
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

  override initializeForm(): void {
    this.form = new UntypedFormGroup({
      id: new UntypedFormControl({ value: '', disabled: true }),
      nome: new UntypedFormControl(undefined, Validators.compose([Validators.required, Validators.maxLength(15)])),
      estoque: new UntypedFormControl(undefined, Validators.compose([Validators.required])),
      preco_compra: new UntypedFormControl(undefined, Validators.required),
      preco_venda: new UntypedFormControl(undefined, Validators.required),
      unidadeMedida: new UntypedFormControl(undefined, Validators.required),
    });
  }

  // Implementação do método abstrato do BaseComponent para buscar itens paginados com suporte a busca
  override async buscarItensPaginados(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    searchTerm?: string
  ) {
    return this.produtoService.buscarProdutosPaginados(pageSize, startAfterDoc, searchTerm);
  }

  // Método mantido para compatibilidade com o BaseComponent
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
    this.listarItensPaginados();
    this.closeFormModal();
    this.messageService.success();
  }

  // Método para salvar o produto do formulário modal
  saveProdutoFromModal(produto: Produto): void {
    // Reutiliza a lógica existente
    this.saveItem();
  }
}
