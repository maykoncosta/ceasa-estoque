import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { addDoc, collection, collectionData, deleteDoc, doc, Firestore, getDocs, query, updateDoc, where, orderBy, limit, startAfter, getCountFromServer, QueryDocumentSnapshot, DocumentData, or, and } from '@angular/fire/firestore';
import { Observable, of, from, map } from 'rxjs';
import { PaginatedResult } from 'src/app/shared/models/pagination.model';

export interface Cliente {
  id: string;
  nome: string;
  celular: string;
  empresa_id: string
}

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  // Cache estático que persiste entre navegações
  private cacheEmpresaId: string | null = null;
  private cacheClientes: Cliente[] = [];

  constructor(private firestore: Firestore, private auth: Auth) { }

  /**
   * @deprecated Use buscarClientesPaginadas() para melhor performance
   * Este método carrega todos os clientes em memória - não recomendado para grandes volumes
   */
  listarClientes(): Observable<Cliente[]> {
    const user = this.auth.currentUser;
    if (!user) return of([]);

    try {
      const clientesRef = collection(this.firestore, 'clientes');
      // Limitar a 100 clientes mais recentes para evitar sobrecarga
      const q = query(
        clientesRef, 
        where('empresa_id', '==', user.uid),
        orderBy('nome'),
        limit(100)
      );
      
      return from(getDocs(q)).pipe(
        map(snapshot => {
          const clientes: Cliente[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            clientes.push({
              id: doc.id,
              nome: data['nome'],
              celular: data['celular'],
              empresa_id: data['empresa_id']
            });
          });
          // Não é necessário sort - query já ordena por nome
          return clientes;
        })
      );
    } catch (error) {
      console.error('Erro ao criar query de clientes:', error);
      return of([]);
    }
  }

  /**
   * Busca TODOS os clientes para cache local (autocomplete, etc)
   * Use apenas para volumes pequenos (< 500 registros)
   * Mantém cache em memória que persiste entre navegações
   */
  buscarTodosClientesParaCache(forcarReload: boolean = false): Observable<Cliente[]> {
    const user = this.auth.currentUser;
    if (!user) return of([]);

    // Verificar se já tem cache válido
    if (!forcarReload && this.cacheClientes.length > 0 && this.cacheEmpresaId === user.uid) {
      console.log(`⚡ Clientes já em CACHE (serviço): ${this.cacheClientes.length} clientes`);
      return of(this.cacheClientes);
    }

    console.log('💾 Buscando clientes do BANCO...');
    try {
      const clientesRef = collection(this.firestore, 'clientes');
      const q = query(
        clientesRef, 
        where('empresa_id', '==', user.uid),
        orderBy('nome')
        // SEM LIMIT - busca todos
      );
      
      return from(getDocs(q)).pipe(
        map(snapshot => {
          const clientes: Cliente[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            clientes.push({
              id: doc.id,
              nome: data['nome'],
              celular: data['celular'],
              empresa_id: data['empresa_id']
            });
          });
          
          // Armazenar no cache
          this.cacheClientes = clientes;
          this.cacheEmpresaId = user.uid;
          console.log(`✅ Cache de clientes atualizado: ${clientes.length} clientes`);
          
          return clientes;
        })
      );
    } catch (error) {
      console.error('Erro ao buscar clientes para cache:', error);
      return of([]);
    }
  }
  
  /**
   * Limpa o cache de clientes (força recarregamento na próxima busca)
   */
  limparCache(): void {
    this.cacheClientes = [];
    this.cacheEmpresaId = null;
    console.log('🗑️ Cache de clientes limpo');
  }

  async adicionarCliente(cliente: Cliente) {
    const user = this.auth.currentUser;
    if (!user) return;
    
    // Converter strings para uppercase antes de salvar
    const clienteToSave = {
      ...cliente,
      nome: cliente.nome.toLocaleUpperCase(),
      celular: this.limparCelular(cliente.celular), // Remove formatação
      empresa_id: user.uid
    };

    const clientesRef = collection(this.firestore, 'clientes');

    const q = query(clientesRef,
      where('nome', '==', clienteToSave.nome),
      where('empresa_id', '==', user.uid)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      throw new Error('Cliente já existe!');
    }

    return addDoc(clientesRef, clienteToSave);
  }

  async atualizarCliente(id: string, cliente: Partial<Cliente>) {
    // Converter strings para uppercase antes de atualizar
    const clienteToUpdate = { ...cliente };
    if (clienteToUpdate.nome) {
      clienteToUpdate.nome = clienteToUpdate.nome.toLocaleUpperCase();
    }
    if (clienteToUpdate.celular) {
      clienteToUpdate.celular = this.limparCelular(clienteToUpdate.celular);
    }

    const clienteDoc = doc(this.firestore, 'clientes', id);
    return await updateDoc(clienteDoc, clienteToUpdate);
  }

  // Método para remover formatação do celular
  private limparCelular(celular: string): string {
    return celular.replace(/\D/g, '');
  }

  // Método para formatar celular para exibição
  formatarCelularParaExibicao(celular: string): string {
    const apenasNumeros = celular.replace(/\D/g, '');
    
    if (apenasNumeros.length === 11) {
      return apenasNumeros.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (apenasNumeros.length === 10) {
      return apenasNumeros.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    
    return celular; // Retorna como está se não conseguir formatar
  }

  async excluirCliente(id: string, nome: string) {
    // Verificar se o cliente não está sendo usado em vendas
    const user = this.auth.currentUser;
    if (!user) return;

    const vendasRef = collection(this.firestore, 'vendas');
    const q = query(vendasRef,
      where('cliente', '==', nome.toLocaleUpperCase()),
      where('empresa_id', '==', user.uid)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      throw new Error('Não é possível excluir o cliente pois ele possui vendas associadas!');
    }

    const clienteDoc = doc(this.firestore, 'clientes', id);
    return deleteDoc(clienteDoc);
  }

  // Método para busca paginada de clientes
  async buscarClientesPaginadas(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    searchTerm?: string
  ): Promise<PaginatedResult<Cliente>> {
    const user = this.auth.currentUser;
    if (!user) return { items: [], total: 0 };

    const clientesRef = collection(this.firestore, 'clientes');
    
    // Construir a query paginada - ordenar por nome
    let queryConstraints: any[] = [
      where('empresa_id', '==', user.uid),
      orderBy('nome')
    ];
    
    // Adicionar filtros de pesquisa se houver um termo
    if (searchTerm && searchTerm.trim() !== '') {
      searchTerm = searchTerm.toLocaleUpperCase();
      const searchTermEnd = searchTerm + '\uf8ff';
      // Para busca simples, usar apenas por nome (limitação do Firestore com OR)
      queryConstraints = [
        where('empresa_id', '==', user.uid),
        where('nome', '>=', searchTerm),
        where('nome', '<=', searchTermEnd),
        orderBy('nome')
      ];
    }
    
    // Adicionar startAfter para paginação
    if (startAfterDoc) {
      queryConstraints.push(startAfter(startAfterDoc));
    }
    
    // Buscar 1 item a mais para saber se há próxima página
    queryConstraints.push(limit(pageSize + 1));
    
    // Executar a query
    const paginatedQuery = query(clientesRef, ...queryConstraints);
    
    const snapshot = await getDocs(paginatedQuery);
    const clientes: Cliente[] = [];
    let lastVisible: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      clientes.push({
        id: doc.id,
        nome: data['nome'],
        celular: data['celular'],
        empresa_id: data['empresa_id']
      });
      lastVisible = doc;
    });
    
    // Se trouxe mais que pageSize, há próxima página
    const hasMore = clientes.length > pageSize;
    if (hasMore) {
      clientes.pop(); // Remove o item extra
      lastVisible = snapshot.docs[snapshot.docs.length - 2];
    }
    
    return { 
      items: clientes, 
      total: 0, // Total não é mais calculado para performance
      lastVisible,
      hasMore 
    };
  }

  // Método específico para buscar clientes frequentes baseado em lista de nomes
  async buscarClientesFrequentesPaginados(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    clientesFrequentes: string[] = []
  ): Promise<PaginatedResult<Cliente>> {
    const user = this.auth.currentUser;
    if (!user || clientesFrequentes.length === 0) return { items: [], total: 0 };

    const clientesRef = collection(this.firestore, 'clientes');
    
    // Construir a query paginada para clientes frequentes
    let queryConstraints: any[] = [
      where('empresa_id', '==', user.uid),
      where('nome', 'in', clientesFrequentes),
      orderBy('nome') // Ordenar por nome alfabético
    ];
    
    // Adicionar startAfter para paginação
    if (startAfterDoc) {
      queryConstraints.push(startAfter(startAfterDoc));
    }
    
    // Buscar 1 item a mais para saber se há próxima página
    queryConstraints.push(limit(pageSize + 1));
    
    // Executar a query
    const paginatedQuery = query(clientesRef, ...queryConstraints);
    const snapshot = await getDocs(paginatedQuery);
    
    const clientes: Cliente[] = [];
    let lastVisible: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      clientes.push({
        id: doc.id,
        nome: data['nome'],
        celular: data['celular'],
        empresa_id: data['empresa_id']
      });
      lastVisible = doc;
    });
    
    // Se trouxe mais que pageSize, há próxima página
    const hasMore = clientes.length > pageSize;
    if (hasMore) {
      clientes.pop(); // Remove o item extra
      lastVisible = snapshot.docs[snapshot.docs.length - 2];
    }
    
    return { 
      items: clientes, 
      total: 0,
      lastVisible,
      hasMore 
    };
  }
}
