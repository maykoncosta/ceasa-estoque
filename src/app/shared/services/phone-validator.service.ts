import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class PhoneValidatorService {

  /**
   * Aplica máscara de celular brasileiro (11) 99999-9999
   * @param value Valor do input
   * @returns Valor formatado
   */
  formatarCelular(value: string): string {
    if (!value) return '';
    
    // Remove tudo que não é número
    let apenasNumeros = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    apenasNumeros = apenasNumeros.substring(0, 11);
    
    // Aplica a formatação
    if (apenasNumeros.length <= 2) {
      return apenasNumeros.replace(/^(\d{0,2})/, '($1');
    } else if (apenasNumeros.length <= 6) {
      return apenasNumeros.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
    } else if (apenasNumeros.length <= 10) {
      return apenasNumeros.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
      return apenasNumeros.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }
  }

  /**
   * Remove formatação do celular para armazenamento
   * @param celular Celular formatado
   * @returns Apenas números
   */
  limparCelular(celular: string): string {
    if (!celular) return '';
    return celular.replace(/\D/g, '');
  }

  /**
   * Formata celular para exibição
   * @param celular Celular apenas com números
   * @returns Celular formatado
   */
  formatarParaExibicao(celular: string): string {
    if (!celular) return '';
    
    const apenasNumeros = celular.replace(/\D/g, '');
    
    if (apenasNumeros.length === 11) {
      return apenasNumeros.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (apenasNumeros.length === 10) {
      return apenasNumeros.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    
    return celular; // Retorna como está se não conseguir formatar
  }

  /**
   * Validador customizado para celular brasileiro
   * @returns ValidatorFn
   */
  celularBrasileiroValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Se não há valor, não há erro (required deve ser tratado separadamente)
      }

      const apenasNumeros = control.value.replace(/\D/g, '');
      
      // Celular brasileiro deve ter 10 ou 11 dígitos
      if (apenasNumeros.length < 10 || apenasNumeros.length > 11) {
        return { celularInvalido: true };
      }

      // DDD válido (11 a 99)
      const ddd = parseInt(apenasNumeros.substring(0, 2));
      if (ddd < 11 || ddd > 99) {
        return { dddInvalido: true };
      }

      // Para 11 dígitos, o nono dígito deve ser 9 (celular)
      if (apenasNumeros.length === 11) {
        const nonoDigito = apenasNumeros.charAt(2);
        if (nonoDigito !== '9') {
          return { formatoCelularInvalido: true };
        }
      }

      return null;
    };
  }

  /**
   * Máscara para telefone fixo brasileiro (11) 9999-9999
   * @param value Valor do input
   * @returns Valor formatado
   */
  formatarTelefoneFixo(value: string): string {
    if (!value) return '';
    
    // Remove tudo que não é número
    let apenasNumeros = value.replace(/\D/g, '');
    
    // Limita a 10 dígitos
    apenasNumeros = apenasNumeros.substring(0, 10);
    
    // Aplica a formatação
    if (apenasNumeros.length <= 2) {
      return apenasNumeros.replace(/^(\d{0,2})/, '($1');
    } else if (apenasNumeros.length <= 6) {
      return apenasNumeros.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
    } else {
      return apenasNumeros.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
  }

  /**
   * Validador customizado para telefone fixo brasileiro
   * @returns ValidatorFn
   */
  telefoneFixoBrasileiroValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const apenasNumeros = control.value.replace(/\D/g, '');
      
      // Telefone fixo brasileiro deve ter 10 dígitos
      if (apenasNumeros.length !== 10) {
        return { telefoneFixoInvalido: true };
      }

      // DDD válido (11 a 99)
      const ddd = parseInt(apenasNumeros.substring(0, 2));
      if (ddd < 11 || ddd > 99) {
        return { dddInvalido: true };
      }

      // Primeiro dígito do número não pode ser 0, 1 ou 9
      const primeiroDigito = apenasNumeros.charAt(2);
      if (primeiroDigito === '0' || primeiroDigito === '1' || primeiroDigito === '9') {
        return { formatoTelefoneInvalido: true };
      }

      return null;
    };
  }

  /**
   * Detecta se o número é celular ou telefone fixo
   * @param numero Número apenas com dígitos
   * @returns 'celular', 'fixo' ou 'invalido'
   */
  detectarTipoTelefone(numero: string): 'celular' | 'fixo' | 'invalido' {
    const apenasNumeros = numero.replace(/\D/g, '');
    
    if (apenasNumeros.length === 11) {
      // Se tem 11 dígitos e o terceiro é 9, é celular
      if (apenasNumeros.charAt(2) === '9') {
        return 'celular';
      }
    } else if (apenasNumeros.length === 10) {
      // Se tem 10 dígitos e o terceiro não é 9, é fixo
      if (apenasNumeros.charAt(2) !== '9') {
        return 'fixo';
      }
    }
    
    return 'invalido';
  }

  /**
   * Formata automaticamente baseado no tipo detectado
   * @param value Valor do input
   * @returns Valor formatado
   */
  formatarAutomatico(value: string): string {
    if (!value) return '';
    
    const apenasNumeros = value.replace(/\D/g, '');
    const tipo = this.detectarTipoTelefone(apenasNumeros);
    
    switch (tipo) {
      case 'celular':
        return this.formatarCelular(value);
      case 'fixo':
        return this.formatarTelefoneFixo(value);
      default:
        // Se não conseguir detectar, usa formatação de celular como padrão
        return this.formatarCelular(value);
    }
  }

  /**
   * Valida se o número está em formato brasileiro válido
   * @param numero Número para validar
   * @returns true se válido
   */
  isNumeroValido(numero: string): boolean {
    const tipo = this.detectarTipoTelefone(numero);
    return tipo !== 'invalido';
  }

  /**
   * Obtém mensagem de erro personalizada baseada no tipo de erro
   * @param errors Erros de validação
   * @returns Mensagem de erro ou null
   */
  obterMensagemErro(errors: ValidationErrors | null): string | null {
    if (!errors) return null;

    if (errors['required']) {
      return 'Telefone é obrigatório';
    }
    if (errors['celularInvalido']) {
      return 'Celular deve ter 10 ou 11 dígitos';
    }
    if (errors['telefoneFixoInvalido']) {
      return 'Telefone fixo deve ter 10 dígitos';
    }
    if (errors['dddInvalido']) {
      return 'DDD inválido. Use de 11 a 99';
    }
    if (errors['formatoCelularInvalido']) {
      return 'Para celular, o nono dígito deve ser 9';
    }
    if (errors['formatoTelefoneInvalido']) {
      return 'Formato de telefone inválido';
    }
    if (errors['pattern']) {
      return 'Formato inválido. Use: (11) 99999-9999';
    }
    if (errors['maxlength']) {
      return 'Telefone muito longo';
    }

    return 'Formato de telefone inválido';
  }
}
