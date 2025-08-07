import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Produto, ProdutoService } from 'src/app/core/services/produto.service';
import { UnidadeMedidaService } from 'src/app/core/services/unidade-medida.service';
import { Venda, VendaService } from 'src/app/core/services/venda.service';
import { Cliente, ClienteService } from 'src/app/core/services/cliente.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { MessageService } from 'src/app/shared/services/message.service';

@Component({
  selector: 'app-venda-form',
  templateUrl: './venda-form.component.html',
  styleUrls: ['./venda-form.component.css']
})
export class VendaFormComponent implements OnInit {
  form!: UntypedFormGroup;
  formProdutos!: UntypedFormGroup;
  produtos: Produto[] = [];
  clientes: Cliente[] = [];
  unidades: any[] = [];
  produtosVenda: any[] = [];
  isEditing = false;
  vendaId: string | null = null;
  loading = false;

  // Autocomplete vars
  produtosFiltrados: Produto[] = [];
  showDropdown = false;
  produtoSelecionado: Produto | null = null;

  // Autocomplete vars para clientes
  clientesFiltrados: Cliente[] = [];
  showClienteDropdown = false;
  clienteSelecionado: Cliente | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private vendaService: VendaService,
    private produtoService: ProdutoService,
    private unidadeService: UnidadeMedidaService,
    private clienteService: ClienteService,
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
      cliente: new UntypedFormControl('', Validators.compose([Validators.required])),
      data: new UntypedFormControl(this.getToday(), Validators.required),
      observacao: new UntypedFormControl(''), // Campo opcional
    }); this.formProdutos = new UntypedFormGroup({
      produto: new UntypedFormControl(''),
      quantidade: new UntypedFormControl('', [Validators.required, Validators.min(0.01)]),
      unidadeMedida: new UntypedFormControl('', Validators.required),
      preco: new UntypedFormControl('', [Validators.required, Validators.min(0.01)]),
    });
  }

  loadValues(): void {
    this.loading = true;    // Carregar clientes
    this.clienteService.listarClientes().subscribe({
      next: (data) => {
        this.clientes = data;
        this.clientesFiltrados = data;
      },
      error: (error) => {
        console.error('Erro ao carregar clientes:', error);
        this.messageService.error('Erro ao carregar clientes');
      }
    });

    // Carregar unidades de medida
    this.unidadeService.listarUnidades().subscribe({
      next: (data) => {
        this.unidades = data;
      },
      error: (error) => {
        console.error('Erro ao carregar unidades:', error);
        this.messageService.error('Erro ao carregar unidades de medida');
      }
    });    // Carregar produtos
    this.produtoService.listarProdutos().subscribe({
      next: (data) => {
        this.produtos = data;
        this.produtosFiltrados = data;
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
        const venda = vendas.find(v => v.id === id);        if (venda) {
          // Converter a data para o formato correto do input date
          let dataFormatada = '';
          if (venda.data) {
            try {
              const dataObj = venda.data.toDate ? venda.data.toDate() : new Date(venda.data);
              // Usar getFullYear, getMonth, getDate para evitar problemas de fuso horário
              const year = dataObj.getFullYear();
              const month = String(dataObj.getMonth() + 1).padStart(2, '0');
              const day = String(dataObj.getDate()).padStart(2, '0');
              dataFormatada = `${year}-${month}-${day}`;
            } catch (error) {
              console.error('Erro ao formatar data:', error);
              dataFormatada = this.getToday();
            }
          } else {
            dataFormatada = this.getToday();
          }

          this.form.patchValue({
            cliente: venda.cliente,
            data: dataFormatada,
            observacao: venda.observacao || ''
          });

          // Definir cliente selecionado para o autocomplete
          this.clienteSelecionado = this.clientes.find(c => c.nome === venda.cliente) || null;

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

  // Autocomplete methods
  onProdutoInputChange(event: any): void {
    const valor = event.target.value;
    this.formProdutos.get('produto')?.setValue(valor);

    // Verificar se o valor digitado corresponde a um produto selecionado
    if (this.produtoSelecionado && this.produtoSelecionado.nome !== valor) {
      this.produtoSelecionado = null;
      this.limparCamposProduto();
    }

    if (valor.length > 0) {
      this.produtosFiltrados = this.produtos.filter(produto =>
        produto.nome.toLowerCase().includes(valor.toLowerCase())
      ).slice(0, 10); // Limitar a 10 resultados para performance
      this.showDropdown = this.produtosFiltrados.length > 0;
    } else {
      this.produtosFiltrados = [];
      this.showDropdown = false;
      this.produtoSelecionado = null;
      this.limparCamposProduto();
    }
  } selecionarProduto(produto: Produto): void {
    this.produtoSelecionado = produto;
    this.formProdutos.get('produto')?.setValue(produto.nome);
    this.showDropdown = false;

    // Preencher dados automaticamente
    this.formProdutos.get('preco')?.setValue(produto.preco_venda);

    // Definir a unidade de medida do produto (não editável)
    if (produto.unidadeMedida) {
      this.formProdutos.get('unidadeMedida')?.setValue(produto.unidadeMedida);
    } else {
      this.formProdutos.get('unidadeMedida')?.setValue('N/A');
    }

    // Focar no campo quantidade
    setTimeout(() => {
      const qtdInput = document.getElementById('quantidade');
      if (qtdInput) {
        qtdInput.focus();
        if (!this.formProdutos.get('quantidade')?.value) {
          this.formProdutos.get('quantidade')?.setValue(1);
        }
      }
    }, 100);
  }

  onProdutoBlur(): void {
    // Delay para permitir clique na opção
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }

  onProdutoFocus(): void {
    const valor = this.formProdutos.get('produto')?.value || '';
    if (valor.length > 0) {
      this.produtosFiltrados = this.produtos.filter(produto =>
        produto.nome.toLowerCase().includes(valor.toLowerCase())
      ).slice(0, 10);
      this.showDropdown = this.produtosFiltrados.length > 0;
    }
  }
  limparCamposProduto(): void {
    this.formProdutos.patchValue({
      preco: '',
      unidadeMedida: ''
    });
  }
  onSelectProduto(): void {
    const produtoSelecionado = this.formProdutos.get('produto')?.value;
    if (produtoSelecionado) {
      // Preencher o preço de venda do produto automaticamente
      this.formProdutos.get('preco')?.setValue(produtoSelecionado.preco_venda);

      // Preencher a unidade de medida automaticamente
      if (produtoSelecionado.unidadeMedida) {
        this.formProdutos.get('unidadeMedida')?.setValue(produtoSelecionado.unidadeMedida.nome);
      }

      // Focar no campo de quantidade após selecionar o produto
      setTimeout(() => {
        const qtdInput = document.getElementById('quantidade');
        if (qtdInput) {
          qtdInput.focus();
          // Definir uma quantidade padrão de 1
          if (!this.formProdutos.get('quantidade')?.value) {
            this.formProdutos.get('quantidade')?.setValue(1);
          }
        }
      }, 100);
    }
  }

  getProdutoSelecionado(): Produto | null {
    return this.produtoSelecionado;
  }

  calcularLucroPrevisto(): number {
    const produto = this.getProdutoSelecionado();
    const quantidade = this.formProdutos.get('quantidade')?.value || 0;
    const precoVenda = this.formProdutos.get('preco')?.value || 0;

    if (!produto || !quantidade || !precoVenda) {
      return 0;
    }

    const lucroUnitario = precoVenda - produto.preco_compra;
    return lucroUnitario * quantidade;
  }

  calcularMargemLucro(): number {
    const produto = this.getProdutoSelecionado();
    const precoVenda = this.formProdutos.get('preco')?.value || 0;

    if (!produto || !precoVenda || produto.preco_compra <= 0) {
      return 0;
    }

    const lucroUnitario = precoVenda - produto.preco_compra;
    return (lucroUnitario / precoVenda) * 100;
  }
  adicionarProduto(): void {
    const produto = this.produtoSelecionado;
    const quantidade = this.formProdutos.get('quantidade')?.value;
    const preco = this.formProdutos.get('preco')?.value;
    const unidadeMedida = this.formProdutos.get('unidadeMedida')?.value;

    if (!produto) {
      this.messageService.info("Selecione um produto válido");
      return;
    }

    if (!quantidade || !preco || !unidadeMedida) {
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
    }    // Criar o item do produto
    const lucroUnitario = preco - produto.preco_compra;
    const lucroTotal = lucroUnitario * quantidade;

    const novoProduto = {
      produto_id: produto.id,
      nome: produto.nome,
      quantidade: quantidade,
      preco_compra: produto.preco_compra,
      preco_venda: preco,
      unidade_medida: unidadeMedida, // Agora é uma string diretamente
      total: preco * quantidade,
      lucro: lucroTotal
    };

    // Adicionar à lista
    this.produtosVenda.push(novoProduto);
    this.messageService.success(`${novoProduto.nome} adicionado à venda`);    // Limpar os campos do produto no formulário
    this.formProdutos.patchValue({
      produto: '',
      quantidade: '',
      preco: '',
      unidadeMedida: ''
    });
    this.produtoSelecionado = null;
    this.showDropdown = false;
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

  calcularLucroTotal(): number {
    return this.produtosVenda.reduce((lucro, produto) => lucro + (produto.lucro || 0), 0);
  }  async salvarVenda(): Promise<void> {
    if (this.form.invalid) {
      this.messageService.info("Preencha todos os campos obrigatórios.");
      return;
    }

    if (this.produtosVenda.length === 0) {
      this.messageService.info("Adicione pelo menos um produto à venda.");
      return;
    }
    const cliente = this.form.get('cliente')?.value;
    const data = this.form.get('data')?.value;

    if (!cliente || cliente.trim() === '') {
      this.messageService.error("Cliente é obrigatório");
      return;
    }    if (!data) {
      this.messageService.error("Data é obrigatória");
      return;
    } 

    // Converter a data para evitar problemas de timezone
    // Criar data com horário fixo (meio-dia) para evitar mudanças de fuso horário
    const [year, month, day] = data.split('-');
    const dataVenda = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);

    const observacao = this.form.get('observacao')?.value;
    
    const venda: Venda = {
      produtos: this.produtosVenda,
      data: dataVenda,
      cliente: cliente,
      valor_total: this.calcularTotal(),
      lucro_total: this.calcularLucroTotal(),
      observacao: observacao && observacao.trim() !== '' ? observacao.trim() : null
    } as Venda;

    // Debug: verificar se há campos undefined
    console.log('Venda a ser salva:', venda);
    // Verificar se todos os produtos têm os campos necessários
    for (const produto of venda.produtos) {
      if (!produto.produto_id || !produto.nome || produto.quantidade === undefined ||
        produto.preco_venda === undefined || produto.preco_compra === undefined ||
        produto.total === undefined) {
        console.error('Produto com campos undefined:', produto);
        this.messageService.error('Erro nos dados do produto. Verifique todos os campos.');
        this.loaderService.closeLoading();
        return;
      }
    }    this.loaderService.showLoading();

    // Método para baixar estoque na criação (como estava funcionando)
    const atualizarEstoqueNovoProduto = async () => {
      for (const produto of venda.produtos) {
        const produtoAtual = this.produtos.find(p => p.id === produto.produto_id);
        if (produtoAtual) {
          const novoEstoque = produtoAtual.estoque - produto.quantidade;
          if (novoEstoque < 0) {
            this.messageService.info(`Estoque negativado para o produto: ${produtoAtual.nome}`);
          }
          await this.produtoService.atualizarProduto(produto.produto_id, { estoque: novoEstoque });
        }
      }
    };

    // Método para ajustar estoque durante edição (apenas diferenças)
    const ajustarEstoqueEdicao = async () => {
      try {
        // Buscar a venda original para comparar
        const vendaOriginal = await this.vendaService.buscarVendaPorId(this.vendaId!);
        if (!vendaOriginal) {
          throw new Error('Venda original não encontrada');
        }

        // Calcular as diferenças de estoque
        await this.calcularEAjustarDiferencasEstoque(vendaOriginal.produtos, venda.produtos);
      } catch (error) {
        console.error('Erro ao ajustar estoque na edição:', error);
        this.messageService.error('Erro ao ajustar estoque. Operação cancelada.');
        this.loaderService.closeLoading();
        return false;
      }
      return true;
    };

    if (this.isEditing && this.vendaId) {
      venda.id = this.vendaId;
      
      // Para edição, usar o método de ajuste de diferenças
      const estoqueAjustado = await ajustarEstoqueEdicao();
      if (!estoqueAjustado) {
        return; // Erro no ajuste, operação já foi cancelada
      }

      this.vendaService.atualizarVenda(this.vendaId, venda).then(() => {
        this.messageService.success('Venda atualizada com sucesso!');
        this.voltarParaLista();
      }).catch(error => {
        this.loaderService.closeLoading();
        this.messageService.error('Erro ao atualizar venda');
        console.error('Erro ao atualizar venda:', error);
      });
    } else {
      // Para criação, usar o método original
      this.vendaService.criarVenda(venda)?.then(async () => {
        await atualizarEstoqueNovoProduto();
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
    // Restaurar contexto se existir nos query parameters
    this.route.queryParams.subscribe((params: any) => {
      const queryParams: any = {};
      
      if (params['searchTerm']) {
        queryParams.searchTerm = params['searchTerm'];
      }
      
      if (params['page']) {
        queryParams.page = params['page'];
      }
      
      if (params['pageSize']) {
        queryParams.pageSize = params['pageSize'];
      }
      
      this.router.navigate(['/vendas'], { 
        queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined 
      });
    });
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

  // Autocomplete methods para clientes
  onClienteInputChange(event: any): void {
    const valor = event.target.value;
    this.form.get('cliente')?.setValue(valor);

    // Verificar se o valor digitado corresponde a um cliente selecionado
    if (this.clienteSelecionado && this.clienteSelecionado.nome !== valor) {
      this.clienteSelecionado = null;
    }

    if (valor.length > 0) {
      this.clientesFiltrados = this.clientes.filter(cliente =>
        cliente.nome.toLowerCase().includes(valor.toLowerCase())
      ).slice(0, 10); // Limitar a 10 resultados para performance
      this.showClienteDropdown = this.clientesFiltrados.length > 0;
    } else {
      this.clientesFiltrados = [];
      this.showClienteDropdown = false;
      this.clienteSelecionado = null;
    }
  }

  selecionarCliente(cliente: Cliente): void {
    this.clienteSelecionado = cliente;
    this.form.get('cliente')?.setValue(cliente.nome);
    this.showClienteDropdown = false;
  }

  onClienteBlur(): void {
    // Delay para permitir clique na opção
    setTimeout(() => {
      this.showClienteDropdown = false;
    }, 200);
  }

  onClienteFocus(): void {
    const valor = this.form.get('cliente')?.value || '';
    if (valor.length > 0) {
      this.clientesFiltrados = this.clientes.filter(cliente =>
        cliente.nome.toLowerCase().includes(valor.toLowerCase())
      ).slice(0, 10);
      this.showClienteDropdown = this.clientesFiltrados.length > 0;
    }
  }
  /**
   * Calcula e ajusta as diferenças de estoque entre a venda original e a editada
   * @param produtosOriginais - Produtos da venda antes da edição
   * @param produtosEditados - Produtos da venda após a edição
   */
  private async calcularEAjustarDiferencasEstoque(produtosOriginais: any[], produtosEditados: any[]): Promise<void> {
    // Agrupar produtos por ID e somar quantidades (para lidar com produtos duplicados)
    const agruparProdutos = (produtos: any[]) => {
      const agrupados: { [key: string]: number } = {};
      produtos.forEach(produto => {
        if (agrupados[produto.produto_id]) {
          agrupados[produto.produto_id] += produto.quantidade;
        } else {
          agrupados[produto.produto_id] = produto.quantidade;
        }
      });
      return agrupados;
    };

    const quantidadesOriginais = agruparProdutos(produtosOriginais);
    const quantidadesEditadas = agruparProdutos(produtosEditados);

    // Obter todos os produtos únicos (originais e editados)
    const todosProdutosIds = new Set([
      ...Object.keys(quantidadesOriginais),
      ...Object.keys(quantidadesEditadas)
    ]);

    // Processar cada produto único
    for (const produtoId of todosProdutosIds) {
      const qtdOriginal = quantidadesOriginais[produtoId] || 0;
      const qtdEditada = quantidadesEditadas[produtoId] || 0;
      const diferenca = qtdEditada - qtdOriginal;

      if (diferenca !== 0) {
        const produtoAtual = this.produtos.find(p => p.id === produtoId);
        if (produtoAtual) {
          const novoEstoque = produtoAtual.estoque - diferenca;
          
          if (novoEstoque < 0) {
            this.messageService.info(`Estoque negativado para o produto: ${produtoAtual.nome}`);
          }
          
          await this.produtoService.atualizarProduto(produtoId, { estoque: novoEstoque });
          
          const acao = diferenca > 0 ? 'baixado' : 'devolvido';
          const sinal = diferenca > 0 ? '-' : '+';
          console.log(`Estoque ${acao} para ${produtoAtual.nome}: ${sinal}${Math.abs(diferenca)} (Total: ${qtdOriginal} → ${qtdEditada})`);
        }
      }
    }
  }

  getClienteSelecionado(): Cliente | null {
    return this.clienteSelecionado;
  }
}
