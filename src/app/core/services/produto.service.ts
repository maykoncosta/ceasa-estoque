import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { addDoc, collection, collectionData, deleteDoc, doc, Firestore, query, updateDoc, limit, orderBy, startAfter, getCountFromServer, getDocs, QueryDocumentSnapshot, DocumentData, where } from '@angular/fire/firestore';
import { Observable, of, from, map } from 'rxjs';
import { UnidadeMedida } from './unidade-medida.service';
import { PaginatedResult } from 'src/app/shared/models/pagination.model';

export interface Produto {
  empresa_id: string;
  id: string;
  nome: string;
  preco_compra: number;
  preco_venda: number;
  estoque: number;
  unidadeMedida: UnidadeMedida
}

export interface AjusteEstoque {
  id?: string;
  produto_id: string;
  produto_nome: string;
  empresa_id: string;
  estoque_anterior: number;
  quantidade_ajuste: number;
  estoque_novo: number;
  data: any;
  usuario_id: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProdutoService {

  constructor(private firestore: Firestore, private auth: Auth) { }

  // Método original para compatibilidade
  listarProdutos(): Observable<Produto[]> {
    const user = this.auth.currentUser;
    if (!user) return of([]);

    try {
      const produtosRef = collection(this.firestore, 'produtos');
      const q = query(produtosRef, where('empresa_id', '==', user.uid));
      
      return from(getDocs(q)).pipe(
        map(snapshot => {
          const produtos: Produto[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            produtos.push({
              id: doc.id,
              empresa_id: data['empresa_id'],
              nome: data['nome'],
              preco_compra: data['preco_compra'],
              preco_venda: data['preco_venda'],
              estoque: data['estoque'],
              unidadeMedida: data['unidadeMedida']
            });
          });
          return produtos.sort((a, b) => a.nome.localeCompare(b.nome));
        })
      );
    } catch (error) {
      console.error('Erro ao criar query de produtos:', error);
      return of([]);
    }
  }

  // Método com paginação
  listarProdutosPaginados(pageSize: number, startAfterDoc?: QueryDocumentSnapshot<DocumentData>): Observable<PaginatedResult<Produto>> {
    const user = this.auth.currentUser;
    if (!user) return of({ items: [], total: 0 });

    const produtosRef = collection(this.firestore, 'produtos');
    
    // Consulta para obter o total de itens
    const countQuery = query(produtosRef, where('empresa_id', '==', user.uid));
    const countPromise = getCountFromServer(countQuery).then(snapshot => snapshot.data().count);
    
    // Consulta para obter os itens paginados
    let paginatedQuery;
    if (startAfterDoc) {
      paginatedQuery = query(
        produtosRef,
        where('empresa_id', '==', user.uid),
        orderBy('nome'),
        startAfter(startAfterDoc),
        limit(pageSize)
      );
    } else {
      paginatedQuery = query(
        produtosRef,
        where('empresa_id', '==', user.uid),
        orderBy('nome'),
        limit(pageSize)
      );
    }
    
    const itemsPromise = getDocs(paginatedQuery).then(snapshot => {
      const produtos: Produto[] = [];
      let lastVisible: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        produtos.push({
          id: doc.id,
          empresa_id: data['empresa_id'],
          nome: data['nome'],
          preco_compra: data['preco_compra'],
          preco_venda: data['preco_venda'],
          estoque: data['estoque'],
          unidadeMedida: data['unidadeMedida']
        });
        // Salva o último documento visível para a próxima página
        lastVisible = doc;
      });
      
      return { produtos, lastVisible };
    });
    
    // Combinar os dois resultados
    return from(Promise.all([itemsPromise, countPromise])).pipe(
      map(([items, total]) => ({
        items: items.produtos,
        total,
        lastVisible: items.lastVisible
      }))
    );
  }

  // Método para obter a próxima página
  proximaPagina(pageSize: number, lastVisible: QueryDocumentSnapshot<DocumentData>): Observable<PaginatedResult<Produto>> {
    return this.listarProdutosPaginados(pageSize, lastVisible);
  }
  
  // Método atualizado para suportar busca por nome
  async buscarProdutosPaginados(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    searchTerm?: string
  ): Promise<PaginatedResult<Produto>> {
    const user = this.auth.currentUser;
    if (!user) return { items: [], total: 0 };

    const produtosRef = collection(this.firestore, 'produtos');
    
    // Construir queries com base nos parâmetros
    let countQuery;
    if (searchTerm && searchTerm.trim() !== '') {
      searchTerm = searchTerm.toLocaleUpperCase();
      // Firebase não suporta busca LIKE nativa, então usamos >= e <= para simular
      // Isso vai buscar nomes que começam com o termo de busca
      const searchTermEnd = searchTerm + '\uf8ff';
      countQuery = query(
        produtosRef, 
        where('empresa_id', '==', user.uid),
        where('nome', '>=', searchTerm),
        where('nome', '<=', searchTermEnd)
      );
    } else {
      countQuery = query(produtosRef, where('empresa_id', '==', user.uid));
    }
    
    // Obter contagem total
    const countSnapshot = await getCountFromServer(countQuery);
    const total = countSnapshot.data().count;
    
    // Construir a query paginada
    let queryConstraints: any[] = [
      where('empresa_id', '==', user.uid),
      orderBy('nome')
    ];
    
    // Adicionar filtros de pesquisa se houver um termo
    if (searchTerm && searchTerm.trim() !== '') {
      const searchTermEnd = searchTerm + '\uf8ff';
      queryConstraints.push(where('nome', '>=', searchTerm));
      queryConstraints.push(where('nome', '<=', searchTermEnd));
    }
    
    // Adicionar startAfter para paginação
    if (startAfterDoc) {
      queryConstraints.push(startAfter(startAfterDoc));
    }
    
    // Adicionar limitação de página
    queryConstraints.push(limit(pageSize));
    
    // Executar a query
    const paginatedQuery = query(produtosRef, ...queryConstraints);
    
    const snapshot = await getDocs(paginatedQuery);
    const produtos: Produto[] = [];
    let lastVisible: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      produtos.push({
        id: doc.id,
        empresa_id: data['empresa_id'],
        nome: data['nome'],
        preco_compra: data['preco_compra'],
        preco_venda: data['preco_venda'],
        estoque: data['estoque'],
        unidadeMedida: data['unidadeMedida']
      });
      lastVisible = doc;
    });
    
    return { items: produtos, total, lastVisible };
  }

  // Método específico para buscar produtos com baixo estoque (< 10 unidades)
  async buscarProdutosBaixoEstoquePaginados(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<PaginatedResult<Produto>> {
    const user = this.auth.currentUser;
    if (!user) return { items: [], total: 0 };

    const produtosRef = collection(this.firestore, 'produtos');
    
    // Query para contagem total de produtos com baixo estoque
    const countQuery = query(
      produtosRef, 
      where('empresa_id', '==', user.uid),
      where('estoque', '<', 10)
    );
    
    // Obter contagem total
    const countSnapshot = await getCountFromServer(countQuery);
    const total = countSnapshot.data().count;
    
    // Construir a query paginada para produtos com baixo estoque
    let queryConstraints: any[] = [
      where('empresa_id', '==', user.uid),
      where('estoque', '<', 10),
      orderBy('estoque'), // Ordenar por estoque (menor primeiro)
      orderBy('nome')     // Ordenação secundária por nome
    ];
    
    // Adicionar startAfter para paginação
    if (startAfterDoc) {
      queryConstraints.push(startAfter(startAfterDoc));
    }
    
    // Adicionar limitação de página
    queryConstraints.push(limit(pageSize));
    
    // Executar a query
    const paginatedQuery = query(produtosRef, ...queryConstraints);
    const snapshot = await getDocs(paginatedQuery);
    
    const produtos: Produto[] = [];
    let lastVisible: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      produtos.push({
        id: doc.id,
        empresa_id: data['empresa_id'],
        nome: data['nome'],
        preco_compra: data['preco_compra'],
        preco_venda: data['preco_venda'],
        estoque: data['estoque'],
        unidadeMedida: data['unidadeMedida']
      });
      lastVisible = doc;
    });
    
    return { items: produtos, total, lastVisible };
  }

  adicionarProduto(produto: Produto) {
    const user = this.auth.currentUser;
    if (!user) return;
    
    // Converter strings para uppercase antes de salvar
    const produtoToSave = {
      ...produto,
      nome: produto.nome.toLocaleUpperCase(),
      empresa_id: user.uid
    };

    return addDoc(collection(this.firestore, 'produtos'), produtoToSave);
  }

  async atualizarProduto(id: string, produto: Partial<Produto>) {
    // Converter strings para uppercase antes de atualizar
    const produtoToUpdate = { ...produto };
    if (produtoToUpdate.nome) {
      produtoToUpdate.nome = produtoToUpdate.nome.toLocaleUpperCase();
    }

    const produtoDoc = doc(this.firestore, 'produtos', id);
    let result = await updateDoc(produtoDoc, produtoToUpdate);
    return result;
  }

  excluirProduto(id: string) {
    const produtoDoc = doc(this.firestore, `produtos/${id}`);
    return deleteDoc(produtoDoc) ;
  }
  // Método para ajustar estoque com histórico
  async ajustarEstoque(produto: Produto, quantidadeAjuste: number) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const novoEstoque = produto.estoque + quantidadeAjuste;
    
    // Criar o registro de ajuste de estoque
    const ajusteEstoque: AjusteEstoque = {
      produto_id: produto.id,
      produto_nome: produto.nome,
      empresa_id: user.uid,
      estoque_anterior: produto.estoque,
      quantidade_ajuste: quantidadeAjuste,
      estoque_novo: novoEstoque,
      data: new Date(),
      usuario_id: user.uid
    };

    // Atualizar o estoque do produto
    await this.atualizarProduto(produto.id, { estoque: novoEstoque });
    
    // Registrar o histórico do ajuste
    await addDoc(collection(this.firestore, 'ajustes_estoque'), ajusteEstoque);
    
    return novoEstoque;
  }

  // Método para listar histórico de ajustes de estoque
  listarAjustesEstoque(): Observable<AjusteEstoque[]> {
    const user = this.auth.currentUser;
    if (!user) return of([]);

    try {
      const ajustesRef = collection(this.firestore, 'ajustes_estoque');
      const q = query(
        ajustesRef, 
        where('empresa_id', '==', user.uid),
        orderBy('data', 'desc')
      );
      
      return from(getDocs(q)).pipe(
        map(snapshot => {
          const ajustes: AjusteEstoque[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            ajustes.push({
              id: doc.id,
              produto_id: data['produto_id'],
              produto_nome: data['produto_nome'],
              empresa_id: data['empresa_id'],
              estoque_anterior: data['estoque_anterior'],
              quantidade_ajuste: data['quantidade_ajuste'],
              estoque_novo: data['estoque_novo'],
              data: data['data'],
              usuario_id: data['usuario_id']
            });
          });
          return ajustes;
        })
      );
    } catch (error) {
      console.error('Erro ao criar query de ajustes de estoque:', error);
      return of([]);
    }
  }

  // Método para buscar um produto específico por ID
  async buscarProdutoPorId(id: string): Promise<Produto | null> {
    const user = this.auth.currentUser;
    if (!user) return null;

    const produtosRef = collection(this.firestore, 'produtos');
    const q = query(produtosRef, where('empresa_id', '==', user.uid));
    const querySnapshot = await getDocs(q);
    
    const produto = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Produto))
      .find(p => p.id === id);
    
    return produto || null;
  }
}
