import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { Cliente } from 'src/app/core/services/cliente.service';
import { PhoneValidatorService } from 'src/app/shared/services/phone-validator.service';

@Component({
  selector: 'app-cliente-form-modal',
  templateUrl: './cliente-form-modal.component.html',
  styleUrls: ['./cliente-form-modal.component.css']
})
export class ClienteFormModalComponent implements OnChanges {
  @Input() show = false;
  @Input() isEdit = false;
  @Input() cliente: Cliente | null = null;
  @Input() form!: UntypedFormGroup;

  @Output() save = new EventEmitter<Cliente>();
  @Output() cancel = new EventEmitter<void>();

  constructor(private phoneValidator: PhoneValidatorService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cliente'] && this.cliente && this.form) {
      this.form.patchValue(this.cliente);
    }
  }

  onSave(): void {
    if (this.form.invalid) {
      return;
    }
    this.save.emit(this.form.getRawValue());
  }

  onCancel(): void {
    this.cancel.emit();
  }

  hasFieldError(form: UntypedFormGroup, field: string, error: string, ngForm: any): boolean {
    const formField = form.get(field);
    return (
      (formField?.hasError(error) && 
      (formField.touched || formField.dirty || ngForm?.submitted)) || false
    );
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
