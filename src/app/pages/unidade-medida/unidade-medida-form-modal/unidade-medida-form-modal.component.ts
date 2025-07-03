import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { UnidadeMedida } from 'src/app/core/services/unidade-medida.service';

@Component({
  selector: 'app-unidade-medida-form-modal',
  templateUrl: './unidade-medida-form-modal.component.html',
  styleUrls: ['./unidade-medida-form-modal.component.css']
})
export class UnidadeMedidaFormModalComponent implements OnChanges {
  @Input() show = false;
  @Input() isEdit = false;
  @Input() unidadeMedida: UnidadeMedida | null = null;
  @Input() form!: UntypedFormGroup;

  @Output() save = new EventEmitter<UnidadeMedida>();
  @Output() cancel = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['unidadeMedida'] && this.unidadeMedida && this.form) {
      this.form.patchValue(this.unidadeMedida);
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
