import { Component } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { BaseComponent } from 'src/app/shared/components/base.component';
import { Produto, ProdutoService } from 'src/app/core/services/produto.service';
import { UnidadeMedidaService } from 'src/app/core/services/unidade-medida.service';
import { Venda, VendaService } from 'src/app/core/services/venda.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';
import { QueryDocumentSnapshot, DocumentData } from '@angular/fire/firestore';

@Component({
  selector: 'app-venda',
  templateUrl: './venda.component.html',
  styleUrls: ['./venda.component.css']
})
export class VendaComponent extends BaseComponent<Venda> {
  produtos: Produto[] = [];
  unidades: any[] = [];
  produtosVenda: any[] = [];

  constructor(
    messageService: MessageService,
    loaderService: LoaderService,
    private vendaService: VendaService,
    private produtoService: ProdutoService,
    private unidadeService: UnidadeMedidaService
  ) {
    super(loaderService, messageService);
  }

  override initializePaginationConfig(): void {
    this.paginationConfig = { 
      pageSize: 10, 
      orderByField: 'data' 
    };
    this.pageSize = this.paginationConfig.pageSize;
    this.pageSizeOptions = [5, 10, 20, 50];
  }

  override onLoadValues(): void {
    this.unidadeService.listarUnidades().subscribe(data => {
      this.unidades = data;
    });

    this.produtoService.listarProdutos().subscribe(data => {
      this.produtos = data;
    });
  }

  override initializeForm(): void {
    this.form = new UntypedFormGroup({
      id: new UntypedFormControl({ value: '', disabled: true }),
      cliente: new UntypedFormControl(undefined, Validators.compose([Validators.required, Validators.maxLength(50)])),
      produto: new UntypedFormControl(undefined, Validators.required),
      quantidade: new UntypedFormControl(undefined, Validators.required),
      unidadeMedida: new UntypedFormControl(undefined, Validators.required),
      data: new UntypedFormControl(undefined, Validators.required),
      preco: new UntypedFormControl(undefined, Validators.required),
    });
  }

  // Implementação do método abstrato do BaseComponent para buscar itens paginados com suporte a busca
  override async buscarItensPaginados(
    pageSize: number, 
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
    searchTerm?: string
  ) {
    return this.vendaService.buscarVendasPaginadas(pageSize, startAfterDoc, searchTerm);
  }

  // Método para listagem simples (sem paginação) - mantido para compatibilidade
  override listarItens(): void {
    this.vendaService.listarVendas().subscribe(data => {
      this.items = data;
      this.loaderService.closeLoading();
    });
  }

  override saveItem(): void {
    if (this.form.invalid || this.produtosVenda.length === 0) {
      this.messageService.info("Preencha todos os campos obrigatórios e adicione pelo menos um produto.");
      return;
    }

    const venda: Venda = {
      produtos: this.produtosVenda,
      data: this.form.get('data')?.value,
      cliente: this.form.get('cliente')?.value
    } as Venda;

    // Se estiver no modo de edição, preservar o ID da venda original
    if (this.onEdit) {
      venda.id = this.form.get('id')?.value;
    }

    this.loaderService.showLoading();
    let valorTotal: number = 0;
    venda.produtos.forEach(p => {
      valorTotal = Number(p.total) + Number(valorTotal);
    });

    venda.valor_total = valorTotal;

    const atualizarEstoque = async () => {
      for (const produto of venda.produtos) {
        const produtoAtual = this.produtos.find(p => p.id === produto.produto_id);
        if (produtoAtual) {
          const novoEstoque = produtoAtual.estoque - produto.quantidade;
          if (novoEstoque < 0) {
            this.messageService.info(`Estoque insuficiente para o produto: ${produtoAtual.nome}. Estoque atual: ${produtoAtual.estoque}, quantidade vendida: ${produto.quantidade}`);
          }
          await this.produtoService.atualizarProduto(produto.produto_id, { estoque: novoEstoque });
        }
      }
    };

    if (this.onEdit) {
      const vendaId = venda.id;
      this.vendaService.atualizarVenda(vendaId, venda).then(async () => {
        await atualizarEstoque();
        this.aposSalvar();
      }).catch(error => {
        this.loaderService.closeLoading();
        this.messageService.error();
        console.error('Erro ao atualizar venda:', error);
      });
    } else {
      this.vendaService.criarVenda(venda)?.then(async () => {
        await atualizarEstoque();
        this.aposSalvar();
      }).catch((error) => {
        this.loaderService.closeLoading();
        this.messageService.error();
        console.error('Erro ao criar venda:', error);
      });
    }
  }

  override aposSalvar(): void {
    this.listarItensPaginados(); // Atualizar a lista de vendas com paginação
    this.produtosVenda = []; // Limpar os produtos adicionados
    this.onCreate = false;
    this.onEdit = false;
    this.form.reset();
    this.messageService.success();
  }

  override onCancel(): void {
    this.onEdit = false;
    this.onCreate = false;
    this.produtosVenda = []; // Limpar os produtos adicionados ao cancelar
    this.form.reset();
  }

  override onCreateItem(): void {
    this.onCreate = true;
    this.onEdit = false;
    this.form.reset();
    this.produtosVenda = []; // Limpar produtos ao criar nova venda
  }

  override onEditItem(venda: Venda): void {
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

  // Método para lidar com a exclusão de vendas
  onDeleteItem(): void {
    this.deleteItem(() => this.vendaService.excluirVenda(this.itemToDelete!.id));
  }

  onSelectProduto() {
    const produtoSelecionado = this.form.get('produto')?.value;
    if (produtoSelecionado) {
      // Preencher o preço de venda do produto automaticamente
      this.form.get('preco')?.setValue(produtoSelecionado.preco_venda);
      
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
      preco_compra: produto.preco_compra, // Use preco_compra
      preco_venda: preco, // Use preco_venda
      unidade_medida: unidadeMedida,
      total: preco * quantidade // Calculate total using preco  
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

  toggleExpand(item: any) {
    item.expandido = !item.expandido;
  }
}
