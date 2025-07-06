import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { PhoneValidatorService } from './phone-validator.service';

describe('PhoneValidatorService', () => {
  let service: PhoneValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PhoneValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('formatarCelular', () => {
    it('should format cellular number correctly', () => {
      expect(service.formatarCelular('11999887766')).toBe('(11) 99988-7766');
      expect(service.formatarCelular('1199988776')).toBe('(11) 9998-8776');
      expect(service.formatarCelular('119998')).toBe('(11) 9998');
      expect(service.formatarCelular('11')).toBe('(11');
      expect(service.formatarCelular('')).toBe('');
    });

    it('should remove non-numeric characters', () => {
      expect(service.formatarCelular('(11) 99988-7766')).toBe('(11) 99988-7766');
      expect(service.formatarCelular('11 99988-7766')).toBe('(11) 99988-7766');
      expect(service.formatarCelular('11.99988.7766')).toBe('(11) 99988-7766');
    });

    it('should limit to 11 digits', () => {
      expect(service.formatarCelular('119998877661234')).toBe('(11) 99988-7766');
    });
  });

  describe('limparCelular', () => {
    it('should remove all non-numeric characters', () => {
      expect(service.limparCelular('(11) 99988-7766')).toBe('11999887766');
      expect(service.limparCelular('11 99988-7766')).toBe('11999887766');
      expect(service.limparCelular('11.99988.7766')).toBe('11999887766');
      expect(service.limparCelular('')).toBe('');
    });
  });

  describe('formatarParaExibicao', () => {
    it('should format 11-digit number for display', () => {
      expect(service.formatarParaExibicao('11999887766')).toBe('(11) 99988-7766');
    });

    it('should format 10-digit number for display', () => {
      expect(service.formatarParaExibicao('1139887766')).toBe('(11) 3988-7766');
    });

    it('should return original if cannot format', () => {
      expect(service.formatarParaExibicao('123')).toBe('123');
      expect(service.formatarParaExibicao('')).toBe('');
    });
  });

  describe('celularBrasileiroValidator', () => {
    let validator: any;

    beforeEach(() => {
      validator = service.celularBrasileiroValidator();
    });

    it('should return null for valid cellular numbers', () => {
      expect(validator(new FormControl('(11) 99988-7766'))).toBeNull();
      expect(validator(new FormControl('11999887766'))).toBeNull();
      expect(validator(new FormControl('(21) 98765-4321'))).toBeNull();
    });

    it('should return null for empty value', () => {
      expect(validator(new FormControl(''))).toBeNull();
      expect(validator(new FormControl(null))).toBeNull();
    });

    it('should return error for invalid length', () => {
      expect(validator(new FormControl('119'))).toEqual({ celularInvalido: true });
      expect(validator(new FormControl('119999999999'))).toEqual({ celularInvalido: true });
    });

    it('should return error for invalid DDD', () => {
      expect(validator(new FormControl('09999887766'))).toEqual({ dddInvalido: true });
      expect(validator(new FormControl('10999887766'))).toEqual({ dddInvalido: true });
    });

    it('should return error for cellular without 9th digit being 9', () => {
      expect(validator(new FormControl('11899887766'))).toEqual({ formatoCelularInvalido: true });
      expect(validator(new FormControl('11799887766'))).toEqual({ formatoCelularInvalido: true });
    });

    it('should accept 10-digit numbers (old format)', () => {
      expect(validator(new FormControl('1139887766'))).toBeNull();
    });
  });

  describe('telefoneFixoBrasileiroValidator', () => {
    let validator: any;

    beforeEach(() => {
      validator = service.telefoneFixoBrasileiroValidator();
    });

    it('should return null for valid landline numbers', () => {
      expect(validator(new FormControl('(11) 3988-7766'))).toBeNull();
      expect(validator(new FormControl('1139887766'))).toBeNull();
    });

    it('should return error for invalid length', () => {
      expect(validator(new FormControl('113988776'))).toEqual({ telefoneFixoInvalido: true });
      expect(validator(new FormControl('113988776611'))).toEqual({ telefoneFixoInvalido: true });
    });

    it('should return error for invalid DDD', () => {
      expect(validator(new FormControl('0939887766'))).toEqual({ dddInvalido: true });
    });

    it('should return error for invalid first digit', () => {
      expect(validator(new FormControl('1109887766'))).toEqual({ formatoTelefoneInvalido: true });
      expect(validator(new FormControl('1119887766'))).toEqual({ formatoTelefoneInvalido: true });
      expect(validator(new FormControl('1199887766'))).toEqual({ formatoTelefoneInvalido: true });
    });
  });

  describe('detectarTipoTelefone', () => {
    it('should detect cellular numbers correctly', () => {
      expect(service.detectarTipoTelefone('11999887766')).toBe('celular');
      expect(service.detectarTipoTelefone('21987654321')).toBe('celular');
    });

    it('should detect landline numbers correctly', () => {
      expect(service.detectarTipoTelefone('1139887766')).toBe('fixo');
      expect(service.detectarTipoTelefone('2133334444')).toBe('fixo');
    });

    it('should detect invalid numbers', () => {
      expect(service.detectarTipoTelefone('123')).toBe('invalido');
      expect(service.detectarTipoTelefone('1199887766123')).toBe('invalido');
      expect(service.detectarTipoTelefone('1189887766')).toBe('invalido'); // 10 digits with 9
    });
  });

  describe('formatarTelefoneFixo', () => {
    it('should format landline number correctly', () => {
      expect(service.formatarTelefoneFixo('1139887766')).toBe('(11) 3988-7766');
      expect(service.formatarTelefoneFixo('113988')).toBe('(11) 3988');
      expect(service.formatarTelefoneFixo('11')).toBe('(11');
      expect(service.formatarTelefoneFixo('')).toBe('');
    });

    it('should limit to 10 digits', () => {
      expect(service.formatarTelefoneFixo('11398877661234')).toBe('(11) 3988-7766');
    });
  });

  describe('formatarAutomatico', () => {
    it('should format cellular numbers automatically', () => {
      expect(service.formatarAutomatico('11999887766')).toBe('(11) 99988-7766');
    });

    it('should format landline numbers automatically', () => {
      expect(service.formatarAutomatico('1139887766')).toBe('(11) 3988-7766');
    });

    it('should use cellular format as default for invalid', () => {
      expect(service.formatarAutomatico('123')).toBe('(12) 3');
    });
  });

  describe('isNumeroValido', () => {
    it('should return true for valid numbers', () => {
      expect(service.isNumeroValido('11999887766')).toBe(true);
      expect(service.isNumeroValido('1139887766')).toBe(true);
    });

    it('should return false for invalid numbers', () => {
      expect(service.isNumeroValido('123')).toBe(false);
      expect(service.isNumeroValido('1199887766123')).toBe(false);
    });
  });

  describe('obterMensagemErro', () => {
    it('should return correct error messages', () => {
      expect(service.obterMensagemErro({ required: true })).toBe('Telefone é obrigatório');
      expect(service.obterMensagemErro({ celularInvalido: true })).toBe('Celular deve ter 10 ou 11 dígitos');
      expect(service.obterMensagemErro({ dddInvalido: true })).toBe('DDD inválido. Use de 11 a 99');
      expect(service.obterMensagemErro({ formatoCelularInvalido: true })).toBe('Para celular, o nono dígito deve ser 9');
      expect(service.obterMensagemErro({ pattern: true })).toBe('Formato inválido. Use: (11) 99999-9999');
      expect(service.obterMensagemErro(null)).toBeNull();
    });

    it('should return generic message for unknown errors', () => {
      expect(service.obterMensagemErro({ unknownError: true })).toBe('Formato de telefone inválido');
    });
  });
});
