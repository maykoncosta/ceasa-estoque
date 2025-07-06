import { Component } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from 'src/app/shared/components/base.component';
import { Cliente, ClienteService } from 'src/app/core/services/cliente.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';
import { PhoneValidatorService } from 'src/app/shared/services/phone-validator.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';

@Component({
  selector: 'app-cliente',
  templateUrl: './cliente.component.html',
  styleUrls: ['./cliente.component.css']
})
export class ClienteComponent extends BaseComponent<Cliente> {
  showFormModal = false;
  selectedCliente: Cliente | null = null;
  
  // Filtros específicos
  filtroAtivo: string | null = null;
  clientesFrequentesNomes: string[] = [];

  constructor(
    messageService: MessageService,
    loaderService: LoaderService,
    private clienteService: ClienteService,
    private phoneValidator: PhoneValidatorService,
    private route: ActivatedRoute
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

  override initializeForm(): void {
    this.form = new UntypedFormGroup({
      id: new UntypedFormControl({ value: '', disabled: true }),
      nome: new UntypedFormControl(undefined, Validators.compose([Validators.required, Validators.maxLength(50)])),
      celular: new UntypedFormControl(undefined, Validators.compose([
        Validators.required, 
        Validators.maxLength(20),
        this.phoneValidator.celularBrasileiroValidator()
      ])),
    });
  }

  // Implementação do método abstrato do BaseComponent para buscar itens paginados com suporte a busca
  override async buscarItensPaginados(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    searchTerm?: string
  ) {
    // Se há filtro de clientes frequentes ativo, usar o método específico
    if (this.filtroAtivo === 'frequentes' && this.clientesFrequentesNomes.length > 0) {
      return this.clienteService.buscarClientesFrequentesPaginados(
        pageSize, 
        startAfterDoc, 
        this.clientesFrequentesNomes
      );
    }
    
    // Caso contrário, usar o método padrão
    return this.clienteService.buscarClientesPaginadas(pageSize, startAfterDoc, searchTerm);
  }

  // Método para listagem simples (sem paginação) - mantido para compatibilidade
  override listarItens(): void {
    this.clienteService.listarClientes().subscribe(data => {
      this.items = data;
      this.loaderService.closeLoading();
    });
  }

  override saveItem(): void {
    if (this.form.invalid) {
      this.messageService.info("Preencha todos os campos obrigatórios corretamente.");
      return;
    }

    const cliente: Cliente = this.form.getRawValue();
    this.loaderService.showLoading();

    if (this.onEdit) {
      this.clienteService.atualizarCliente(cliente.id, cliente)
        .then(() => this.aposSalvar())
        .catch((error) => {
          this.messageService.error(error.message);
          this.loaderService.closeLoading();
        });
    } else {
      this.clienteService.adicionarCliente(cliente)
        .then(() => this.aposSalvar())
        .catch((error) => {
          this.messageService.error(error.message);
          this.loaderService.closeLoading();
        });
    }
  }

  // Método para lidar com a exclusão de clientes
  onDeleteItem(): void {
    this.deleteItem(() => this.clienteService.excluirCliente(this.itemToDelete!.id, this.itemToDelete!.nome));
  }

  // Métodos para gerenciar o modal de formulário
  openFormModal(isEdit: boolean, cliente?: Cliente): void {
    this.onEdit = isEdit;
    this.onCreate = !isEdit;
    this.selectedCliente = cliente || null;
    this.form.reset();
    
    if (isEdit && cliente) {
      // Formatar o celular para exibição no formulário
      const clienteFormatado = {
        ...cliente,
        celular: this.formatarCelular(cliente.celular)
      };
      this.form.patchValue(clienteFormatado);
    }
    
    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.onEdit = false;
    this.onCreate = false;
    this.selectedCliente = null;
    this.form.reset();
  }

  // Sobrescrevendo os métodos do BaseComponent
  override onCreateItem(): void {
    this.openFormModal(false);
  }

  override onEditItem(item: Cliente): void {
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

  // Método para salvar o cliente do formulário modal
  saveClienteFromModal(cliente: Cliente): void {
    // Reutiliza a lógica existente
    this.saveItem();
  }

  // Método para formatar celular na exibição
  formatarCelular(celular: string): string {
    return this.phoneValidator.formatarParaExibicao(celular);
  }

  override ngOnInit(): void {
    // Verificar se há query parameters de filtro
    this.route.queryParams.subscribe(params => {
      this.filtroAtivo = params['filtro'] || null;
      
      // Se há filtro de clientes frequentes, extrair a lista de nomes
      if (this.filtroAtivo === 'frequentes' && params['clientes']) {
        try {
          this.clientesFrequentesNomes = JSON.parse(decodeURIComponent(params['clientes']));
        } catch (e) {
          console.error('Erro ao parsear lista de clientes frequentes:', e);
          this.clientesFrequentesNomes = [];
        }
      }
    });

    // Chamar o ngOnInit da classe pai
    super.ngOnInit();
  }

  limparFiltros(): void {
    this.filtroAtivo = null;
    this.clientesFrequentesNomes = [];
    // Recarregar dados sem filtros
    this.listarItensPaginados();
  }
}
