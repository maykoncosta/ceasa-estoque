import { Component, Input } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { UnidadeMedida } from 'src/app/core/services/unidade-medida.service';
import { BaseFormModalComponent } from 'src/app/shared/components';

@Component({
  selector: 'app-unidade-medida-form-modal',
  templateUrl: './unidade-medida-form-modal.component.html',
  styleUrls: ['./unidade-medida-form-modal.component.css']
})
export class UnidadeMedidaFormModalComponent extends BaseFormModalComponent<UnidadeMedida> {
  @Input() unidadeMedida: UnidadeMedida | null = null;

  protected get itemPropertyName(): string {
    return 'unidadeMedida';
  }

  protected get currentItem(): UnidadeMedida | null {
    return this.unidadeMedida;
  }

  protected initializeForm(): void {
    this.form = new UntypedFormGroup({
      id: new UntypedFormControl({ value: '', disabled: true }),
      nome: new UntypedFormControl(undefined, [Validators.required, Validators.maxLength(20)]),
      descricao: new UntypedFormControl(undefined, [Validators.required, Validators.maxLength(100)])
    });
  }
}
