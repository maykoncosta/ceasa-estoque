import { Component, OnInit } from '@angular/core';
import { UnidadeMedida, UnidadeMedidaService } from 'src/app/core/services/unidade-medida.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';

@Component({
  selector: 'app-unidade-medida',
  templateUrl: './unidade-medida.component.html',
  styleUrls: ['./unidade-medida.component.css']
})
export class UnidadeMedidaComponent implements OnInit {

  nome: string = '';
  descricao: string = '';
  unidades: UnidadeMedida[] = [];
  itemToDelete: UnidadeMedida | any = undefined;
  showDeleteModal: boolean = false;

  constructor(
    private messageService: MessageService,
    private unidadeService: UnidadeMedidaService,
    private loaderService: LoaderService
  ) { }
  ngOnInit(): void {
    this.loaderService.showLoading();
    this.listarUnidades();
  }

  listarUnidades() {
    this.unidadeService.listarUnidades().subscribe(data => {
      this.unidades = data;
      this.loaderService.closeLoading();
    });
  }

  async createUnidadeMedida() {
    let unidade: any = { nome: this.nome, descricao: this.descricao }
    if (this.nome?.length > 1 && this.descricao?.length > 1) {
      this.loaderService.showLoading();
      this.unidadeService.adicionarUnidade(unidade).then((u) => {
        this.nome = '';
        this.descricao = '';
        this.messageService.success();
      }).catch((error => {
        this.messageService.error(error.message);
        this.loaderService.closeLoading();
      }))
    }
  }

  onDeleteItem(unidadeMedida: UnidadeMedida) {
    this.showDeleteModal = true;
    this.itemToDelete = unidadeMedida;
  }

  deleteItem() {
    if (this.itemToDelete) {
      this.loaderService.showLoading();
      this.unidadeService.excluirUnidade(this.itemToDelete.id, this.itemToDelete.nome).then(() => {
        this.showDeleteModal = false;
        this.itemToDelete = undefined;
        this.messageService.success();
        this.listarUnidades();
      }).catch(error => {
        this.messageService.error(error.message);
        this.loaderService.closeLoading();
      })
    }
  }

  limparCampos(){
    this.nome = '';
    this.descricao = '';
  }
}
