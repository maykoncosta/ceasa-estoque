import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { addDoc, collection, collectionData, deleteDoc, doc, Firestore, query, updateDoc, where } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { UnidadeMedida } from './unidade-medida.service';

export interface Produto {
  empresa_id: string;
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  unidadeMedida: UnidadeMedida
}

@Injectable({
  providedIn: 'root'
})
export class ProdutoService {

  constructor(private firestore: Firestore, private auth: Auth) { }

  listarProdutos(): Observable<Produto[]> {
    const user = this.auth.currentUser;
    if (!user) return of([]);

    const produtosRef = collection(this.firestore, 'produtos');
    const q = query(produtosRef, where('empresa_id', '==', user.uid));
    return collectionData(q, { idField: 'id' }) as Observable<Produto[]>;
  }


  adicionarProduto(produto: Produto) {
    const user = this.auth.currentUser;
    if (!user) return;
    produto.empresa_id = user.uid;

    return addDoc(collection(this.firestore, 'produtos'), produto);
  }

  async atualizarProduto(id: string, produto: Partial<Produto>) {
    const produtoDoc = doc(this.firestore, 'produtos', id);
    let result = await updateDoc(produtoDoc, produto);
    return result;
  }

  excluirProduto(id: string) {
    const produtoDoc = doc(this.firestore, `produtos/${id}`);
    return deleteDoc(produtoDoc) ;
  }
}
