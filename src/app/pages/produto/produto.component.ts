import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { BaseComponent } from 'src/app/shared/components/base.component';
import { Produto, ProdutoService } from 'src/app/core/services/produto.service';
import { UnidadeMedidaService } from 'src/app/core/services/unidade-medida.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';

@Component({
  selector: 'app-produto',
  templateUrl: './produto.component.html',
  styleUrls: ['./produto.component.css']
})
export class ProdutoComponent extends BaseComponent<Produto> {
  produtos: Produto[] = [];
  unidades: any[] = [];

  constructor(
    messageService: MessageService,
    loaderService: LoaderService,
    private produtoService: ProdutoService,
    private unidadeService: UnidadeMedidaService
  ) {
    super(loaderService, messageService);
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

  override listarItens(): void {
    this.produtoService.listarProdutos().subscribe(data => {
      this.produtos = data;
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

  onDeleteItem(): void {
    this.deleteItem(() => this.produtoService.excluirProduto(this.itemToDelete!.id));
  }

  aposSalvar(): void {
    this.listarItens();
    this.onCreate = false;
    this.onEdit = false;
    this.form.reset();
    this.messageService.success();
  }
}
