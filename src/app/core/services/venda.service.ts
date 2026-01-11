import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { addDoc, collection, collectionData, deleteDoc, doc, Firestore, getDocs, getDoc, query, updateDoc, where, orderBy, limit, startAfter, getCountFromServer, QueryDocumentSnapshot, DocumentData, deleteField } from '@angular/fire/firestore';
import { Observable, of, from, map } from 'rxjs';
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
  observacao?: string | null;
  expandido?: boolean
}

@Injectable({
  providedIn: 'root'
})
export class VendaService {

  constructor(private firestore: Firestore, private auth: Auth) { }

  /**
   * @deprecated Use buscarVendasPaginadas() para melhor performance
   * Este método carrega todas as vendas em memória - não recomendado para grandes volumes
   */
  listarVendas(): Observable<Venda[]> {
    const user = this.auth.currentUser;
    if (!user) return of([]);

    try {
      const vendasRef = collection(this.firestore, 'vendas');
      // Limitar a 100 vendas mais recentes para evitar sobrecarga
      const q = query(
        vendasRef, 
        where('empresa_id', '==', user.uid),
        orderBy('data', 'desc'),
        limit(100)
      );
      
      return from(getDocs(q)).pipe(
        map(snapshot => {
          const vendas: Venda[] = [];
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
              valor_pago: data['valor_pago'],
              observacao: data['observacao'],
              expandido: false
            });
          });
          // Não é necessário sort - query já ordena por data desc
          return vendas;
        })
      );
    } catch (error) {
      console.error('Erro ao criar query de vendas:', error);
      return of([]);
    }
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

    // Remover apenas campos undefined (manter null para limpar campos)
    Object.keys(vendaToSave).forEach(key => {
      if (vendaToSave[key as keyof Venda] === undefined) {
        delete vendaToSave[key as keyof Venda];
      }
    });

    return addDoc(collection(this.firestore, 'vendas'), vendaToSave);
  }

  async atualizarVenda(id: string, venda: Partial<Venda>) {
    // Converter strings para uppercase antes de atualizar
    const vendaToUpdate = { ...venda };
    if (vendaToUpdate.cliente) {
      vendaToUpdate.cliente = vendaToUpdate.cliente.toLocaleUpperCase();
    }

    // Tratar observação null para remover o campo
    if (vendaToUpdate.observacao === null) {
      vendaToUpdate.observacao = deleteField() as any;
    }

    // Remover apenas campos undefined
    Object.keys(vendaToUpdate).forEach(key => {
      if (vendaToUpdate[key as keyof Venda] === undefined) {
        delete vendaToUpdate[key as keyof Venda];
      }
    });

    const vendaDoc = doc(this.firestore, 'vendas', id);
    return await updateDoc(vendaDoc, vendaToUpdate);
  }  async excluirVenda(id: string) {
    const user = this.auth.currentUser;
    if (!user) return;

    // Primeiro, buscar a venda para obter os produtos vendidos
    const venda = await this.buscarVendaPorId(id);
    if (!venda) {
      throw new Error('Venda não encontrada');
    }

    // Devolver estoque dos produtos vendidos
    // Buscar todos os produtos da empresa para fazer o match por ID
    const produtosRef = collection(this.firestore, 'produtos');
    const produtosQuery = query(produtosRef, where('empresa_id', '==', user.uid));
    const produtosSnapshot = await getDocs(produtosQuery);
    
    const produtosMap = new Map();
    produtosSnapshot.docs.forEach(doc => {
      produtosMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    // Agrupar produtos por ID e somar quantidades (para lidar com produtos duplicados)
    const quantidadesPorProduto: { [key: string]: number } = {};
    venda.produtos.forEach(produto => {
      if (quantidadesPorProduto[produto.produto_id]) {
        quantidadesPorProduto[produto.produto_id] += produto.quantidade;
      } else {
        quantidadesPorProduto[produto.produto_id] = produto.quantidade;
      }
    });

    // Devolver estoque para cada produto único
    for (const produtoId of Object.keys(quantidadesPorProduto)) {
      try {
        const produtoAtual = produtosMap.get(produtoId);
        if (produtoAtual) {
          const quantidadeTotal = quantidadesPorProduto[produtoId];
          const novoEstoque = produtoAtual.estoque + quantidadeTotal;
          await updateDoc(doc(this.firestore, 'produtos', produtoId), { estoque: novoEstoque });
        }
      } catch (error) {
        console.error(`Erro ao devolver estoque do produto ${produtoId}:`, error);
        // Continua com os outros produtos mesmo se um falhar
      }
    }

    // Após devolver o estoque, excluir a venda
    const vendaDoc = doc(this.firestore, 'vendas', id);
    return deleteDoc(vendaDoc);
  }

  // Método para busca paginada de vendas
  async buscarVendasPaginadas(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    searchTerm?: string
  ): Promise<PaginatedResult<Venda>> {
    const user = this.auth.currentUser;
    if (!user) return { items: [], total: 0 };

    const vendasRef = collection(this.firestore, 'vendas');
    
    // Construir a query paginada - ordenar por data (mais recente primeiro)
    let queryConstraints: any[] = [
      where('empresa_id', '==', user.uid),
      orderBy('data', 'desc')
    ];
    
    // Adicionar filtros de pesquisa se houver um termo
    if (searchTerm && searchTerm.trim() !== '') {
      searchTerm = searchTerm.toLocaleUpperCase();
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
    
    // Buscar 1 item a mais para saber se há próxima página
    queryConstraints.push(limit(pageSize + 1));
    
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
        valor_pago: data['valor_pago'],
        observacao: data['observacao'],
        expandido: false
      });
      lastVisible = doc;
    });
    
    // Se trouxe mais que pageSize, há próxima página
    const hasMore = vendas.length > pageSize;
    if (hasMore) {
      vendas.pop(); // Remove o item extra
      lastVisible = snapshot.docs[snapshot.docs.length - 2];
    }
    
    return { 
      items: vendas, 
      total: 0, // Total não é mais calculado para performance
      lastVisible,
      hasMore 
    };
  }

  // Método para buscar vendas de um cliente específico
  async buscarVendasPorCliente(
    clienteNome: string,
    pageSize: number,
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    apenasNaoPagas: boolean = false
  ): Promise<PaginatedResult<Venda>> {
    const user = this.auth.currentUser;
    if (!user) return { items: [], total: 0 };

    const vendasRef = collection(this.firestore, 'vendas');
    const clienteUppercase = clienteNome.toLocaleUpperCase();
    
    // Construir query paginada
    let queryConstraints: any[] = [
      where('empresa_id', '==', user.uid),
      where('cliente', '==', clienteUppercase),
      orderBy('data', 'desc')
    ];
    
    if (startAfterDoc) {
      queryConstraints.push(startAfter(startAfterDoc));
    }
    
    // Buscar mais itens se filtrarmos por não pagas (para compensar as pagas)
    const fetchSize = apenasNaoPagas ? pageSize * 3 : pageSize + 1;
    queryConstraints.push(limit(fetchSize));
    
    const paginatedQuery = query(vendasRef, ...queryConstraints);
    const snapshot = await getDocs(paginatedQuery);
    
    const vendas: Venda[] = [];
    let lastVisible: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const valorPago = data['valor_pago'] || 0;
      const valorTotal = data['valor_total'];
      
      // Se filtrar apenas não pagas, verificar condição
      if (!apenasNaoPagas || valorPago < valorTotal) {
        vendas.push({
          id: doc.id,
          empresa_id: data['empresa_id'],
          produtos: data['produtos'],
          valor_total: valorTotal,
          lucro_total: data['lucro_total'],
          data: data['data'],
          cliente: data['cliente'],
          valor_pago: valorPago,
          observacao: data['observacao'],
          expandido: false
        });
        lastVisible = doc;
      }
    });
    
    // Limitar ao pageSize se necessário
    const hasMore = vendas.length > pageSize;
    if (hasMore && !apenasNaoPagas) {
      vendas.splice(pageSize);
      lastVisible = snapshot.docs[pageSize - 1];
    } else if (apenasNaoPagas && vendas.length > pageSize) {
      vendas.splice(pageSize);
    }
    
    return { 
      items: vendas, 
      total: 0,
      lastVisible,
      hasMore: apenasNaoPagas ? false : hasMore
    };
  }

  // Método para buscar uma venda específica por ID
  async buscarVendaPorId(id: string): Promise<Venda | null> {
    const user = this.auth.currentUser;
    if (!user) return null;

    try {
      const vendaDoc = doc(this.firestore, 'vendas', id);
      const vendaSnapshot = await getDoc(vendaDoc);
      
      if (!vendaSnapshot.exists()) {
        return null;
      }
      
      const data = vendaSnapshot.data();
      
      // Verificar se pertence à empresa do usuário
      if (data['empresa_id'] !== user.uid) {
        return null;
      }
      
      return {
        id: vendaSnapshot.id,
        empresa_id: data['empresa_id'],
        produtos: data['produtos'],
        valor_total: data['valor_total'],
        lucro_total: data['lucro_total'],
        data: data['data'],
        cliente: data['cliente'],
        valor_pago: data['valor_pago'],
        observacao: data['observacao'],
        expandido: false
      };
    } catch (error) {
      console.error('Erro ao buscar venda por ID:', error);
      return null;
    }
  }

  // Método para atualizar valor pago de uma venda
  async atualizarValorPago(id: string, valorPago: number) {
    const vendaDoc = doc(this.firestore, 'vendas', id);
    return await updateDoc(vendaDoc, { valor_pago: valorPago });
  }
}
