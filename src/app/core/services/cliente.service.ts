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

  constructor(private firestore: Firestore, private auth: Auth) { }

  listarClientes(): Observable<Cliente[]> {
    const user = this.auth.currentUser;
    if (!user) return of([]);

    try {
      const clientesRef = collection(this.firestore, 'clientes');
      const q = query(clientesRef, where('empresa_id', '==', user.uid));
      
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
          return clientes.sort((a, b) => a.nome.localeCompare(b.nome));
        })
      );
    } catch (error) {
      console.error('Erro ao criar query de clientes:', error);
      return of([]);
    }
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
    
    // Construir queries com base nos parâmetros
    let countQuery;
    if (searchTerm && searchTerm.trim() !== '') {
      searchTerm = searchTerm.toLocaleUpperCase();
      const searchTermEnd = searchTerm + '\uf8ff';
      
      // Query para contagem com busca por nome (simplificada devido às limitações do Firestore)
      countQuery = query(
        clientesRef,
        where('empresa_id', '==', user.uid),
        where('nome', '>=', searchTerm),
        where('nome', '<=', searchTermEnd)
      );
    } else {
      countQuery = query(clientesRef, where('empresa_id', '==', user.uid));
    }
    
    // Obter contagem total
    const countSnapshot = await getCountFromServer(countQuery);
    const total = countSnapshot.data().count;
    
    // Construir a query paginada - ordenar por nome
    let queryConstraints: any[] = [
      where('empresa_id', '==', user.uid),
      orderBy('nome')
    ];
    
    // Adicionar filtros de pesquisa se houver um termo
    if (searchTerm && searchTerm.trim() !== '') {
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
    
    // Adicionar limitação de página
    queryConstraints.push(limit(pageSize));
    
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
    
    return { items: clientes, total, lastVisible };
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
    
    // Query para contagem total de clientes frequentes
    const countQuery = query(
      clientesRef, 
      where('empresa_id', '==', user.uid),
      where('nome', 'in', clientesFrequentes)
    );
    
    // Obter contagem total
    const countSnapshot = await getCountFromServer(countQuery);
    const total = countSnapshot.data().count;
    
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
    
    // Adicionar limitação de página
    queryConstraints.push(limit(pageSize));
    
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
    
    return { items: clientes, total, lastVisible };
  }
}
