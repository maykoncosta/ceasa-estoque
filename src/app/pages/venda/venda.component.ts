import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Produto, ProdutoService } from 'src/app/core/services/produto.service';
import { UnidadeMedidaService } from 'src/app/core/services/unidade-medida.service';
import { Venda, VendaService } from 'src/app/core/services/venda.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';

@Component({
  selector: 'app-venda',
  templateUrl: './venda.component.html',
  styleUrls: ['./venda.component.css']
})
export class VendaComponent implements OnInit {

  onEdit: boolean = false;
  onCreate: boolean = false;
  form!: UntypedFormGroup;
  showDeleteModal = false;
  itemToDelete: Venda | any = undefined;
  produtos: Produto[] = [];
  unidades: any[] = [];
  vendas: Venda[] = [];
  produtosVenda: any[] = [];

  constructor(
    private vendaService: VendaService,
    private loaderService: LoaderService,
    private messageService: MessageService,
    private produtoService: ProdutoService,
    private unidadeService: UnidadeMedidaService
  ) { }

  ngOnInit(): void {
    this.form = new UntypedFormGroup({
      id: new UntypedFormControl({ value: '', disabled: true }),
      cliente: new UntypedFormControl(undefined, Validators.compose([Validators.required, Validators.maxLength(15)])),
      produto: new UntypedFormControl(undefined, Validators.compose([Validators.required])),
      quantidade: new UntypedFormControl(undefined, Validators.required),
      unidadeMedida: new UntypedFormControl(undefined, Validators.required),
      data: new UntypedFormControl(undefined, Validators.required),
      preco: new UntypedFormControl(undefined, Validators.required),
    });
    this.listarVendas();
    this.loadItems();
  }

  listarVendas() {
    this.vendaService.listarVendas().subscribe(data => {
      this.vendas = data;
      this.vendas.forEach(v => {
      })
      this.loaderService.closeLoading();
    })
  }

  loadItems() {
    this.unidadeService.listarUnidades().subscribe(data => {
      this.unidades = data;
    })

    this.produtoService.listarProdutos().subscribe(data => {
      this.produtos = data;
    })
  }

  async registrarVenda() {
    let venda: Venda = {
      produtos: this.produtosVenda,
      data: this.form.get('data')?.value,
      cliente: this.form.get('cliente')?.value
    } as Venda;

    // Se estiver no modo de edição, preservar o ID da venda original
    if (this.onEdit) {
      venda.id = this.form.get('id')?.value;
    }

    if (venda?.cliente.length > 0 && venda?.data && venda.produtos) {
      this.loaderService.showLoading();
      let valorTotal: number = 0;
      venda.produtos.forEach(p => {
        valorTotal = Number(p.total) + Number(valorTotal)
      });

      venda.valor_total = valorTotal;
      this.loaderService.closeLoading();
      
      if (this.onEdit) {
        // Preserve o ID da venda para atualização
        const vendaId = venda.id;
        
        this.vendaService.atualizarVenda(vendaId, venda).then(() => {
          this.aposSalvar();
          this.listarVendas(); // Atualizar a lista de vendas após salvar
        }).catch(error => {
          this.loaderService.closeLoading();
          this.messageService.error();
          console.error('Erro ao atualizar venda:', error);
        });
      } else {
        this.vendaService.criarVenda(venda)?.then(() => {
          this.aposSalvar();
          this.listarVendas(); // Atualizar a lista de vendas após salvar
        }).catch((error) => {
          this.loaderService.closeLoading();
          this.messageService.error();
          console.error('Erro ao criar venda:', error);
        });
      }
    } else {
      this.messageService.info("Campos Obrigatórios Pendentes.")
    }
  }

  aposSalvar() {
    this.listarVendas(); // Atualizar a lista de vendas
    this.produtosVenda = []; // Limpar os produtos adicionados
    this.onCreate = false;
    this.onEdit = false;
    this.form.reset();
    this.messageService.success();
  }

  onCancel() {
    this.onEdit = false;
    this.onCreate = false;
    this.produtosVenda = []; // Limpar os produtos adicionados ao cancelar
    this.form.reset();
  }

  onCreateItem() {
    this.onCreate = true;
    this.onEdit = false;
    this.form.reset();
  }

  onEditItem(venda: Venda) {
    this.onEdit = true;
    this.onCreate = false;
    // Preencher o formulário com os dados básicos da venda
    this.form.patchValue({
      id: venda.id,
      cliente: venda.cliente,
      data: venda.data
    });
    
    // Carregar os produtos da venda e garantir que temos o ID da venda
    this.produtosVenda = venda.produtos ? JSON.parse(JSON.stringify(venda.produtos)) : [];
    
    // Garantir que o ID da venda seja mantido para atualização
    if (venda.id) {
      (venda as any).id = venda.id;
    }
  }

  onDeleteItem(produto: Venda) {
    this.showDeleteModal = true;
    this.itemToDelete = produto;
  }

  onSelectProduto() {
    const produtoSelecionado = this.form.get('produto')?.value;
    if (produtoSelecionado) {
      // Preencher o preço do produto automaticamente
      this.form.get('preco')?.setValue(produtoSelecionado.preco);
      
      // Preencher a unidade de medida automaticamente
      if (produtoSelecionado.unidadeMedida) {
        this.form.get('unidadeMedida')?.setValue(produtoSelecionado.unidadeMedida);
      }
      
      // Focar no campo de quantidade após selecionar o produto
      setTimeout(() => {
        const qtdInput = document.getElementById('quantidade');
        if (qtdInput) {
          qtdInput.focus();
          // Definir uma quantidade padrão de 1
          if (!this.form.get('quantidade')?.value) {
            this.form.get('quantidade')?.setValue(1);
          }
        }
      }, 100);
    }
  }

  adicionarProduto() {
    // Verificar se todos os campos necessários estão preenchidos
    const produto = this.form.get('produto')?.value;
    const quantidade = this.form.get('quantidade')?.value;
    const preco = this.form.get('preco')?.value;
    const unidadeMedida = this.form.get('unidadeMedida')?.value;
    
    if (!produto || !quantidade || !preco || !unidadeMedida) {
      this.messageService.info("Preencha todos os campos do produto");
      return;
    }
    
    if (quantidade <= 0) {
      this.messageService.info("A quantidade deve ser maior que zero");
      return;
    }
    
    // Criar o item do produto
    const novoProduto = {
      produto_id: produto.id,
      nome: produto.nome,
      quantidade: quantidade,
      preco_unitario: preco,
      unidade_medida: unidadeMedida,
      total: preco * quantidade
    };
    
    // Adicionar à lista
    this.produtosVenda.push(novoProduto);
    this.messageService.success(`${novoProduto.nome} adicionado à venda`);

    // Limpar os campos do formulário
    this.form.controls['produto'].setValue(undefined);
    this.form.controls['quantidade'].setValue(undefined);
    this.form.controls['preco'].setValue(undefined);
    this.form.controls['unidadeMedida'].setValue(undefined);
  }

  removerProduto(index: number) {
    if (index >= 0 && index < this.produtosVenda.length) {
      this.produtosVenda.splice(index, 1);
      this.messageService.info("Produto removido da venda");
    }
  }

  deleteItem() {
    if (this.itemToDelete) {
      this.loaderService.showLoading();
      this.vendaService.excluirVenda(this.itemToDelete.id).then(() => {
        this.itemToDelete = undefined;
        this.showDeleteModal = false;
        this.messageService.success();
        this.listarVendas();
      }).catch(() => {
        this.messageService.error();
      })
    }
  }


  toggleExpand(item: any) {
    item.expandido = !item.expandido;
  }

}
