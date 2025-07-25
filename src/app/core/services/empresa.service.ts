import { Injectable } from '@angular/core';
import { Observable, from, of, combineLatest } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { 
  Firestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot
} from '@angular/fire/firestore';
import { 
  Storage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from '@angular/fire/storage';
import { AuthService } from 'src/app/core/services/auth.service';
import { 
  Empresa, 
  EstatisticasEmpresa, 
  EnderecoViaCep, 
  EMPRESA_PADRAO 
} from 'src/app/shared/models/empresa.model';

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {

  private readonly COLLECTION_NAME = 'empresas';

  constructor(
    private firestore: Firestore,
    private storage: Storage,
    private authService: AuthService
  ) { }

  /**
   * Obtém os dados da empresa do usuário logado
   */
  obterEmpresa(): Observable<Empresa | null> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          return of(null);
        }

        const empresaRef = doc(this.firestore, this.COLLECTION_NAME, user.uid);
        
        return new Observable<Empresa | null>(observer => {
          const unsubscribe = onSnapshot(empresaRef, 
            (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                const empresa: Empresa = {
                  id: docSnap.id,
                  nome: data['nome'],
                  razao_social: data['razao_social'],
                  cnpj: data['cnpj'],
                  endereco: data['endereco'],
                  contato: data['contato'],
                  logo_url: data['logo_url'],
                  configuracoes: data['configuracoes'],
                  criado_em: data['criado_em']?.toDate() || new Date(),
                  atualizado_em: data['atualizado_em']?.toDate() || new Date(),
                  ativo: data['ativo'] ?? true
                };
                observer.next(empresa);
              } else {
                observer.next(null);
              }
            },
            (error) => observer.error(error)
          );

          return () => unsubscribe();
        });
      })
    );
  }

  /**
   * Cria uma nova empresa para o usuário logado
   */
  async criarEmpresa(dadosEmpresa: Partial<Empresa>): Promise<string> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      throw new Error('Usuário não está logado');
    }

    const empresaCompleta: Empresa = {
      ...EMPRESA_PADRAO,
      ...dadosEmpresa,
      id: user.uid,
      criado_em: new Date(),
      atualizado_em: new Date()
    } as Empresa;

    const empresaRef = doc(this.firestore, this.COLLECTION_NAME, user.uid);
    await setDoc(empresaRef, empresaCompleta);

    return user.uid;
  }

  /**
   * Atualiza os dados da empresa
   */
  async atualizarEmpresa(dados: Partial<Empresa>): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      throw new Error('Usuário não está logado');
    }

    const empresaRef = doc(this.firestore, this.COLLECTION_NAME, user.uid);
    
    const dadosAtualizacao = {
      ...dados,
      atualizado_em: new Date()
    };

    await updateDoc(empresaRef, dadosAtualizacao);
  }

  /**
   * Faz upload da logo da empresa
   */
  async uploadLogo(file: File): Promise<string> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      throw new Error('Usuário não está logado');
    }

    // Validar arquivo
    this.validarArquivoLogo(file);

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const nomeArquivo = `logos/${user.uid}_${timestamp}.${file.name.split('.').pop()}`;
    
    // Upload para o Storage
    const storageRef = ref(this.storage, nomeArquivo);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Atualizar URL no documento da empresa
    await this.atualizarEmpresa({ logo_url: downloadURL });

    return downloadURL;
  }

  /**
   * Remove a logo da empresa
   */
  async removerLogo(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      throw new Error('Usuário não está logado');
    }

    // Obter empresa atual para pegar URL da logo
    const empresaRef = doc(this.firestore, this.COLLECTION_NAME, user.uid);
    const empresaSnap = await getDoc(empresaRef);
    
    if (empresaSnap.exists()) {
      const empresa = empresaSnap.data() as Empresa;
      
      // Remover arquivo do Storage se existir
      if (empresa.logo_url) {
        try {
          const logoRef = ref(this.storage, empresa.logo_url);
          await deleteObject(logoRef);
        } catch (error) {
          console.warn('Erro ao remover logo do storage:', error);
          // Continua mesmo se não conseguir remover do storage
        }
      }

      // Remover URL do documento
      await updateDoc(empresaRef, { logo_url: null });
    }
  }

  /**
   * Obtém estatísticas da empresa
   */
  obterEstatisticas(): Observable<EstatisticasEmpresa> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) {
          return of({
            total_produtos: 0,
            total_clientes: 0,
            total_vendas: 0,
            valor_total_vendas: 0
          });
        }

        // Buscar dados das diferentes collections
        const produtosQuery = query(
          collection(this.firestore, 'produtos'),
          where('empresa_id', '==', user.uid)
        );

        const clientesQuery = query(
          collection(this.firestore, 'clientes'),
          where('empresa_id', '==', user.uid)
        );

        const vendasQuery = query(
          collection(this.firestore, 'vendas'),
          where('empresa_id', '==', user.uid)
        );

        return combineLatest([
          from(getDocs(produtosQuery)),
          from(getDocs(clientesQuery)),
          from(getDocs(vendasQuery))
        ]).pipe(
          map(([produtosSnap, clientesSnap, vendasSnap]) => {
            let valorTotalVendas = 0;
            let dataPrimeiraVenda: Date | undefined;
            let dataUltimaVenda: Date | undefined;

            // Calcular estatísticas de vendas
            vendasSnap.docs.forEach(doc => {
              const venda = doc.data();
              valorTotalVendas += venda['valor_total'] || 0;

              const dataVenda = venda['data']?.toDate();
              if (dataVenda) {
                if (!dataPrimeiraVenda || dataVenda < dataPrimeiraVenda) {
                  dataPrimeiraVenda = dataVenda;
                }
                if (!dataUltimaVenda || dataVenda > dataUltimaVenda) {
                  dataUltimaVenda = dataVenda;
                }
              }
            });

            return {
              total_produtos: produtosSnap.docs.length,
              total_clientes: clientesSnap.docs.length,
              total_vendas: vendasSnap.docs.length,
              valor_total_vendas: valorTotalVendas,
              data_primeira_venda: dataPrimeiraVenda,
              data_ultima_venda: dataUltimaVenda
            };
          })
        );
      }),
      catchError(error => {
        console.error('Erro ao obter estatísticas:', error);
        return of({
          total_produtos: 0,
          total_clientes: 0,
          total_vendas: 0,
          valor_total_vendas: 0
        });
      })
    );
  }

  /**
   * Busca informações de endereço pelo CEP
   */
  async buscarEnderecoPorCep(cep: string): Promise<EnderecoViaCep | null> {
    const cepLimpo = cep.replace(/\D/g, '');
    
    if (cepLimpo.length !== 8) {
      throw new Error('CEP deve conter 8 dígitos');
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (data.erro) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      return null;
    }
  }

  /**
   * Valida CNPJ brasileiro
   */
  validarCNPJ(cnpj: string): boolean {
    if (!cnpj) return true; // CNPJ é opcional

    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) return false;

    // Eliminar CNPJs conhecidos como inválidos
    if (/^(\d)\1+$/.test(cnpjLimpo)) return false;

    // Validar dígitos verificadores
    let soma = 0;
    let peso = 2;
    
    for (let i = 11; i >= 0; i--) {
      soma += parseInt(cnpjLimpo.charAt(i)) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    const resto = soma % 11;
    const digito1 = resto < 2 ? 0 : 11 - resto;
    
    if (parseInt(cnpjLimpo.charAt(12)) !== digito1) return false;
    
    soma = 0;
    peso = 2;
    
    for (let i = 12; i >= 0; i--) {
      soma += parseInt(cnpjLimpo.charAt(i)) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    
    const resto2 = soma % 11;
    const digito2 = resto2 < 2 ? 0 : 11 - resto2;
    
    return parseInt(cnpjLimpo.charAt(13)) === digito2;
  }

  /**
   * Formata CNPJ para exibição
   */
  formatarCNPJ(cnpj: string): string {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    return cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  /**
   * Formata CEP para exibição
   */
  formatarCEP(cep: string): string {
    const cepLimpo = cep.replace(/\D/g, '');
    return cepLimpo.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }

  /**
   * Valida arquivo de logo
   */
  private validarArquivoLogo(file: File): void {
    // Validar tipo
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (!tiposPermitidos.includes(file.type)) {
      throw new Error('Tipo de arquivo não suportado. Use JPG, PNG ou SVG.');
    }

    // Validar tamanho (2MB máximo)
    const tamanhoMaximo = 2 * 1024 * 1024;
    if (file.size > tamanhoMaximo) {
      throw new Error('Arquivo muito grande. Tamanho máximo: 2MB.');
    }
  }

  /**
   * Verifica se a empresa existe
   */
  async empresaExiste(): Promise<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) return false;

    const empresaRef = doc(this.firestore, this.COLLECTION_NAME, user.uid);
    const empresaSnap = await getDoc(empresaRef);
    
    return empresaSnap.exists();
  }

  /**
   * Inicializa empresa padrão se não existir
   */
  async inicializarEmpresaSeNecessario(): Promise<void> {
    const existe = await this.empresaExiste();
    
    if (!existe) {
      const user = this.authService.getCurrentUser();
      if (user) {
        await this.criarEmpresa({
          nome: 'Minha Empresa',
          razao_social: 'Minha Empresa LTDA',
          contato: {
            email: user.email || ''
          }
        });
      }
    }
  }
}
