import { Component, Input, forwardRef, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, AbstractControl, ValidationErrors } from '@angular/forms';
import { PhoneValidatorService } from '../services/phone-validator.service';

@Component({
  selector: 'app-phone-input',
  template: `
    <div class="flex flex-col">
      <label *ngIf="label" [for]="id" class="mb-1 text-sm font-medium">{{ label }}
        <span *ngIf="required" class="text-red-500">*</span>
      </label>
      <input 
        type="tel" 
        [id]="id" 
        [placeholder]="placeholder"
        [value]="displayValue"
        [class]="inputClasses"
        [ngClass]="errorClasses"
        [disabled]="disabled"
        [readonly]="readonly"
        [maxlength]="maxLength"
        inputmode="numeric"
        (input)="onInput($event)"
        (blur)="onBlur()"
        (focus)="onFocus()">
      <small *ngIf="errorMessage" class="text-red-500 mt-1">
        {{ errorMessage }}
      </small>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    }
  ]
})
export class PhoneInputComponent implements ControlValueAccessor, OnInit {
  @Input() id = 'phone-input';
  @Input() label = '';
  @Input() placeholder = '(11) 99999-9999';
  @Input() required = false;
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() maxLength = 15;
  @Input() phoneType: 'auto' | 'celular' | 'fixo' = 'auto';
  @Input() inputClasses = 'mt-2 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none';
  @Input() showValidation = true;

  displayValue = '';
  private value = '';
  private isTouched = false;
  private isFocused = false;

  // Implementação do ControlValueAccessor
  private onChange = (value: string) => {};
  private onTouched = () => {};

  constructor(private phoneValidator: PhoneValidatorService) {}

  ngOnInit(): void {
    if (this.phoneType === 'fixo') {
      this.placeholder = '(11) 3999-9999';
      this.maxLength = 14;
    } else if (this.phoneType === 'celular') {
      this.placeholder = '(11) 99999-9999';
      this.maxLength = 15;
    }
  }

  // Getters para classes CSS
  get errorClasses(): { [key: string]: boolean } {
    return {
      'bg-red-50 border-l-4 border-l-red-500 focus:bg-red-25 focus:outline-red-500': 
        this.showValidation && this.hasErrors && this.shouldShowValidation
    };
  }

  get hasErrors(): boolean {
    return !!this.errorMessage;
  }

  get shouldShowValidation(): boolean {
    return this.isTouched && !this.isFocused;
  }

  get errorMessage(): string | null {
    if (!this.showValidation || !this.shouldShowValidation) {
      return null;
    }

    if (this.required && !this.value) {
      return 'Campo obrigatório';
    }

    if (this.value) {
      const errors = this.validatePhone(this.value);
      return this.phoneValidator.obterMensagemErro(errors);
    }

    return null;
  }

  // Métodos do ControlValueAccessor
  writeValue(value: string): void {
    this.value = value || '';
    this.updateDisplayValue();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // Eventos do input
  onInput(event: any): void {
    const inputValue = event.target.value;
    
    // Formatar baseado no tipo
    let formattedValue: string;
    switch (this.phoneType) {
      case 'celular':
        formattedValue = this.phoneValidator.formatarCelular(inputValue);
        break;
      case 'fixo':
        formattedValue = this.phoneValidator.formatarTelefoneFixo(inputValue);
        break;
      default:
        formattedValue = this.phoneValidator.formatarAutomatico(inputValue);
    }

    // Atualizar display
    this.displayValue = formattedValue;
    event.target.value = formattedValue;

    // Armazenar valor limpo
    this.value = this.phoneValidator.limparCelular(formattedValue);
    this.onChange(this.value);
  }

  onBlur(): void {
    this.isTouched = true;
    this.isFocused = false;
    this.onTouched();
  }

  onFocus(): void {
    this.isFocused = true;
  }

  private updateDisplayValue(): void {
    if (this.value) {
      switch (this.phoneType) {
        case 'celular':
          this.displayValue = this.phoneValidator.formatarCelular(this.value);
          break;
        case 'fixo':
          this.displayValue = this.phoneValidator.formatarTelefoneFixo(this.value);
          break;
        default:
          this.displayValue = this.phoneValidator.formatarParaExibicao(this.value);
      }
    } else {
      this.displayValue = '';
    }
  }

  private validatePhone(value: string): ValidationErrors | null {
    if (!value) return null;

    switch (this.phoneType) {
      case 'celular':
        return this.phoneValidator.celularBrasileiroValidator()(
          { value } as AbstractControl
        );
      case 'fixo':
        return this.phoneValidator.telefoneFixoBrasileiroValidator()(
          { value } as AbstractControl
        );
      default:
        // Para auto, detecta o tipo e valida accordingly
        const tipo = this.phoneValidator.detectarTipoTelefone(value);
        if (tipo === 'celular') {
          return this.phoneValidator.celularBrasileiroValidator()(
            { value } as AbstractControl
          );
        } else if (tipo === 'fixo') {
          return this.phoneValidator.telefoneFixoBrasileiroValidator()(
            { value } as AbstractControl
          );
        } else {
          return { telefoneInvalido: true };
        }
    }
  }
}
