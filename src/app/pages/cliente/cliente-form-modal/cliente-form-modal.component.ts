import { Component, Input } from '@angular/core';
import { Cliente } from 'src/app/core/services/cliente.service';
import { PhoneValidatorService } from 'src/app/shared/services/phone-validator.service';
import { BaseFormModalComponent } from 'src/app/shared/components';

@Component({
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
