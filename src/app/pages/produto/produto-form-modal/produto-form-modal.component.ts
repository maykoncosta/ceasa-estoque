import { Component, Input } from '@angular/core';
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
}
