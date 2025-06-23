import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormGroup, FormsModule, FormGroupDirective } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { ProdutoComponent } from './produto.component';
import { ProdutoService, Produto } from 'src/app/core/services/produto.service';
import { UnidadeMedidaService, UnidadeMedida } from 'src/app/core/services/unidade-medida.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';
import { Auth } from '@angular/fire/auth';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';
import { By } from '@angular/platform-browser';

describe('ProdutoComponent', () => {
  let component: ProdutoComponent;
  let fixture: ComponentFixture<ProdutoComponent>;
  let produtoServiceSpy: jasmine.SpyObj<ProdutoService>;
  let unidadeMedidaServiceSpy: jasmine.SpyObj<UnidadeMedidaService>;
  let loaderServiceSpy: jasmine.SpyObj<LoaderService>;
  let messageServiceSpy: jasmine.SpyObj<MessageService>;
  let formGroupDirectiveMock: jasmine.SpyObj<FormGroupDirective>;

  const mockUnidades: UnidadeMedida[] = [
    { id: '1', nome: 'Kg', descricao: 'Quilograma', empresa_id: 'emp1' },
    { id: '2', nome: 'Unidade', descricao: 'Unidade', empresa_id: 'emp1' }
  ];

  const mockProdutos: Produto[] = [
    { 
      id: '1', 
      nome: 'Produto 1', 
      preco_compra: 10, 
      preco_venda: 20, 
      estoque: 100, 
      empresa_id: 'emp1', 
      unidadeMedida: mockUnidades[0]
    },
    { 
      id: '2', 
      nome: 'Produto 2', 
      preco_compra: 15, 
      preco_venda: 30, 
      estoque: 50, 
      empresa_id: 'emp1', 
      unidadeMedida: mockUnidades[1]
    }
  ];

  const authMock = {
    currentUser: { uid: 'emp1' }
  };

  // Helper function para configurar valores válidos no formulário
  function setupFormWithValidValues(isEditing = false): any {
    const baseValues = {
      nome: isEditing ? 'Produto Editado' : 'Novo Produto',
      estoque: 50,
      preco_compra: 10,
      preco_venda: 20,
      unidadeMedida: mockUnidades[0]
    };

    if (isEditing) {
      Object.assign(baseValues, { id: '1' });
    }

    component.form.patchValue(baseValues);
    component.onCreate = !isEditing;
    component.onEdit = isEditing;

    return baseValues;
  }

  // Helper function para verificar mensagens e estados após salvar
  function verifySuccessState() {
    expect(messageServiceSpy.success).toHaveBeenCalled();
    expect(component.onCreate).toBeFalse();
    expect(component.onEdit).toBeFalse();
  }

  // Helper function para verificar estado de erro
  function verifyErrorState() {
    expect(messageServiceSpy.error).toHaveBeenCalled();
    expect(loaderServiceSpy.closeLoading).toHaveBeenCalled();
  }

  beforeEach(async () => {
    // Create spies for services
    produtoServiceSpy = jasmine.createSpyObj('ProdutoService', [
      'listarProdutos', 'adicionarProduto', 'atualizarProduto', 'excluirProduto'
    ]);
    
    unidadeMedidaServiceSpy = jasmine.createSpyObj('UnidadeMedidaService', ['listarUnidades']);
    loaderServiceSpy = jasmine.createSpyObj('LoaderService', ['showLoading', 'closeLoading']);
    messageServiceSpy = jasmine.createSpyObj('MessageService', ['success', 'error', 'info']);
    formGroupDirectiveMock = jasmine.createSpyObj('FormGroupDirective', [], { submitted: true });

    // Configure default responses
    produtoServiceSpy.listarProdutos.and.returnValue(of(mockProdutos));
    unidadeMedidaServiceSpy.listarUnidades.and.returnValue(of(mockUnidades));
    
    await TestBed.configureTestingModule({
      declarations: [
        ProdutoComponent,
        ConfirmModalComponent
      ],
      imports: [
        ReactiveFormsModule,
        FormsModule
      ],
      providers: [
        { provide: ProdutoService, useValue: produtoServiceSpy },
        { provide: UnidadeMedidaService, useValue: unidadeMedidaServiceSpy },
        { provide: LoaderService, useValue: loaderServiceSpy },
        { provide: MessageService, useValue: messageServiceSpy },
        { provide: Auth, useValue: authMock }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProdutoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form initialization', () => {
    it('should initialize form with correct validators', () => {
      expect(component.form).toBeTruthy();
      expect(component.form.get('id')).toBeTruthy();
      expect(component.form.get('nome')).toBeTruthy();
      expect(component.form.get('estoque')).toBeTruthy();
      expect(component.form.get('preco_compra')).toBeTruthy();
      expect(component.form.get('preco_venda')).toBeTruthy();
      expect(component.form.get('unidadeMedida')).toBeTruthy();
      
      // Check validators
      const nomeControl = component.form.get('nome');
      expect(nomeControl?.hasValidator).toBeTruthy();
      expect(nomeControl?.errors?.['required']).toBeTruthy();

      const estoqueControl = component.form.get('estoque');
      expect(estoqueControl?.hasValidator).toBeTruthy();
      expect(estoqueControl?.errors?.['required']).toBeTruthy();

      const precoCompraControl = component.form.get('preco_compra');
      expect(precoCompraControl?.hasValidator).toBeTruthy();
      expect(precoCompraControl?.errors?.['required']).toBeTruthy();

      const precoVendaControl = component.form.get('preco_venda');
      expect(precoVendaControl?.hasValidator).toBeTruthy();
      expect(precoVendaControl?.errors?.['required']).toBeTruthy();

      const unidadeMedidaControl = component.form.get('unidadeMedida');
      expect(unidadeMedidaControl?.hasValidator).toBeTruthy();
      expect(unidadeMedidaControl?.errors?.['required']).toBeTruthy();
    });
  });

  describe('ngOnInit', () => {
    it('should call necessary methods on initialization', () => {
      // Reset the spies and recreate the component to test ngOnInit
      loaderServiceSpy.showLoading.calls.reset();
      
      // Create spy on component methods
      spyOn(component, 'listarItens');
      spyOn(component, 'onLoadValues');
      spyOn(component, 'initializeForm');
      
      component.ngOnInit();
      
      expect(component.initializeForm).toHaveBeenCalled();
      expect(loaderServiceSpy.showLoading).toHaveBeenCalled();
      expect(component.listarItens).toHaveBeenCalled();
      expect(component.onLoadValues).toHaveBeenCalled();
    });
  });

  describe('listarItens', () => {
    it('should call the service and update produtos', () => {
      produtoServiceSpy.listarProdutos.calls.reset();
      loaderServiceSpy.closeLoading.calls.reset();
      
      component.listarItens();
      
      expect(produtoServiceSpy.listarProdutos).toHaveBeenCalled();
      expect(component.produtos).toEqual(mockProdutos);
      expect(loaderServiceSpy.closeLoading).toHaveBeenCalled();
    });
  });

  describe('onLoadValues', () => {
    it('should load unidades de medida', () => {
      unidadeMedidaServiceSpy.listarUnidades.calls.reset();
      
      component.onLoadValues();
      
      expect(unidadeMedidaServiceSpy.listarUnidades).toHaveBeenCalled();
      expect(component.unidades).toEqual(mockUnidades);
    });
  });

  describe('saveItem', () => {
    it('should show error message when form is invalid', () => {
      component.form.setErrors({ 'invalid': true });
      component.saveItem();
      
      expect(messageServiceSpy.info).toHaveBeenCalledWith('Preencha todos os campos obrigatórios corretamente.');
      expect(produtoServiceSpy.adicionarProduto).not.toHaveBeenCalled();
      expect(produtoServiceSpy.atualizarProduto).not.toHaveBeenCalled();
    });

    it('should call adicionarProduto when creating a new product', fakeAsync(() => {
      const formValues = setupFormWithValidValues(false);
      produtoServiceSpy.adicionarProduto.and.returnValue(Promise.resolve() as any);
      
      component.saveItem();
      
      expect(loaderServiceSpy.showLoading).toHaveBeenCalled();
      expect(produtoServiceSpy.adicionarProduto).toHaveBeenCalled();
      
      tick();
      
      verifySuccessState();
    }));

    it('should call atualizarProduto when editing a product', fakeAsync(() => {
      const formValues = setupFormWithValidValues(true);
      produtoServiceSpy.atualizarProduto.and.returnValue(Promise.resolve());
      
      component.saveItem();
      
      expect(loaderServiceSpy.showLoading).toHaveBeenCalled();
      expect(produtoServiceSpy.atualizarProduto).toHaveBeenCalledWith('1', jasmine.objectContaining({
        id: '1',
        nome: 'Produto Editado',
        estoque: 50,
        preco_compra: 10,
        preco_venda: 20,
        unidadeMedida: mockUnidades[0]
      }));
      
      tick();
      
      verifySuccessState();
    }));

    // Testes parametrizados para cenários de erro
    const errorScenarios = [
      { 
        desc: 'adding product fails', 
        isEdit: false,
        setupMock: () => produtoServiceSpy.adicionarProduto.and.returnValue(Promise.reject() as any)
      },
      { 
        desc: 'updating product fails', 
        isEdit: true,
        setupMock: () => produtoServiceSpy.atualizarProduto.and.returnValue(Promise.reject())
      }
    ];

    errorScenarios.forEach(scenario => {
      it(`should handle error when ${scenario.desc}`, fakeAsync(() => {
        setupFormWithValidValues(scenario.isEdit);
        scenario.setupMock();
        
        component.saveItem();
        
        tick();
        
        verifyErrorState();
      }));
    });

    it('should handle case when user is not authenticated during add', () => {
      setupFormWithValidValues(false);
      produtoServiceSpy.adicionarProduto.and.returnValue(undefined);
      
      component.saveItem();
      
      expect(messageServiceSpy.error).toHaveBeenCalledWith('Erro ao adicionar produto. Usuário não autenticado.');
      expect(loaderServiceSpy.closeLoading).toHaveBeenCalled();
    });
  });

  describe('onDeleteItem', () => {
    it('should delete the item when confirmed', fakeAsync(() => {
      component.itemToDelete = mockProdutos[0];
      component.showDeleteModal = true;
      
      produtoServiceSpy.excluirProduto.and.returnValue(Promise.resolve());
      
      component.onDeleteItem();
      
      expect(loaderServiceSpy.showLoading).toHaveBeenCalled();
      expect(produtoServiceSpy.excluirProduto).toHaveBeenCalledWith('1');
      
      tick();
      
      expect(messageServiceSpy.success).toHaveBeenCalled();
      expect(component.showDeleteModal).toBeFalse();
      expect(component.itemToDelete).toBeUndefined();
    }));

    it('should handle error when deleting product fails', fakeAsync(() => {
      component.itemToDelete = mockProdutos[0];
      component.showDeleteModal = true;
      
      produtoServiceSpy.excluirProduto.and.returnValue(Promise.reject());
      
      component.onDeleteItem();
      
      tick();
      
      verifyErrorState();
    }));
  });

  describe('Base component methods', () => {
    const baseMethodTests = [
      {
        name: 'onCreateItem',
        action: () => component.onCreateItem(),
        expectations: () => {
          expect(component.onCreate).toBeTrue();
          expect(component.onEdit).toBeFalse();
          expect(component.form.reset).toHaveBeenCalled();
        },
        setup: () => spyOn(component.form, 'reset')
      },
      {
        name: 'onEditItem',
        action: () => component.onEditItem(mockProdutos[0]),
        expectations: () => {
          expect(component.onEdit).toBeTrue();
          expect(component.onCreate).toBeFalse();
          expect(component.form.patchValue).toHaveBeenCalledWith(mockProdutos[0]);
        },
        setup: () => spyOn(component.form, 'patchValue')
      },
      {
        name: 'onCancel',
        action: () => {
          component.onCreate = true;
          component.onEdit = true;
          component.onCancel();
        },
        expectations: () => {
          expect(component.onEdit).toBeFalse();
          expect(component.onCreate).toBeFalse();
          expect(component.form.reset).toHaveBeenCalled();
        },
        setup: () => spyOn(component.form, 'reset')
      },
      {
        name: 'showModalDelete',
        action: () => component.showModalDelete(mockProdutos[0]),
        expectations: () => {
          expect(component.showDeleteModal).toBeTrue();
          expect(component.itemToDelete).toEqual(mockProdutos[0]);
        },
        setup: () => {}
      }
    ];

    baseMethodTests.forEach(test => {
      it(`should handle ${test.name} correctly`, () => {
        test.setup();
        test.action();
        test.expectations();
      });
    });
  });

  describe('Form validation', () => {
    it('hasFieldError should correctly identify field errors', () => {
      const formGroup = component.form as UntypedFormGroup;

      // Simulate a touched field with required error
      formGroup.controls['nome'].setValue('');
      formGroup.controls['nome'].markAsTouched();
      formGroup.controls['nome'].setErrors({ required: true });
      
      expect(component.hasFieldError(formGroup, 'nome', 'required', formGroupDirectiveMock)).toBeTrue();
      
      // Field with no errors
      formGroup.controls['nome'].setValue('Produto Teste');
      formGroup.controls['nome'].setErrors(null);
      
      expect(component.hasFieldError(formGroup, 'nome', 'required', formGroupDirectiveMock)).toBeFalse();
      
      // Different error type
      formGroup.controls['nome'].setErrors({ maxlength: true });
      
      expect(component.hasFieldError(formGroup, 'nome', 'required', formGroupDirectiveMock)).toBeFalse();
      expect(component.hasFieldError(formGroup, 'nome', 'maxlength', formGroupDirectiveMock)).toBeTrue();
    });
  });

  describe('aposSalvar', () => {
    it('should reset state and call listarItens', () => {
      spyOn(component, 'listarItens');
      component.onCreate = true;
      component.onEdit = true;
      spyOn(component.form, 'reset');
      
      component.aposSalvar();
      
      expect(component.listarItens).toHaveBeenCalled();
      expect(component.onCreate).toBeFalse();
      expect(component.onEdit).toBeFalse();
      expect(component.form.reset).toHaveBeenCalled();
      expect(messageServiceSpy.success).toHaveBeenCalled();
    });
  });

  describe('UI interaction', () => {
    const uiInteractionTests = [
      {
        name: 'show add form when create button is clicked',
        action: () => {
          component.onCreateItem();
          fixture.detectChanges();
        },
        expectations: () => {
          const formElement = fixture.nativeElement.querySelector('form');
          expect(formElement).toBeTruthy();
          expect(component.onCreate).toBeTrue();
        }
      },
      {
        name: 'show edit form when edit button is clicked',
        action: () => {
          component.onEditItem(mockProdutos[0]);
          fixture.detectChanges();
        },
        expectations: () => {
          const formElement = fixture.nativeElement.querySelector('form');
          expect(formElement).toBeTruthy();
          expect(component.onEdit).toBeTrue();
        }
      },
      {
        name: 'show delete modal when delete button is clicked',
        action: () => {
          component.showModalDelete(mockProdutos[0]);
          fixture.detectChanges();
        },
        expectations: () => {
          expect(component.showDeleteModal).toBeTrue();
          expect(component.itemToDelete).toEqual(mockProdutos[0]);
        }
      }
    ];

    uiInteractionTests.forEach(test => {
      it(`should ${test.name}`, () => {
        test.action();
        test.expectations();
      });
    });

    it('should validate form fields correctly', () => {
      component.onCreateItem();
      fixture.detectChanges();
      
      // Try to submit an empty form
      const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');
      submitButton.click();
      fixture.detectChanges();
      
      // Should show validation errors
      expect(messageServiceSpy.info).toHaveBeenCalledWith("Preencha todos os campos obrigatórios corretamente.");
      
      // Fill the form with valid data
      setupFormWithValidValues(false);
      fixture.detectChanges();
      
      expect(component.form.valid).toBeTrue();
    });
  });
});
