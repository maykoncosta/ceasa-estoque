import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { addDoc, collection, collectionData, deleteDoc, doc, Firestore, getDocs, query, updateDoc, where } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';

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

    const unidadesRef = collection(this.firestore, 'unidades');
    const q = query(unidadesRef, where('empresa_id', '==', user.uid));
    return collectionData(q, { idField: 'id' }) as Observable<UnidadeMedida[]>;
  }

  async adicionarUnidade(unidade: UnidadeMedida) {
    const user = this.auth.currentUser;
    if (!user) return;
    unidade.empresa_id = user.uid;

    const unidadesRef = collection(this.firestore, 'unidades');

    const q = query(unidadesRef,
      where('nome', '==', unidade.nome),
      where('empresa_id', '==', user.uid)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      throw new Error('Já existe uma unidade com esse nome.');
    }

    return addDoc(collection(this.firestore, 'unidades'), unidade);
  }

  async atualizarUnidade(id: string, unidade: Partial<UnidadeMedida>) {
    const unidadeDoc = doc(this.firestore, 'unidades', id);
    return await updateDoc(unidadeDoc, unidade);
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
}
