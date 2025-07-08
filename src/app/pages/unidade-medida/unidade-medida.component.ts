import { Component } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { BaseComponent } from 'src/app/shared/components/base.component';
import { UnidadeMedida, UnidadeMedidaService } from 'src/app/core/services/unidade-medida.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';

@Component({
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
    if (this.form.invalid) {
      this.messageService.info("Preencha todos os campos obrigatórios corretamente.");
      return;
    }

    const unidade: UnidadeMedida = this.form.getRawValue();
    this.loaderService.showLoading();

    if (this.onEdit) {
      this.unidadeService.atualizarUnidade(unidade.id, unidade)
        .then(() => this.aposSalvar())
        .catch((error) => {
          this.messageService.error(error.message);
          this.loaderService.closeLoading();
        });
    } else {
      this.unidadeService.adicionarUnidade(unidade)
        .then(() => this.aposSalvar())
        .catch((error) => {
          this.messageService.error(error.message);
          this.loaderService.closeLoading();
        });
    }
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
    this.form.reset();
    
    if (isEdit && unidadeMedida) {
      this.form.patchValue(unidadeMedida);
    }
    
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.onEdit = false;
    this.onCreate = false;
    this.selectedUnidadeMedida = null;
    this.form.reset();
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
    this.listarItensPaginados(); // Usa a paginação por padrão
    this.closeFormModal();
    this.messageService.success();
  }

  // Método para salvar a unidade de medida do formulário modal
  saveUnidadeMedidaFromModal(unidadeMedida: UnidadeMedida): void {
    // Reutiliza a lógica existente
    this.saveItem();
  }
}
