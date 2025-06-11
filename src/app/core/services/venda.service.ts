import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { addDoc, collection, collectionData, deleteDoc, doc, Firestore, getDocs, query, updateDoc, where } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';

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
    venda.empresa_id = user.uid;

    return addDoc(collection(this.firestore, 'vendas'), venda);
  }

  async atualizarVenda(id: string, venda: Partial<Venda>) {
    const vendaDoc = doc(this.firestore, 'vendas', id);
    return await updateDoc(vendaDoc, venda);
  }

  async excluirVenda(id: string) {

    const vendaDoc = doc(this.firestore, `vendas/${id}`);

    return deleteDoc(vendaDoc);
  }
}
