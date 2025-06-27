import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Produto } from 'src/app/core/services/produto.service';

@Component({
  selector: 'app-produto-form-modal',
  templateUrl: './produto-form-modal.component.html',
  styleUrls: ['./produto-form-modal.component.css']
})
export class ProdutoFormModalComponent implements OnChanges {
  @Input() show = false;
  @Input() isEdit = false;
  @Input() produto: Produto | null = null;
  @Input() unidades: any[] = [];
  @Input() form!: UntypedFormGroup;

  @Output() save = new EventEmitter<Produto>();
  @Output() cancel = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['produto'] && this.produto && this.form) {
      this.form.patchValue(this.produto);
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
