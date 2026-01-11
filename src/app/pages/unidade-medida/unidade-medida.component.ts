import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, UntypedFormControl, UntypedFormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BaseComponent } from 'src/app/shared/components/base.component';
import { UnidadeMedida, UnidadeMedidaService } from 'src/app/core/services/unidade-medida.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';
import { UnidadeMedidaFormModalComponent } from './unidade-medida-form-modal/unidade-medida-form-modal.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ConfirmModalComponent, UnidadeMedidaFormModalComponent],
  selector: 'app-unidade-medida',
  templateUrl: './unidade-medida.component.html',
  styleUrls: ['./unidade-medida.component.css']
})
export class UnidadeMedidaComponent extends BaseComponent<UnidadeMedida> {
  showFormModal = false;
  selectedUnidadeMedida: UnidadeMedida | null = null;

  constructor(
    messageService: MessageService,
    loaderService: LoaderService,
    private unidadeService: UnidadeMedidaService
  ) {
    super(loaderService, messageService);
  }

  override initializePaginationConfig(): void {
    this.paginationConfig = { 
      pageSize: 10, 
      orderByField: 'nome' 
    };
    this.pageSize = this.paginationConfig.pageSize;
    this.pageSizeOptions = [5, 10, 20, 50];
  }

  override onLoadValues(): void {
    // Não há valores adicionais para carregar neste componente
  }

  // Implementação do método abstrato do BaseComponent para buscar itens paginados com suporte a busca
  override async buscarItensPaginados(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    searchTerm?: string
  ) {
    return this.unidadeService.buscarUnidadesPaginadas(pageSize, startAfterDoc, searchTerm);
  }

  // Método para listagem simples (sem paginação) - mantido para compatibilidade
  override listarItens(): void {
    this.unidadeService.listarUnidades().subscribe(data => {
      this.items = data;
      this.loaderService.closeLoading();
    });
  }
  override saveItem(): void {
    // Este método agora será chamado pelo modal com os dados do formulário
    // A lógica de salvamento será movida para saveUnidadeMedidaFromModal
  }

  // Método para lidar com a exclusão de unidades
  onDeleteItem(): void {
    this.deleteItem(() => this.unidadeService.excluirUnidade(this.itemToDelete!.id, this.itemToDelete!.nome));
  }
  // Métodos para gerenciar o modal de formulário
  openFormModal(isEdit: boolean, unidadeMedida?: UnidadeMedida): void {
    this.onEdit = isEdit;
    this.onCreate = !isEdit;
    this.selectedUnidadeMedida = unidadeMedida || null;
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.onEdit = false;
    this.onCreate = false;
    this.selectedUnidadeMedida = null;
    
    // Forçar o reset do item selecionado para limpar o formulário no próximo uso
    setTimeout(() => {
      this.selectedUnidadeMedida = null;
    }, 100);
  }

  // Sobrescrevendo os métodos do BaseComponent
  override onCreateItem(): void {
    this.openFormModal(false);
  }

  override onEditItem(item: UnidadeMedida): void {
    this.openFormModal(true, item);
  }

  override onCancel(): void {
    this.closeFormModal();
  }

  // Sobrescrevendo o método para salvar e controlar o modal
  override aposSalvar(): void {
    this.recarregarItensManterContexto(); // Mantém o contexto da busca e página atual
    this.closeFormModal();
    this.messageService.success();
  }
  // Método para salvar a unidade de medida do formulário modal
  saveUnidadeMedidaFromModal(unidadeMedida: UnidadeMedida): void {
    this.loaderService.showLoading();

    if (this.onEdit) {
      this.unidadeService.atualizarUnidade(unidadeMedida.id, unidadeMedida)
        .then(() => this.aposSalvar())
        .catch((error) => {
          this.messageService.error(error.message);
          this.loaderService.closeLoading();
        });
    } else {
      this.unidadeService.adicionarUnidade(unidadeMedida)
        .then(() => this.aposSalvar())
        .catch((error) => {
          this.messageService.error(error.message);
          this.loaderService.closeLoading();
        });
    }
  }
}
