import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { addDoc, collection, collectionData, deleteDoc, doc, Firestore, getDocs, query, updateDoc, where, orderBy, limit, startAfter, getCountFromServer, QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { PaginatedResult } from 'src/app/shared/models/pagination.model';

export interface Venda{
  id: string;
  empresa_id: string;
  produtos: [{
    produto_id: string;
    nome: string;
    quantidade: number;
    preco_compra: number;
    preco_venda: number;
    unidade_medida?: string;
    total: number;
    lucro?: number;
  }]
  valor_total: number;
  lucro_total?: number;
  data: any;
  cliente: string;
  valor_pago?: number;
  expandido?: boolean
}

@Injectable({
  providedIn: 'root'
})
export class VendaService {

  constructor(private firestore: Firestore, private auth: Auth) { }

  listarVendas(): Observable<Venda[]> {
    const user = this.auth.currentUser;
    if (!user) return of([]);

    const vendasRef = collection(this.firestore, 'vendas');
    const q = query(vendasRef, where('empresa_id', '==', user.uid));
    return collectionData(q, { idField: 'id' }) as Observable<Venda[]>;
  }

  async criarVenda(venda: Venda) {
    const user = this.auth.currentUser;
    if (!user) return;
    
    // Converter strings para uppercase antes de salvar
    const vendaToSave = {
      ...venda,
      cliente: venda.cliente.toLocaleUpperCase(),
      empresa_id: user.uid
    };

    return addDoc(collection(this.firestore, 'vendas'), vendaToSave);
  }

  async atualizarVenda(id: string, venda: Partial<Venda>) {
    // Converter strings para uppercase antes de atualizar
    const vendaToUpdate = { ...venda };
    if (vendaToUpdate.cliente) {
      vendaToUpdate.cliente = vendaToUpdate.cliente.toLocaleUpperCase();
    }

    const vendaDoc = doc(this.firestore, 'vendas', id);
    return await updateDoc(vendaDoc, vendaToUpdate);
  }

  async excluirVenda(id: string) {

    const vendaDoc = doc(this.firestore, `vendas/${id}`);

    return deleteDoc(vendaDoc);
  }

  // Novo método para busca paginada de vendas
  async buscarVendasPaginadas(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    searchTerm?: string
  ): Promise<PaginatedResult<Venda>> {
    const user = this.auth.currentUser;
    if (!user) return { items: [], total: 0 };

    const vendasRef = collection(this.firestore, 'vendas');
    
    // Construir queries com base nos parâmetros
    let countQuery;
    if (searchTerm && searchTerm.trim() !== '') {
      searchTerm = searchTerm.toLocaleUpperCase();
      const searchTermEnd = searchTerm + '\uf8ff';
      countQuery = query(
        vendasRef, 
        where('empresa_id', '==', user.uid),
        where('cliente', '>=', searchTerm),
        where('cliente', '<=', searchTermEnd)
      );
    } else {
      countQuery = query(vendasRef, where('empresa_id', '==', user.uid));
    }
    
    // Obter contagem total
    const countSnapshot = await getCountFromServer(countQuery);
    const total = countSnapshot.data().count;
    
    // Construir a query paginada - ordenar por data (mais recente primeiro)
    let queryConstraints: any[] = [
      where('empresa_id', '==', user.uid),
      orderBy('data', 'desc')
    ];
    
    // Adicionar filtros de pesquisa se houver um termo
    if (searchTerm && searchTerm.trim() !== '') {
      const searchTermEnd = searchTerm + '\uf8ff';
      // Para pesquisa por cliente, precisamos reordenar por cliente
      queryConstraints = [
        where('empresa_id', '==', user.uid),
        where('cliente', '>=', searchTerm),
        where('cliente', '<=', searchTermEnd),
        orderBy('cliente'),
        orderBy('data', 'desc')
      ];
    }
    
    // Adicionar startAfter para paginação
    if (startAfterDoc) {
      queryConstraints.push(startAfter(startAfterDoc));
    }
    
    // Adicionar limitação de página
    queryConstraints.push(limit(pageSize));
    
    // Executar a query
    const paginatedQuery = query(vendasRef, ...queryConstraints);
    
    const snapshot = await getDocs(paginatedQuery);
    const vendas: Venda[] = [];
    let lastVisible: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      vendas.push({
        id: doc.id,
        empresa_id: data['empresa_id'],
        produtos: data['produtos'],
        valor_total: data['valor_total'],
        lucro_total: data['lucro_total'],
        data: data['data'],
        cliente: data['cliente'],
        expandido: false
      });
      lastVisible = doc;
    });
    
    return { items: vendas, total, lastVisible };
  }

  // Método para buscar vendas de um cliente específico
  async buscarVendasPorCliente(
    clienteNome: string,
    pageSize: number,
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<PaginatedResult<Venda>> {
    const user = this.auth.currentUser;
    if (!user) return { items: [], total: 0 };

    const vendasRef = collection(this.firestore, 'vendas');
    const clienteUppercase = clienteNome.toLocaleUpperCase();
    
    // Query para contagem total
    const countQuery = query(
      vendasRef,
      where('empresa_id', '==', user.uid),
      where('cliente', '==', clienteUppercase)
    );
    
    const countSnapshot = await getCountFromServer(countQuery);
    const total = countSnapshot.data().count;
    
    // Query paginada
    let queryConstraints: any[] = [
      where('empresa_id', '==', user.uid),
      where('cliente', '==', clienteUppercase),
      orderBy('data', 'desc')
    ];
    
    if (startAfterDoc) {
      queryConstraints.push(startAfter(startAfterDoc));
    }
    
    queryConstraints.push(limit(pageSize));
    
    const paginatedQuery = query(vendasRef, ...queryConstraints);
    const snapshot = await getDocs(paginatedQuery);
    
    const vendas: Venda[] = [];
    let lastVisible: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      vendas.push({
        id: doc.id,
        empresa_id: data['empresa_id'],
        produtos: data['produtos'],
        valor_total: data['valor_total'],
        lucro_total: data['lucro_total'],
        data: data['data'],
        cliente: data['cliente'],
        valor_pago: data['valor_pago'] || 0,
        expandido: false
      });
      lastVisible = doc;
    });
    
    return { items: vendas, total, lastVisible };
  }

  // Método para atualizar valor pago de uma venda
  async atualizarValorPago(id: string, valorPago: number) {
    const vendaDoc = doc(this.firestore, 'vendas', id);
    return await updateDoc(vendaDoc, { valor_pago: valorPago });
  }
}
