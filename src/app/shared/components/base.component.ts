import { FormGroup, FormGroupDirective, UntypedFormGroup } from '@angular/forms';
import { LoaderService } from '../services/loader.service';
import { MessageService } from '../services/message.service';
import { Directive, OnInit } from '@angular/core';

@Directive()
export abstract class BaseComponent<T> implements OnInit {
    form!: UntypedFormGroup;
    onEdit: boolean = false;
    onCreate: boolean = false;
    showDeleteModal = false;
    itemToDelete: T | undefined;

    constructor(
        protected loaderService: LoaderService,
        protected messageService: MessageService
    ) { }

    ngOnInit(): void {
        this.initializeForm();
        this.loaderService.showLoading();
        this.listarItens();
        this.onLoadValues();
    }

    abstract initializeForm(): void;
    abstract listarItens(): void;
    abstract onLoadValues(): void;

    abstract saveItem(): void;
    
    onCreateItem(): void {
        this.onCreate = true;
        this.onEdit = false;
        this.form.reset();
    }

    onEditItem(item: any): void {
        this.onEdit = true;
        this.onCreate = false;
        this.form.patchValue(item);
    }

    showModalDelete(item: T): void {
        this.showDeleteModal = true;
        this.itemToDelete = item;
    }

    onCancel(): void {
        this.onEdit = false;
        this.onCreate = false;
        this.form.reset();
    }

    deleteItem(deleteCallback: () => Promise<void>): void {
        if (this.itemToDelete) {
            this.loaderService.showLoading();
            deleteCallback()
                .then(() => {
                    this.itemToDelete = undefined;
                    this.showDeleteModal = false;
                    this.messageService.success();
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
      }

}