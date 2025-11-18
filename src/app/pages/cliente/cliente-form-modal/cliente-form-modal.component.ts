import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormControl, UntypedFormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Cliente } from 'src/app/core/services/cliente.service';
import { PhoneValidatorService } from 'src/app/shared/services/phone-validator.service';
import { BaseFormModalComponent } from 'src/app/shared/components';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-cliente-form-modal',
  templateUrl: './cliente-form-modal.component.html',
  styleUrls: ['./cliente-form-modal.component.css']
})
export class ClienteFormModalComponent extends BaseFormModalComponent<Cliente> {
  @Input() cliente: Cliente | null = null;

  constructor(private phoneValidator: PhoneValidatorService) {
    super();
  }

  protected get itemPropertyName(): string {
    return 'cliente';
  }

  protected get currentItem(): Cliente | null {
    return this.cliente;
  }

  protected initializeForm(): void {
    this.form = new UntypedFormGroup({
      id: new UntypedFormControl({ value: '', disabled: true }),
      nome: new UntypedFormControl(undefined, [Validators.required, Validators.maxLength(50)]),
      celular: new UntypedFormControl(undefined, [
        Validators.required, 
        Validators.maxLength(20),
        Validators.pattern(/^\(\d{2}\) \d{4,5}-\d{4}$/)
      ])
    });
  }

  formatarCelular(event: any): void {
    const valorFormatado = this.phoneValidator.formatarCelular(event.target.value);
    event.target.value = valorFormatado;
    this.form.get('celular')?.setValue(valorFormatado);
  }

  /**
   * Obtém mensagem de erro personalizada para o campo celular
   * @param fieldName Nome do campo
   * @returns Mensagem de erro ou null
   */
  obterMensagemErroCelular(fieldName: string): string | null {
    const field = this.form.get(fieldName);
    if (field && field.errors && (field.touched || field.dirty)) {
      return this.phoneValidator.obterMensagemErro(field.errors);
    }
    return null;
  }
}
