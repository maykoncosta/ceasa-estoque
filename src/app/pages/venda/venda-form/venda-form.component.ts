import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Produto, ProdutoService } from 'src/app/core/services/produto.service';
import { UnidadeMedidaService } from 'src/app/core/services/unidade-medida.service';
import { Venda, VendaService } from 'src/app/core/services/venda.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';

@Component({
  selector: 'app-venda-form',
  templateUrl: './venda-form.component.html',
  styleUrls: ['./venda-form.component.css']
})
export class VendaFormComponent implements OnInit {
  form!: UntypedFormGroup;
  produtos: Produto[] = [];
  unidades: any[] = [];
  produtosVenda: any[] = [];
  isEditing = false;
  vendaId: string | null = null;
  loading = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private vendaService: VendaService,
    private produtoService: ProdutoService,
    private unidadeService: UnidadeMedidaService,
    private loaderService: LoaderService,
    private messageService: MessageService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadValues();
    
    // Verificar se é edição através do ID na rota
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.vendaId = params['id'];
        this.isEditing = true;
        if (this.vendaId) {
          this.loadVenda(this.vendaId);
        }
      }
    });
  }

  initializeForm(): void {
    this.form = new UntypedFormGroup({
      cliente: new UntypedFormControl('', Validators.compose([Validators.required, Validators.maxLength(50)])),
      produto: new UntypedFormControl('', Validators.required),
      quantidade: new UntypedFormControl('', [Validators.required, Validators.min(0.01)]),
      unidadeMedida: new UntypedFormControl('', Validators.required),
      data: new UntypedFormControl(this.getToday(), Validators.required),
      preco: new UntypedFormControl('', [Validators.required, Validators.min(0.01)]),
    });
  }

  loadValues(): void {
    this.loading = true;
    
    // Carregar unidades de medida
    this.unidadeService.listarUnidades().subscribe({
      next: (data) => {
        this.unidades = data;
      },
      error: (error) => {
        console.error('Erro ao carregar unidades:', error);
        this.messageService.error('Erro ao carregar unidades de medida');
      }
    });

    // Carregar produtos
    this.produtoService.listarProdutos().subscribe({
      next: (data) => {
        this.produtos = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erro ao carregar produtos:', error);
        this.messageService.error('Erro ao carregar produtos');
        this.loading = false;
      }
    });
  }

  loadVenda(id: string): void {
    this.loaderService.showLoading();
    
    this.vendaService.listarVendas().subscribe({
      next: (vendas) => {
        const venda = vendas.find(v => v.id === id);
        if (venda) {
          this.form.patchValue({
            cliente: venda.cliente,
            data: venda.data
          });
          
          this.produtosVenda = venda.produtos ? JSON.parse(JSON.stringify(venda.produtos)) : [];
        } else {
          this.messageService.error('Venda não encontrada');
          this.voltarParaLista();
        }
        this.loaderService.closeLoading();
      },
      error: (error) => {
        console.error('Erro ao carregar venda:', error);
        this.messageService.error('Erro ao carregar venda');
        this.loaderService.closeLoading();
        this.voltarParaLista();
      }
    });
  }

  onSelectProduto(): void {
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

  adicionarProduto(): void {
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

    if (preco <= 0) {
      this.messageService.info("O preço deve ser maior que zero");
      return;
    }
    
    // Verificar se há estoque suficiente
    if (produto.estoque < quantidade) {
      this.messageService.info(`Estoque insuficiente para ${produto.nome}. Estoque disponível: ${produto.estoque}`);
      return;
    }
    
    // Criar o item do produto
    const novoProduto = {
      produto_id: produto.id,
      nome: produto.nome,
      quantidade: quantidade,
      preco_compra: produto.preco_compra,
      preco_venda: preco,
      unidade_medida: unidadeMedida.nome,
      total: preco * quantidade
    };
    
    // Adicionar à lista
    this.produtosVenda.push(novoProduto);
    this.messageService.success(`${novoProduto.nome} adicionado à venda`);

    // Limpar os campos do produto no formulário
    this.form.patchValue({
      produto: '',
      quantidade: '',
      preco: '',
      unidadeMedida: ''
    });
  }

  removerProduto(index: number): void {
    if (index >= 0 && index < this.produtosVenda.length) {
      const produto = this.produtosVenda[index];
      this.produtosVenda.splice(index, 1);
      this.messageService.info(`${produto.nome} removido da venda`);
    }
  }

  calcularTotal(): number {
    return this.produtosVenda.reduce((total, produto) => total + produto.total, 0);
  }

  salvarVenda(): void {
    if (this.form.invalid) {
      this.messageService.info("Preencha todos os campos obrigatórios.");
      return;
    }

    if (this.produtosVenda.length === 0) {
      this.messageService.info("Adicione pelo menos um produto à venda.");
      return;
    }

    const venda: Venda = {
      produtos: this.produtosVenda,
      data: this.form.get('data')?.value,
      cliente: this.form.get('cliente')?.value,
      valor_total: this.calcularTotal()
    } as Venda;

    this.loaderService.showLoading();

    const atualizarEstoque = async () => {
      for (const produto of venda.produtos) {
        const produtoAtual = this.produtos.find(p => p.id === produto.produto_id);
        if (produtoAtual) {
          const novoEstoque = produtoAtual.estoque - produto.quantidade;
          if (novoEstoque < 0) {
            throw new Error(`Estoque insuficiente para o produto: ${produtoAtual.nome}. Estoque atual: ${produtoAtual.estoque}, quantidade vendida: ${produto.quantidade}`);
          }
          await this.produtoService.atualizarProduto(produto.produto_id, { estoque: novoEstoque });
        }
      }
    };

    if (this.isEditing && this.vendaId) {
      venda.id = this.vendaId;
      this.vendaService.atualizarVenda(this.vendaId, venda).then(async () => {
        await atualizarEstoque();
        this.messageService.success('Venda atualizada com sucesso!');
        this.voltarParaLista();
      }).catch(error => {
        this.loaderService.closeLoading();
        this.messageService.error('Erro ao atualizar venda');
        console.error('Erro ao atualizar venda:', error);
      });
    } else {
      this.vendaService.criarVenda(venda)?.then(async () => {
        await atualizarEstoque();
        this.messageService.success('Venda criada com sucesso!');
        this.voltarParaLista();
      }).catch((error) => {
        this.loaderService.closeLoading();
        this.messageService.error('Erro ao criar venda');
        console.error('Erro ao criar venda:', error);
      });
    }
  }

  voltarParaLista(): void {
    this.router.navigate(['/vendas']);
  }

  hasFieldError(form: UntypedFormGroup, field: string, error: string, ngForm: any): boolean {
    const formField = form.get(field);
    return (
      (formField?.hasError(error) && 
      (formField.touched || formField.dirty || ngForm?.submitted)) || false
    );
  }

  private getToday(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
