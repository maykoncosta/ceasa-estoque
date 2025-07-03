# Guia de Implementação de Paginação com BaseComponent

## Visão Geral

O `BaseComponent` foi atualizado para incluir funcionalidade completa de paginação, permitindo que todas as telas da aplicação utilizem esse recurso de forma padronizada. A implementação suporta:

- ✅ Navegação entre páginas (próxima, anterior, primeira)
- ✅ Busca por termo com paginação
- ✅ Seleção de tamanho de página
- ✅ Contagem total de itens
- ✅ Indicadores visuais de navegação
- ✅ Manutenção do método de listagem simples para compatibilidade

## Como Implementar Paginação em uma Nova Tela

### 1. Estender o BaseComponent

```typescript
export class MinhaTelaComponent extends BaseComponent<MeuTipo> {
  constructor(
    messageService: MessageService,
    loaderService: LoaderService,
    private meuService: MeuService
  ) {
    super(loaderService, messageService);
  }
}
```

### 2. Implementar os Métodos Abstratos Obrigatórios

```typescript
// Configuração da paginação
override initializePaginationConfig(): void {
  this.paginationConfig = { 
    pageSize: 10,  // Tamanho padrão da página
    orderByField: 'nome'  // Campo para ordenação
  };
  this.pageSize = this.paginationConfig.pageSize;
  this.pageSizeOptions = [5, 10, 20, 50];  // Opções de tamanho
}

// Método para busca paginada (OBRIGATÓRIO)
override async buscarItensPaginados(
  pageSize: number, 
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
  searchTerm?: string
) {
  return this.meuService.buscarItensPaginados(pageSize, startAfterDoc, searchTerm);
}

// Método de listagem simples (mantido para compatibilidade)
override listarItens(): void {
  this.meuService.listarItens().subscribe(data => {
    this.items = data;
    this.loaderService.closeLoading();
  });
}

// Inicialização do formulário reativo
override initializeForm(): void {
  this.form = new UntypedFormGroup({
    id: new UntypedFormControl({ value: '', disabled: true }),
    nome: new UntypedFormControl(undefined, Validators.required),
    // ... outros campos
  });
}

// Lógica de salvamento
override saveItem(): void {
  if (this.form.invalid) {
    this.messageService.info("Preencha todos os campos obrigatórios.");
    return;
  }
  
  const item = this.form.getRawValue();
  // Lógica de salvamento...
}

// Carregamento de valores adicionais
override onLoadValues(): void {
  // Carregar dados auxiliares se necessário
}
```

### 3. Implementar o Método de Busca Paginada no Service

```typescript
async buscarItensPaginados(
  pageSize: number, 
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
  searchTerm?: string
): Promise<PaginatedResult<MeuTipo>> {
  const user = this.auth.currentUser;
  if (!user) return { items: [], total: 0 };

  const itensRef = collection(this.firestore, 'minha-colecao');
  
  // Query para contagem
  let countQuery;
  if (searchTerm && searchTerm.trim() !== '') {
    searchTerm = searchTerm.toLocaleUpperCase();
    const searchTermEnd = searchTerm + '\uf8ff';
    countQuery = query(
      itensRef, 
      where('empresa_id', '==', user.uid),
      where('nome', '>=', searchTerm),
      where('nome', '<=', searchTermEnd)
    );
  } else {
    countQuery = query(itensRef, where('empresa_id', '==', user.uid));
  }
  
  const countSnapshot = await getCountFromServer(countQuery);
  const total = countSnapshot.data().count;
  
  // Query paginada
  let queryConstraints: any[] = [
    where('empresa_id', '==', user.uid),
    orderBy('nome')
  ];
  
  if (searchTerm && searchTerm.trim() !== '') {
    const searchTermEnd = searchTerm + '\uf8ff';
    queryConstraints.push(where('nome', '>=', searchTerm));
    queryConstraints.push(where('nome', '<=', searchTermEnd));
  }
  
  if (startAfterDoc) {
    queryConstraints.push(startAfter(startAfterDoc));
  }
  
  queryConstraints.push(limit(pageSize));
  
  const paginatedQuery = query(itensRef, ...queryConstraints);
  const snapshot = await getDocs(paginatedQuery);
  
  const items: MeuTipo[] = [];
  let lastVisible: QueryDocumentSnapshot<DocumentData> | undefined = undefined;
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    items.push({
      id: doc.id,
      // mapeamento dos campos...
    });
    lastVisible = doc;
  });
  
  return { items, total, lastVisible };
}
```

### 4. Template HTML com Controles de Paginação

```html
<div class="mx-auto w-full overflow-hidden rounded-sm bg-white shadow-md p-2 sm:p-1 md:p-4">
  <div class="flex flex-col">
    <h1 class="text-xl p-4 font-bold">MINHA TELA</h1>

    <!-- Campo de busca -->
    <div class="flex flex-col md:flex-row items-center mb-4 px-2">
      <div class="flex flex-1 w-full md:w-auto">
        <input type="text" placeholder="Buscar..."
          class="border rounded-l px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          [(ngModel)]="searchTerm">
        <button class="bg-blue-500 text-white px-4 py-2 hover:bg-blue-600"
          (click)="buscarPorTermo(searchTerm)">
          <i class="fa-solid fa-search"></i>
        </button>
        <button class="bg-gray-300 text-gray-700 px-4 py-2 rounded-r hover:bg-gray-400"
          (click)="limparBusca()" [disabled]="!searchTerm">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>

    <!-- Tabela -->
    <table class="border-collapse shadow-sm rounded-lg">
      <thead>
        <tr class="border-b-2 bg-blue-100">
          <th class="sm:p-1 text-left">Nome</th>
          <th class="sm:p-2 max-w-24 min-w-16">
            <i class="fa-solid fa-plus cursor-pointer" (click)="onCreateItem()"></i>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-b-2" *ngFor="let item of items">
          <td class="sm:p-1 text-left">{{item.nome}}</td>
          <td class="sm:p-2 flex justify-around text-right">
            <i class="fa-regular fa-pen-to-square cursor-pointer" (click)="onEditItem(item)"></i>
            <i class="fa-solid fa-trash cursor-pointer" (click)="showModalDelete(item)"></i>
          </td>
        </tr>
        <tr *ngIf="items.length === 0">
          <td colspan="2" class="text-center py-4 text-gray-500">
            Nenhum item encontrado
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Controles de Paginação -->
    <div class="flex flex-col md:flex-row justify-between items-center mt-4 px-2">
      <!-- Informação da página -->
      <div class="text-sm text-gray-600 mb-2 md:mb-0">
        <span *ngIf="totalItems > 0">
          Mostrando {{ (currentPage - 1) * pageSize + 1 }} a {{ Math.min(currentPage * pageSize, totalItems) }}
          de {{ totalItems }} itens
        </span>
        <span *ngIf="totalItems === 0">Nenhum resultado encontrado</span>
      </div>

      <!-- Navegação entre páginas -->
      <div class="flex items-center space-x-2" *ngIf="totalItems > 0">
        <button class="px-3 py-1 border rounded hover:bg-gray-100" 
          [disabled]="currentPage === 1" (click)="primeiraPagina()">
          <i class="fa-solid fa-angles-left"></i>
        </button>
        <button class="px-3 py-1 border rounded hover:bg-gray-100" 
          [disabled]="currentPage === 1" (click)="paginaAnterior()">
          <i class="fa-solid fa-angle-left"></i>
        </button>
        <span class="px-3 py-1">Página {{ currentPage }} de {{ totalPages || 1 }}</span>
        <button class="px-3 py-1 border rounded hover:bg-gray-100" 
          [disabled]="currentPage >= totalPages" (click)="proximaPagina()">
          <i class="fa-solid fa-angle-right"></i>
        </button>
      </div>

      <!-- Seletor de itens por página -->
      <div class="flex items-center space-x-2 mt-2 md:mt-0" *ngIf="totalItems > 0">
        <span class="text-sm text-gray-600">Itens por página:</span>
        <select class="border rounded px-2 py-1 text-sm" (change)="alterarTamanhoPagina($event)">
          <option *ngFor="let size of pageSizeOptions" [value]="size" [selected]="pageSize === size">
            {{ size }}
          </option>
        </select>
      </div>
    </div>
  </div>
</div>
```

## Métodos Disponíveis no BaseComponent

| Método | Descrição |
|--------|-----------|
| `listarItensPaginados()` | Carrega a primeira página de itens |
| `proximaPagina()` | Navega para a próxima página |
| `paginaAnterior()` | Navega para a página anterior |
| `primeiraPagina()` | Retorna para a primeira página |
| `buscarPorTermo(term: string)` | Realiza busca por termo |
| `limparBusca()` | Limpa a busca e recarrega |
| `alterarTamanhoPagina(event)` | Altera o número de itens por página |

## Propriedades Disponíveis

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `items` | T[] | Array de itens da página atual |
| `currentPage` | number | Página atual (1-indexed) |
| `totalPages` | number | Total de páginas |
| `totalItems` | number | Total de itens |
| `pageSize` | number | Itens por página |
| `searchTerm` | string | Termo de busca atual |
| `pageSizeOptions` | number[] | Opções de tamanho de página |

## Exemplo Completo - Unidade de Medida e Vendas

A implementação das telas de Unidade de Medida e Vendas servem como exemplos completos de como usar a paginação com o BaseComponent. Consulte os arquivos:

**Unidade de Medida:**
- `src/app/pages/unidade-medida/unidade-medida.component.ts`
- `src/app/pages/unidade-medida/unidade-medida.component.html`
- `src/app/core/services/unidade-medida.service.ts`

**Vendas:**
- `src/app/pages/venda/venda.component.ts`
- `src/app/pages/venda/venda.component.html`
- `src/app/core/services/venda.service.ts`

**Produtos (implementação original):**
- `src/app/pages/produto/produto.component.ts`
- `src/app/pages/produto/produto.component.html`
- `src/app/core/services/produto.service.ts`

## Compatibilidade

O BaseComponent mantém o método `listarItens()` original para compatibilidade com implementações existentes. Telas que não implementarem a paginação continuarão funcionando normalmente.

## Vantagens

1. **Consistência**: Todas as telas com paginação seguem o mesmo padrão
2. **Performance**: Carregamento otimizado de dados
3. **Usabilidade**: Controles padronizados de navegação
4. **Busca**: Funcionalidade de busca integrada
5. **Flexibilidade**: Configuração personalizável por tela
6. **Manutenibilidade**: Código centralizado no BaseComponent
