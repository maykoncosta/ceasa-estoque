import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { delay } from 'rxjs';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';

export interface Produto {
  id: number;
  nome: string;
  estoque: number;
  preco: any;
  unidadeMedida: any;
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

  constructor(private fb: FormBuilder,
    private messageService: MessageService,
    private loaderService: LoaderService
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
  }

  produtos: Produto[] = [{ id: 1, nome: 'MELANCIA', preco: '0.70', unidadeMedida: 'KG', estoque: 0 } as Produto,
  { id: 2, nome: 'MORANGO', preco: '10.00', unidadeMedida: 'BANDEJA', estoque: 10 } as Produto
  ];

  async createProduto() {
    let produto: Produto = this.form.getRawValue();
    if (this.onEdit) {
      this.produtos = this.produtos.filter(p => p.id !== produto.id);
    }
    this.produtos.push(produto);
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
    this.produtos = this.produtos.filter(p => p.id !== produto.id);
    this.messageService.success();
  }

  onCancel() {
    this.onEdit = false;
    this.onCreate = false;
    this.form.reset();
  }
}
