import { Component, Input } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Produto } from 'src/app/core/services/produto.service';
import { BaseFormModalComponent } from 'src/app/shared/components';

@Component({
  selector: 'app-produto-form-modal',
  templateUrl: './produto-form-modal.component.html',
  styleUrls: ['./produto-form-modal.component.css']
})
export class ProdutoFormModalComponent extends BaseFormModalComponent<Produto> {
  @Input() produto: Produto | null = null;
  @Input() unidades: any[] = [];

  protected get itemPropertyName(): string {
    return 'produto';
  }

  protected get currentItem(): Produto | null {
    return this.produto;
  }

  protected initializeForm(): void {
    this.form = new UntypedFormGroup({
      id: new UntypedFormControl({ value: '', disabled: true }),
      nome: new UntypedFormControl(undefined, [Validators.required, Validators.maxLength(50)]),
      estoque: new UntypedFormControl(undefined, [Validators.required, Validators.min(0)]),
      preco_compra: new UntypedFormControl(undefined, [Validators.required, Validators.min(0.01)]),
      preco_venda: new UntypedFormControl(undefined, [Validators.required, Validators.min(0.01)]),
      unidadeMedida: new UntypedFormControl(undefined, Validators.required)
    });
  }
}
