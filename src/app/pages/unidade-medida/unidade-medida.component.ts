import { Component } from '@angular/core';
import { MessageService } from 'src/app/shared/services/message.service';

export interface UnidadeMedida {
  nome: string;
  descricao: string;
}

@Component({
  selector: 'app-unidade-medida',
  templateUrl: './unidade-medida.component.html',
  styleUrls: ['./unidade-medida.component.css']
})
export class UnidadeMedidaComponent {

  nome: string = '';
  descricao: string = '';
  unidades: any[] = [{ nome: 'KG', descricao: 'Quilo' }, { nome: 'CX', descricao: 'Caixa' }];
  itemToDelete: UnidadeMedida | any = undefined;
  showDeleteModal: boolean = false;

  constructor(private messageService: MessageService) { }

  async createUnidadeMedida() {
    let unidade: any = { nome: this.nome, descricao: this.descricao }
    if (this.nome?.length > 1 && this.descricao?.length > 1) {
      let unidadeExistente = this.unidades.filter(u => u.nome === this.nome);
      if(unidadeExistente) {
        this.messageService.error("Unidade de Medida já existente.")
      } else {
        this.unidades.push(unidade);
        this.nome = '';
        this.descricao = '';
        this.messageService.success();
      }
    } else {
      this.messageService.info("É Necessário preencher Nome e Descrição.")
    }
  }

  onDeleteItem(unidadeMedida: UnidadeMedida) {
    this.showDeleteModal = true;
    this.itemToDelete = unidadeMedida;
  }

  deleteItem() {
    if (this.itemToDelete) {
      this.unidades = this.unidades.filter(u => u.nome !== this.itemToDelete.nome);
      this.messageService.success();
      this.itemToDelete = undefined;
      this.showDeleteModal = false;
    }
  }
}
