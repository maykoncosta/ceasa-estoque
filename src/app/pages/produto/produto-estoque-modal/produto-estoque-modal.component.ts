import { Component, EventEmitter, Input, Output, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormControl, UntypedFormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Produto } from 'src/app/core/services/produto.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'app-produto-estoque-modal',
  templateUrl: './produto-estoque-modal.component.html',
  styleUrls: ['./produto-estoque-modal.component.css']
})
export class ProdutoEstoqueModalComponent implements OnInit, OnChanges {
  @Input() show = false;
  @Input() produto: Produto | null = null;  @Output() onSave = new EventEmitter<{ produto: Produto, ajuste: number }>();
  @Output() onCancel = new EventEmitter<void>();

  form!: UntypedFormGroup;

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(): void {
    if (this.show && this.produto) {
      this.initializeForm();
    }
  }

  initializeForm(): void {
    this.form = new UntypedFormGroup({
      ajuste: new UntypedFormControl(0, [Validators.required])
    });
  }

  onSubmit(): void {
    if (this.form.valid && this.produto) {
      const ajuste = this.form.get('ajuste')?.value || 0;
      
      this.onSave.emit({
        produto: this.produto,
        ajuste: ajuste
      });
    }
  }

  calcularNovoEstoque(): number {
    if (!this.produto) return 0;
    const ajuste = this.form.get('ajuste')?.value || 0;
    return this.produto.estoque + ajuste;
  }

  cancelar(): void {
    this.form.reset();
    this.onCancel.emit();
  }

  hasFieldError(field: string, error: string): boolean {
    const formField = this.form.get(field);
    return (formField?.hasError(error) && (formField.touched || formField.dirty)) || false;
  }
}
