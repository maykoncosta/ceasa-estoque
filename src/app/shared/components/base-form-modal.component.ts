import { Directive, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';

@Directive()
export abstract class BaseFormModalComponent<T> implements OnInit, OnChanges {
  @Input() show = false;
  @Input() isEdit = false;
  
  form!: UntypedFormGroup;

  @Output() save = new EventEmitter<T>();
  @Output() cancel = new EventEmitter<void>();

  /**
   * Nome da propriedade do item no SimpleChanges
   * Deve ser sobrescrito pelas classes filhas
   */
  protected abstract get itemPropertyName(): string;

  /**
   * Getter para o item atual
   * Deve ser sobrescrito pelas classes filhas
   */
  protected abstract get currentItem(): T | null;

  /**
   * Método abstrato para inicializar o formulário
   * Deve ser implementado pelas classes filhas
   */
  protected abstract initializeForm(): void;

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes[this.itemPropertyName] && this.form) {
      if (this.currentItem) {
        this.form.patchValue(this.currentItem);
      } else {
        // Se não há item (modo de criação), resetar o formulário
        this.form.reset();
      }
    }
    
    // Resetar quando o modal é aberto em modo de criação
    if (changes['show'] && this.show && !this.isEdit && this.form) {
      this.form.reset();
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
}
