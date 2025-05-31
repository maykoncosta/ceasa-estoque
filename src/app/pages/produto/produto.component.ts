import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Produto, ProdutoService } from 'src/app/core/services/produto.service';
import { UnidadeMedida, UnidadeMedidaService } from 'src/app/core/services/unidade-medida.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';

class LabelValue{
  label: any;
  value: any;
  
}

@Component({
  selector: 'app-produto',
  templateUrl: './produto.component.html',
  styleUrls: ['./produto.component.css']
})
export class ProdutoComponent implements OnInit {

  onEdit: boolean = false;
  onCreate: boolean = false;
  form!: UntypedFormGroup;
  showDeleteModal = false;
  itemToDelete: Produto | any = undefined;
  produtos: Produto[] = [];
  unidades: any[] = [];

  constructor(
    private messageService: MessageService,
    private loaderService: LoaderService,
    private produtoService: ProdutoService,
    private unidadeService: UnidadeMedidaService
  ) {
  }
  ngOnInit(): void {
    this.form = new UntypedFormGroup({
      id: new UntypedFormControl({ value: '', disabled: true }),
      nome: new UntypedFormControl(undefined, Validators.compose([Validators.required, Validators.maxLength(15)])),
      estoque: new UntypedFormControl(undefined, Validators.compose([Validators.required])),
      preco: new UntypedFormControl(undefined, Validators.required),
      unidadeMedida: new UntypedFormControl(undefined, Validators.required),
    });
    this.loaderService.showLoading();
    this.listarProdutos();
    this.unidadeService.listarUnidades().subscribe(data => {
        this.unidades = data;
    });

  }

  listarProdutos() {
    this.produtoService.listarProdutos().subscribe(data => {
      this.produtos = data;
      console.log(data)
      this.loaderService.closeLoading();
    });
  }

  async createProduto() {
    let produto: Produto = this.form.getRawValue();
    this.loaderService.showLoading();
    let unidadeMedida: UnidadeMedida = this.form.get('unidadeMedida')?.value;
    if (this.onEdit) {
      this.produtoService.atualizarProduto(produto.id, produto).then(data => {
        this.aposSalvar();
      }).catch(error => {
        this.loaderService.closeLoading();
        this.messageService.error();
      });
    } else {
      this.produtoService.adicionarProduto(produto)?.then(data => {
        this.aposSalvar();
      }).catch(error => {
        this.loaderService.closeLoading();
        this.messageService.error();
      });
    }
  }

  aposSalvar() {
    this.listarProdutos()
    this.onCreate = false;
    this.onEdit = false;
    this.form.reset();
    this.messageService.success();
  }

  onCreateItem() {
    this.onCreate = true;
    this.onEdit = false;
    this.form.reset();
  }

  onEditItem(produto: Produto) {
    this.onEdit = true;
    this.onCreate = false;
    this.form.patchValue(produto);
  }

  onDeleteItem(produto: Produto) {
    this.showDeleteModal = true;
    this.itemToDelete = produto;
  }

  onCancel() {
    this.onEdit = false;
    this.onCreate = false;
    this.form.reset();
  }

  deleteItem() {
    if (this.itemToDelete) {
      this.loaderService.showLoading();
      this.produtoService.excluirProduto(this.itemToDelete.id).then(() => {
        this.itemToDelete = undefined;
        this.showDeleteModal = false;
        this.messageService.success();
        this.listarProdutos();
      }).catch(() => {
        this.messageService.error();
      })
    }
  }


}
