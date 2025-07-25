import { TestBed } from '@angular/core/testing';
import { EmpresaService } from './empresa.service';
import { AuthService } from './auth.service';
import { Firestore } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';
import { of } from 'rxjs';

describe('EmpresaService', () => {
  let service: EmpresaService;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let firestoreSpy: jasmine.SpyObj<Firestore>;
  let storageSpy: jasmine.SpyObj<Storage>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser'], {
      currentUser$: of({ uid: 'test-uid', email: 'test@test.com' })
    });
    const firestoreSpyObj = jasmine.createSpyObj('Firestore', ['doc', 'collection']);
    const storageSpyObj = jasmine.createSpyObj('Storage', ['ref']);

    TestBed.configureTestingModule({
      providers: [
        EmpresaService,
        { provide: AuthService, useValue: authSpy },
        { provide: Firestore, useValue: firestoreSpyObj },
        { provide: Storage, useValue: storageSpyObj }
      ]
    });
    
    service = TestBed.inject(EmpresaService);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    firestoreSpy = TestBed.inject(Firestore) as jasmine.SpyObj<Firestore>;
    storageSpy = TestBed.inject(Storage) as jasmine.SpyObj<Storage>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validarCNPJ', () => {
    it('should return true for empty CNPJ (optional field)', () => {
      expect(service.validarCNPJ('')).toBeTruthy();
    });

    it('should return false for invalid CNPJ format', () => {
      expect(service.validarCNPJ('123')).toBeFalsy();
      expect(service.validarCNPJ('11111111111111')).toBeFalsy();
    });

    it('should return true for valid CNPJ', () => {
      expect(service.validarCNPJ('11.222.333/0001-81')).toBeTruthy();
    });
  });

  describe('formatarCNPJ', () => {
    it('should format CNPJ correctly', () => {
      const cnpj = '11222333000181';
      const formatted = service.formatarCNPJ(cnpj);
      expect(formatted).toBe('11.222.333/0001-81');
    });
  });

  describe('formatarCEP', () => {
    it('should format CEP correctly', () => {
      const cep = '12345678';
      const formatted = service.formatarCEP(cep);
      expect(formatted).toBe('12345-678');
    });
  });

  describe('buscarEnderecoPorCep', () => {
    it('should throw error for invalid CEP length', async () => {
      try {
        await service.buscarEnderecoPorCep('123');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('CEP deve conter 8 dígitos');
      }
    });
  });
});
