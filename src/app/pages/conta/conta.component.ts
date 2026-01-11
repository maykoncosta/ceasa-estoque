import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { EmpresaService } from 'src/app/core/services/empresa.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';
import { 
  Empresa, 
  EstatisticasEmpresa, 
  ESTADOS_BRASIL, 
  CORES_PREDEFINIDAS 
} from 'src/app/shared/models/empresa.model';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';
import { UploadLogoComponent } from './upload-logo/upload-logo.component';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmModalComponent, UploadLogoComponent],
  selector: 'app-conta',
  templateUrl: './conta.component.html',
  styleUrls: ['./conta.component.css']
})
export class ContaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Forms
  empresaForm!: FormGroup;
  enderecoForm!: FormGroup;
  contatoForm!: FormGroup;
  configForm!: FormGroup;

  // Data
  empresa: Empresa | null = null;
  estadosBrasil = ESTADOS_BRASIL;
  coresPredefinidas = CORES_PREDEFINIDAS;

  // UI States
  loading = true;
  salvando = false;
  uploadingLogo = false;
  buscandoCep = false;
  
  // Modal states
  showConfirmModal = false;
  confirmModalConfig = {
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    action: () => {}
  };

  constructor(
    private fb: FormBuilder,
    private empresaService: EmpresaService,
    private loaderService: LoaderService,
    private messageService: MessageService
  ) {
    this.createForms();
  }

  ngOnInit(): void {
    this.loadEmpresa();
    this.setupFormWatchers(); // Reativado apenas para busca de CEP
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForms(): void {
    this.empresaForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      razao_social: ['', [Validators.required, Validators.minLength(3)]],
      cnpj: [''],
      ativo: [true]
    });

    this.enderecoForm = this.fb.group({
      cep: ['', [Validators.required, Validators.pattern(/^\d{5}-?\d{3}$/)]],
      rua: ['', Validators.required],
      numero: ['', Validators.required],
      complemento: [''],
      bairro: ['', Validators.required],
      cidade: ['', Validators.required],
      estado: ['', Validators.required]
    });

    this.contatoForm = this.fb.group({
      telefone: [''],
      celular: [''],
      email: ['', [Validators.required, Validators.email]],
      site: ['']
    });

    this.configForm = this.fb.group({
      cor_primaria: ['#3B82F6', Validators.required],
      cor_secundaria: ['#10B981', Validators.required],
      mostrar_logo_cupom: [true],
      formato_data: ['DD/MM/YYYY', Validators.required],
      moeda: ['BRL', Validators.required]
    });
  }

  private setupFormWatchers(): void {
    // Auto-save removido - agora usa salvamento manual
    
    // Manter apenas o watcher do CEP para busca automática
    this.enderecoForm.get('cep')?.valueChanges.pipe(
      debounceTime(800),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(cep => {
      if (cep && cep.length >= 8) {
        this.buscarEnderecoPorCep(cep);
      }
    });
  }

  private loadEmpresa(): void {
    this.loaderService.showLoading();
    
    this.empresaService.obterEmpresa().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (empresa) => {
        if (empresa) {
          this.empresa = empresa;
          this.populateForms(empresa);
        } else {
          this.initializeDefaultEmpresa();
        }
        this.loading = false;
        this.loaderService.closeLoading();
      },
      error: (error) => {
        console.error('Erro ao carregar empresa:', error);
        this.messageService.error('Erro ao carregar dados da empresa');
        this.loading = false;
        this.loaderService.closeLoading();
      }
    });
  }

  private populateForms(empresa: Empresa): void {
    this.empresaForm.patchValue({
      nome: empresa.nome,
      razao_social: empresa.razao_social,
      cnpj: empresa.cnpj,
      ativo: empresa.ativo
    });

    this.enderecoForm.patchValue(empresa.endereco);
    this.contatoForm.patchValue(empresa.contato);
    this.configForm.patchValue(empresa.configuracoes);
  }

  private async initializeDefaultEmpresa(): Promise<void> {
    try {
      await this.empresaService.inicializarEmpresaSeNecessario();
    } catch (error) {
      console.error('Erro ao inicializar empresa:', error);
      this.messageService.error('Erro ao inicializar dados da empresa');
    }
  }

  async saveEmpresaData(): Promise<void> {
    if (this.empresaForm.invalid || this.salvando) return;

    this.salvando = true;
    this.loaderService.showLoading();
    
    try {
      const formData = this.empresaForm.value;
      
      // Validar CNPJ se preenchido
      if (formData.cnpj && formData.cnpj.trim() !== '' && !this.empresaService.validarCNPJ(formData.cnpj)) {
        this.messageService.error('CNPJ inválido');
        this.salvando = false;
        this.loaderService.closeLoading();
        return;
      }

      // Limpar dados undefined/vazios
      const dadosLimpos = this.cleanObjectData(formData);

      await this.empresaService.atualizarEmpresa(dadosLimpos);

      this.messageService.success('Dados da empresa salvos com sucesso');
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      this.messageService.error('Erro ao salvar dados da empresa');
    } finally {
      this.salvando = false;
      this.loaderService.closeLoading();
    }
  }

  async saveEnderecoData(): Promise<void> {
    if (this.enderecoForm.invalid || this.salvando) return;

    this.salvando = true;
    this.loaderService.showLoading();
    
    try {
      const enderecoLimpo = this.cleanObjectData(this.enderecoForm.value);

      await this.empresaService.atualizarEmpresa({
        endereco: enderecoLimpo
      });

      this.messageService.success('Endereço salvo com sucesso');
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      this.messageService.error('Erro ao salvar endereço');
    } finally {
      this.salvando = false;
      this.loaderService.closeLoading();
    }
  }

  async saveContatoData(): Promise<void> {
    if (this.contatoForm.invalid || this.salvando) return;

    this.salvando = true;
    this.loaderService.showLoading();
    
    try {
      const contatoLimpo = this.cleanObjectData(this.contatoForm.value);

      await this.empresaService.atualizarEmpresa({
        contato: contatoLimpo
      });

      this.messageService.success('Contato salvo com sucesso');
    } catch (error) {
      console.error('Erro ao salvar contato:', error);
      this.messageService.error('Erro ao salvar contato');
    } finally {
      this.salvando = false;
      this.loaderService.closeLoading();
    }
  }

  async saveConfigData(): Promise<void> {
    if (this.configForm.invalid || this.salvando) return;

    this.salvando = true;
    this.loaderService.showLoading();
    
    try {
      const configLimpa = this.cleanObjectData(this.configForm.value);

      await this.empresaService.atualizarEmpresa({
        configuracoes: configLimpa
      });

      this.messageService.success('Configurações salvas com sucesso');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      this.messageService.error('Erro ao salvar configurações');
    } finally {
      this.salvando = false;
      this.loaderService.closeLoading();
    }
  }

  async buscarEnderecoPorCep(cep: string): Promise<void> {
    this.buscandoCep = true;
    this.loaderService.showLoading();
    
    try {
      const endereco = await this.empresaService.buscarEnderecoPorCep(cep);
      
      if (endereco) {
        this.enderecoForm.patchValue({
          rua: endereco.logradouro,
          bairro: endereco.bairro,
          cidade: endereco.localidade,
          estado: endereco.uf
        });
        this.messageService.success('Endereço encontrado com sucesso');
      } else {
        this.messageService.error('CEP não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      this.messageService.error('Erro ao buscar CEP');
    } finally {
      this.buscandoCep = false;
      this.loaderService.closeLoading();
    }
  }

  async onLogoSelected(file: File): Promise<void> {
    this.uploadingLogo = true;
    this.loaderService.showLoading();
    
    try {
      await this.empresaService.uploadLogo(file);
      this.messageService.success('Logo atualizada com sucesso');
    } catch (error: any) {
      console.error('Erro no upload:', error);
      this.messageService.error(error.message || 'Erro ao fazer upload da logo');
    } finally {
      this.uploadingLogo = false;
      this.loaderService.closeLoading();
    }
  }

  async onRemoveLogo(): Promise<void> {
    this.showConfirmation(
      'Remover Logo',
      'Tem certeza que deseja remover a logo da empresa? Esta ação não pode ser desfeita.',
      'Remover',
      'Cancelar',
      () => this.confirmRemoveLogo()
    );
  }

  private async confirmRemoveLogo(): Promise<void> {
    this.loaderService.showLoading();
    
    try {
      await this.empresaService.removerLogo();
      
      // Atualizar a empresa local para refletir a mudança imediatamente
      if (this.empresa) {
        this.empresa.logo_url = undefined;
      }
      
      this.messageService.success('Logo removida com sucesso');
    } catch (error: any) {
      console.error('Erro ao remover logo:', error);
      this.messageService.error(error.message || 'Erro ao remover logo');
    } finally {
      this.loaderService.closeLoading();
    }
  }

  // Métodos para controlar o modal de confirmação
  private showConfirmation(title: string, message: string, confirmText: string, cancelText: string, action: () => void): void {
    this.confirmModalConfig = {
      title,
      message,
      confirmText,
      cancelText,
      action
    };
    this.showConfirmModal = true;
  }

  onConfirmModalConfirm(): void {
    this.showConfirmModal = false;
    this.confirmModalConfig.action();
  }

  onConfirmModalCancel(): void {
    this.showConfirmModal = false;
  }

  // Método para confirmar limpeza de formulário
  confirmClearForm(formName: string): void {
    const formConfigs = {
      empresa: {
        title: 'Limpar Dados da Empresa',
        message: 'Tem certeza que deseja limpar todos os dados da empresa? Os dados não salvos serão perdidos.',
        action: () => this.clearEmpresaForm()
      },
      endereco: {
        title: 'Limpar Endereço', 
        message: 'Tem certeza que deseja limpar todos os dados do endereço? Os dados não salvos serão perdidos.',
        action: () => this.clearEnderecoForm()
      },
      contato: {
        title: 'Limpar Contato',
        message: 'Tem certeza que deseja limpar todos os dados de contato? Os dados não salvos serão perdidos.',
        action: () => this.clearContatoForm()
      }
    };

    const config = formConfigs[formName as keyof typeof formConfigs];
    if (config) {
      this.showConfirmation(
        config.title,
        config.message,
        'Limpar',
        'Cancelar',
        config.action
      );
    }
  }

  private clearEmpresaForm(): void {
    this.empresaForm.reset({
      nome: '',
      razao_social: '',
      cnpj: '',
      ativo: true
    });
    this.messageService.success('Formulário limpo');
  }

  private clearEnderecoForm(): void {
    this.enderecoForm.reset();
    this.messageService.success('Endereço limpo');
  }

  private clearContatoForm(): void {
    this.contatoForm.reset();
    this.messageService.success('Contato limpo');
  }

  // Método para sincronizar email da empresa com email de autenticação
  async sincronizarEmailAuth(): Promise<void> {
    try {
      const emailAuth = this.empresaService.getEmailAuth();
      
      if (!emailAuth) {
        this.messageService.error('Email de autenticação não encontrado');
        return;
      }

      // Atualizar o formulário
      this.contatoForm.patchValue({ email: emailAuth });
      
      // Informar ao usuário
      this.messageService.success(`Email sincronizado: ${emailAuth}`);
      
    } catch (error) {
      console.error('Erro ao sincronizar email:', error);
      this.messageService.error('Erro ao sincronizar email');
    }
  }

  formatarCNPJ(event: any): void {
    const value = event.target.value.replace(/\D/g, '');
    if (value.length <= 14) {
      event.target.value = this.empresaService.formatarCNPJ(value);
    }
  }

  formatarCEP(event: any): void {
    const value = event.target.value.replace(/\D/g, '');
    if (value.length <= 8) {
      event.target.value = this.empresaService.formatarCEP(value);
    }
  }

  selecionarCor(cor: string, tipo: 'primaria' | 'secundaria'): void {
    if (tipo === 'primaria') {
      this.configForm.patchValue({ cor_primaria: cor });
    } else {
      this.configForm.patchValue({ cor_secundaria: cor });
    }
  }

  /**
   * Remove campos undefined, null ou vazios de um objeto
   */
  private cleanObjectData(data: any): any {
    const cleanData: any = {};
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        if (typeof value === 'string') {
          if (value.trim() !== '') {
            cleanData[key] = value;
          }
        } else {
          cleanData[key] = value;
        }
      }
    });
    return cleanData;
  }

  // Getters para facilitar acesso nos templates
  get logoUrl(): string | null {
    return this.empresa?.logo_url || null;
  }

  get isFormValid(): boolean {
    return this.empresaForm.valid && 
           this.enderecoForm.valid && 
           this.contatoForm.valid && 
           this.configForm.valid;
  }
}
