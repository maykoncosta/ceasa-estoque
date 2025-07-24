import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { addDoc, collection, collectionData, deleteDoc, doc, Firestore, getDocs, query, updateDoc, where, orderBy, limit, startAfter, getCountFromServer, QueryDocumentSnapshot, DocumentData, or, and } from '@angular/fire/firestore';
import { Observable, of, from, map } from 'rxjs';
import { PaginatedResult } from 'src/app/shared/models/pagination.model';

export interface UnidadeMedida {
  id: string;
  nome: string;
  descricao: string;
  empresa_id: string
}

@Injectable({
  providedIn: 'root'
})
export class UnidadeMedidaService {

  constructor(private firestore: Firestore, private auth: Auth) { }

  listarUnidades(): Observable<UnidadeMedida[]> {
    const user = this.auth.currentUser;
    if (!user) return of([]);

    try {
      const unidadesRef = collection(this.firestore, 'unidades');
      const q = query(unidadesRef, where('empresa_id', '==', user.uid));
      
      return from(getDocs(q)).pipe(
        map(snapshot => {
          const unidades: UnidadeMedida[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            unidades.push({
              id: doc.id,
              nome: data['nome'],
              descricao: data['descricao'],
              empresa_id: data['empresa_id']
            });
          });
          return unidades.sort((a, b) => a.nome.localeCompare(b.nome));
        })
      );
    } catch (error) {
      console.error('Erro ao criar query de unidades:', error);
      return of([]);
    }
  }

  async adicionarUnidade(unidade: UnidadeMedida) {
    const user = this.auth.currentUser;
    if (!user) return;
    
    // Converter strings para uppercase antes de salvar
    const unidadeToSave = {
      ...unidade,
      nome: unidade.nome.toLocaleUpperCase(),
      descricao: unidade.descricao.toLocaleUpperCase(),
      empresa_id: user.uid
    };

    const unidadesRef = collection(this.firestore, 'unidades');

    const q = query(unidadesRef,
      where('nome', '==', unidadeToSave.nome),
      where('empresa_id', '==', user.uid)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      throw new Error('Já existe uma unidade com esse nome.');
    }

    return addDoc(collection(this.firestore, 'unidades'), unidadeToSave);
  }

  async atualizarUnidade(id: string, unidade: Partial<UnidadeMedida>) {
    // Converter strings para uppercase antes de atualizar
    const unidadeToUpdate = { ...unidade };
    if (unidadeToUpdate.nome) {
      unidadeToUpdate.nome = unidadeToUpdate.nome.toLocaleUpperCase();
    }
    if (unidadeToUpdate.descricao) {
      unidadeToUpdate.descricao = unidadeToUpdate.descricao.toLocaleUpperCase();
    }

    const unidadeDoc = doc(this.firestore, 'unidades', id);
    return await updateDoc(unidadeDoc, unidadeToUpdate);
  }

  async excluirUnidade(id: string, nome: string) {
    const user = this.auth.currentUser;
    if (!user) return;
    
    const unidadeDoc = doc(this.firestore, `unidades/${id}`);
    const produtosRef = collection(this.firestore, 'produtos');

    const q = query(produtosRef,
      where('unidadeMedida', '==', nome),
      where('empresa_id', '==', user.uid)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      throw new Error('Não é Possível Excluir Essa Unidade Porque ela é Utilizada no Sistema.');
    }

    return deleteDoc(unidadeDoc);
  }

  // Novo método para busca paginada de unidades
  async buscarUnidadesPaginadas(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    searchTerm?: string
  ): Promise<PaginatedResult<UnidadeMedida>> {
    const user = this.auth.currentUser;
    if (!user) return { items: [], total: 0 };

    const unidadesRef = collection(this.firestore, 'unidades');
    
    // Construir queries com base nos parâmetros
    let countQuery;
    if (searchTerm && searchTerm.trim() !== '') {
      const upperSearchTerm = searchTerm.toLocaleUpperCase();
      const searchTermEnd = upperSearchTerm + '\uf8ff';
      
      // Query usando 'or' para buscar por nome OU descrição
      countQuery = query(
        unidadesRef,
        and(
          where('empresa_id', '==', user.uid),
          or(
            and(
              where('nome', '>=', upperSearchTerm),
              where('nome', '<=', searchTermEnd)
            ),
            and(
              where('descricao', '>=', upperSearchTerm),
              where('descricao', '<=', searchTermEnd)
            )
          )
        )
      );
    } else {
      countQuery = query(unidadesRef, where('empresa_id', '==', user.uid));
    }
    
    // Obter contagem total
    const countSnapshot = await getCountFromServer(countQuery);
    const total = countSnapshot.data().count;
    
    // Para a query paginada, vamos simplificar para buscar apenas por nome
    // pois o Firebase tem limitações com or + orderBy + startAfter
    let queryConstraints: any[] = [
      where('empresa_id', '==', user.uid),
      orderBy('nome')
    ];
    
    // Adicionar filtros de pesquisa se houver um termo (apenas por nome para paginação)
    if (searchTerm && searchTerm.trim() !== '') {
      const upperSearchTerm = searchTerm.toLocaleUpperCase();
      const searchTermEnd = upperSearchTerm + '\uf8ff';
      queryConstraints.push(where('nome', '>=', upperSearchTerm));
      queryConstraints.push(where('nome', '<=', searchTermEnd));
    }
    
    // Adicionar startAfter para paginação
    if (startAfterDoc) {
      queryConstraints.push(startAfter(startAfterDoc));
    }
    
    // Adicionar limitação de página
    queryConstraints.push(limit(pageSize));
    
    // Executar a query
    const paginatedQuery = query(unidadesRef, ...queryConstraints);
    
    const snapshot = await getDocs(paginatedQuery);
    const unidades: UnidadeMedida[] = [];
    let lastVisible: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      unidades.push({
        id: doc.id,
        empresa_id: data['empresa_id'],
        nome: data['nome'],
        descricao: data['descricao']
      });
      lastVisible = doc;
    });
    
    return { items: unidades, total, lastVisible };
  }
}
