import { Component } from '@angular/core';

export interface Produto {
  id: number;
  nome: string;
  descricao: string;
  preco: any;
  unidadeMedida: any;
}

@Component({
  selector: 'app-produto',
  templateUrl: './produto.component.html',
  styleUrls: ['./produto.component.css']
})
export class ProdutoComponent {

  id: number = 1;
  nome: string = '';
  preco: any = '';
  descricao: any = '';
  unidadeMedida: any = '';

  onEdit: boolean = false;
  onCreate: boolean = false;

  produtos: Produto[] = [{id: 1, nome: 'MELANCIA', preco: '0.70', unidadeMedida: 'KG', descricao: 'Melancia de Juazeiro'} as Produto,
    {id: 2 , nome: 'MORANGO', preco: '10.00', unidadeMedida: 'BANDEJA', descricao: 'Morango de Piancó'} as Produto
  ];

  async onCreateProduto() {
    let produto = {
      id: this.id + 1,
      nome: this.nome,
      preco: this.preco,
      unidadeMedida: this.unidadeMedida
    }

    this.produtos.push(produto as Produto);

    console.log(this.produtos)
    this.id ++;
  }

}
