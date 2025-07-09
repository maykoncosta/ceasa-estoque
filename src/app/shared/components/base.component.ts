import { FormGroup, FormGroupDirective } from '@angular/forms';
import { LoaderService } from '../services/loader.service';
import { MessageService } from '../services/message.service';
import { Directive, OnInit } from '@angular/core';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { PaginationConfig } from '../models/pagination.model';

@Directive()
export abstract class BaseComponent<T> implements OnInit {
    // Propriedades básicas
    onEdit: boolean = false;
    onCreate: boolean = false;
    showDeleteModal = false;
    itemToDelete: T | undefined;

    // Propriedades para paginação
    Math = Math; // Para usar no template
    items: T[] = [];
    pageSize: number = 10;
    currentPage: number = 1;
    totalItems: number = 0;
    totalPages: number = 0;
    pageSizeOptions: number[] = [5, 10, 20, 50];
    lastVisible?: QueryDocumentSnapshot<DocumentData>;
    pageHistory: QueryDocumentSnapshot<DocumentData>[] = [];
    paginationConfig: PaginationConfig = { pageSize: 10, orderByField: 'nome' };
    
    // Propriedades para busca
    searchTerm: string = '';

    constructor(
        protected loaderService: LoaderService,
        protected messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.initializePaginationConfig();
        this.loaderService.showLoading();
        this.listarItensPaginados();
        this.onLoadValues();
    }

    /**
     * Métodos abstratos que devem ser implementados pelas classes filhas
     */
        abstract listarItens(): void;  // Mantido para compatibilidade
    abstract onLoadValues(): void;
    abstract saveItem(): void;
    
    /**
     * Inicializa a configuração de paginação com valores padrão
     * As classes filhas podem sobrescrever para personalizar
     */
    initializePaginationConfig(): void {
        this.pageSize = this.paginationConfig.pageSize;
    }

    /**
     * Método que deve ser implementado pelas classes filhas para buscar itens paginados
     * @param pageSize Tamanho da página
     * @param startAfterDoc Documento a partir do qual buscar (para paginação)
     * @param searchTerm Termo de busca opcional
     */
    abstract buscarItensPaginados(
        pageSize: number, 
        startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
        searchTerm?: string
    ): Promise<{
        items: T[],
        total: number,
        lastVisible?: QueryDocumentSnapshot<DocumentData>
    }>;

    /**
     * Lista os itens com paginação
     */
    listarItensPaginados(): void {
        this.loaderService.showLoading();
        
        this.buscarItensPaginados(this.pageSize, undefined, this.searchTerm)
            .then(result => {
                this.items = result.items;
                this.totalItems = result.total;
                this.lastVisible = result.lastVisible;
                this.calcularTotalPaginas();
                
                // Resetar histórico de navegação ao carregar a primeira página
                this.pageHistory = [];
                this.currentPage = 1;
            })
            .catch(error => {
                console.error('Erro ao listar itens:', error);
                this.messageService.error('Erro ao listar itens');
            })
            .finally(() => {
                this.loaderService.closeLoading();
            });
    }

    /**
     * Realiza busca por termo
     * @param term Termo para busca
     */
    buscarPorTermo(term: string): void {
        this.searchTerm = term;
        this.listarItensPaginados();
    }

    /**
     * Limpa o termo de busca e recarrega os itens
     */
    limparBusca(): void {
        this.searchTerm = '';
        this.listarItensPaginados();
    }

    /**
     * Calcula o total de páginas com base no total de itens e tamanho da página
     */
    calcularTotalPaginas(): void {
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    }

    /**
     * Navega para a próxima página
     */
    proximaPagina(): void {
        if (this.currentPage < this.totalPages && this.lastVisible) {
            this.loaderService.showLoading();
            
            // Armazenar o documento atual no histórico para poder voltar
            if (this.lastVisible) {
                this.pageHistory.push(this.lastVisible);
            }
            
            this.buscarItensPaginados(this.pageSize, this.lastVisible, this.searchTerm)
                .then(result => {
                    this.items = result.items;
                    this.lastVisible = result.lastVisible;
                    this.currentPage++;
                })
                .catch(error => {
                    console.error('Erro ao carregar próxima página:', error);
                    this.messageService.error('Erro ao carregar próxima página');
                })
                .finally(() => {
                    this.loaderService.closeLoading();
                });
        }
    }

    /**
     * Navega para a página anterior
     */
    paginaAnterior(): void {
        if (this.currentPage > 1) {
            this.loaderService.showLoading();
            
            // Remover o último documento do histórico
            this.pageHistory.pop();
            this.currentPage--;
            
            // Se ainda estiver na primeira página, carregar sem startAfter
            if (this.currentPage === 1) {
                this.buscarItensPaginados(this.pageSize, undefined, this.searchTerm)
                    .then(result => {
                        this.items = result.items;
                        this.lastVisible = result.lastVisible;
                    })
                    .catch(error => {
                        console.error('Erro ao carregar página anterior:', error);
                        this.messageService.error('Erro ao carregar página anterior');
                    })
                    .finally(() => {
                        this.loaderService.closeLoading();
                    });
            } else {
                // Caso contrário, usar o documento anterior como startAfter
                const previousDoc = this.pageHistory[this.pageHistory.length - 1];
                this.buscarItensPaginados(this.pageSize, previousDoc, this.searchTerm)
                    .then(result => {
                        this.items = result.items;
                        this.lastVisible = result.lastVisible;
                    })
                    .catch(error => {
                        console.error('Erro ao carregar página anterior:', error);
                        this.messageService.error('Erro ao carregar página anterior');
                    })
                    .finally(() => {
                        this.loaderService.closeLoading();
                    });
            }
        }
    }

    /**
     * Navega para a primeira página
     */
    primeiraPagina(): void {
        this.listarItensPaginados();
    }

    /**
     * Altera o tamanho da página
     */
    alterarTamanhoPagina(event: Event): void {
        const selectElement = event.target as HTMLSelectElement;
        if (selectElement) {
            this.pageSize = Number(selectElement.value);
            this.paginationConfig.pageSize = this.pageSize;
            // Reiniciar a paginação com o novo tamanho
            this.listarItensPaginados();
        }
    }    // Métodos existentes do BaseComponent
    onCreateItem(): void {
        this.onCreate = true;
        this.onEdit = false;
    }

    onEditItem(item: any): void {
        this.onEdit = true;
        this.onCreate = false;
    }

    showModalDelete(item: T): void {
        this.showDeleteModal = true;
        this.itemToDelete = item;
    }

    onCancel(): void {
        this.onEdit = false;
        this.onCreate = false;
    }

    deleteItem(deleteCallback: () => Promise<void>): void {
        if (this.itemToDelete) {
            this.loaderService.showLoading();
            deleteCallback()
                .then(() => {
                    this.itemToDelete = undefined;
                    this.showDeleteModal = false;
                    this.messageService.success();
                    
                    // Atualizar a lista após exclusão
                    this.listarItensPaginados();
                })
                .catch(() => {
                    this.messageService.error();
                })
                .finally(() => {
                    this.loaderService.closeLoading();
                });
        }
    }

    public hasFieldError(formGroup: FormGroup, field: string, error: string, frmDirective: FormGroupDirective): boolean {
        return formGroup.controls[field].hasError(error)
            && !formGroup.valid
            && (formGroup.touched || formGroup.controls[field].touched || frmDirective.submitted);
    }    // Método para compatibilidade com implementações existentes
    aposSalvar(): void {
        this.listarItensPaginados();
        this.onCreate = false;
        this.onEdit = false;
        this.messageService.success();
    }
}