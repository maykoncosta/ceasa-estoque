# Documentação - Vendas

## Visão Geral
O módulo de Vendas gerencia o registro e controle de vendas de produtos, incluindo clientes, produtos vendidos, quantidades, preços e cálculo automático de lucros. O sistema permite operações completas de CRUD (Create, Read, Update, Delete) com paginação, busca e validação.

## Funcionalidades Principais

### 🛒 **Gestão de Vendas**
- **Criação**: Registro de novas vendas com múltiplos produtos
- **Edição**: Modificação de vendas existentes
- **Exclusão**: Remoção de vendas com confirmação
- **Visualização**: Listagem paginada com busca por cliente

### 📊 **Controle de Produtos na Venda**
- **Seleção de Produtos**: Dropdown com produtos disponíveis
- **Quantidade**: Controle de quantidade vendida
- **Preço Personalizado**: Possibilidade de alterar preço de venda
- **Cálculo Automático**: Total e lucro calculados automaticamente
- **Múltiplos Produtos**: Adição de vários produtos por venda

### 🔍 **Paginação e Busca**
- **Paginação**: Sistema centralizado do BaseComponent
- **Busca por Cliente**: Filtro por nome do cliente
- **Ordenação**: Por data (mais recente primeiro)
- **Configuração**: 10 itens por página (configurável: 5, 10, 20, 50)

## Estrutura de Dados

### Interface Venda
```typescript
interface Venda {
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
  }];
  valor_total: number;
  lucro_total?: number;
  data: any;
  cliente: string;
  expandido?: boolean; // Para controle de expansão na UI
}
```

### Campos Obrigatórios
- **cliente**: Nome do cliente (máximo 25 caracteres)
- **data**: Data da venda
- **produtos**: Pelo menos um produto deve ser adicionado

### Validações
- **Cliente**: Campo obrigatório, máximo 25 caracteres
- **Data**: Campo obrigatório, formato de data
- **Produtos**: Mínimo 1 produto por venda
- **Quantidade**: Valores numéricos positivos
- **Preços**: Valores numéricos com validação de tamanho

## Componente VendaComponent

### Herança
```typescript
export class VendaComponent extends BaseComponent<Venda>
```
Herda funcionalidades de paginação, busca e navegação do BaseComponent.

### Propriedades Principais
```typescript
// Dados de apoio
produtos: Produto[] = [];
unidades: UnidadeMedida[] = [];
produtosVenda: any[] = [];

// Configurações de paginação
paginationConfig = { pageSize: 10, orderByField: 'data' };
pageSizeOptions = [5, 10, 20, 50];
```

### Métodos Principais

#### Configuração e Inicialização
- `initializePaginationConfig()`: Configura paginação (10 itens/página)
- `onLoadValues()`: Carrega produtos e unidades de medida
- `initializeForm()`: Inicializa formulário reativo

#### Operações CRUD
- `saveItem()`: Salva venda (criação/edição)
- `onDeleteItem()`: Exclui venda com confirmação
- `buscarItensPaginados()`: Busca paginada por cliente

#### Gestão de Produtos na Venda
- `onSelectProduto()`: Preenche dados ao selecionar produto
- `adicionarProduto()`: Adiciona produto à lista da venda
- `removerProduto(index)`: Remove produto da lista
- `calcularTotais()`: Calcula valores totais e lucro

#### Interface
- `toggleExpand(venda)`: Expande/contrai detalhes da venda

## Service VendaService

### Métodos Disponíveis

#### Operações Básicas
```typescript
// Listagem simples (compatibilidade)
listarVendas(): Observable<Venda[]>

// Criação com normalização
criarVenda(venda: Venda): Promise<DocumentReference>

// Atualização com normalização
atualizarVenda(id: string, venda: Partial<Venda>): Promise<void>

// Exclusão
excluirVenda(id: string): Promise<void>
```

#### Busca Paginada
```typescript
buscarVendasPaginadas(
  pageSize: number, 
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
  searchTerm?: string
): Promise<PaginatedResult<Venda>>
```

### Normalização de Dados
- **cliente**: Convertido automaticamente para UPPERCASE
- **empresa_id**: Preenchido automaticamente com UID do usuário

### Configuração de Busca
- **Campo de Busca**: cliente
- **Ordenação Principal**: data (desc) - mais recente primeiro
- **Ordenação com Busca**: cliente (asc), data (desc)
- **Contagem**: Usando `getCountFromServer` para performance

## Interface do Usuário

### Layout Principal
```
[VENDAS] - Título
├── Campo de Busca (por cliente)
├── Botão "Criar Venda"
├── Tabela de Vendas
│   ├── Cliente | Total | Data | Ações
│   ├── Expansão com produtos da venda
│   └── Controles de ação (expandir, editar, excluir)
└── Controles de Paginação
```

### Formulário de Venda
```
[Cadastrar/Editar Venda]
├── Dados da Venda
│   ├── Cliente (obrigatório)
│   └── Data (obrigatório)
├── Produtos da Venda
│   ├── Tabela com produtos adicionados
│   └── Seção para adicionar novos produtos
│       ├── Produto (dropdown)
│       ├── Quantidade
│       ├── Preço
│       └── Unidade de Medida
└── Botões (Cancelar | Salvar)
```

### Recursos Visuais
- **Expansão de Detalhes**: Clique na seta para ver produtos da venda
- **Estilização de Erro**: Campos obrigatórios com fundo vermelho quando há erro
- **Feedback Visual**: Cores diferenciadas para ações
- **Responsividade**: Layout adaptável para mobile

## Validação e Feedback

### Validação de Formulário
```typescript
// Formulário principal
form = new UntypedFormGroup({
  cliente: new UntypedFormControl(undefined, [Validators.required, Validators.maxLength(25)]),
  data: new UntypedFormControl(undefined, Validators.required),
  // Campos para adicionar produtos
  produto: new UntypedFormControl(undefined),
  quantidade: new UntypedFormControl(undefined),
  preco: new UntypedFormControl(undefined),
  unidadeMedida: new UntypedFormControl(undefined)
});
```

### Estilização Condicional
```html
<!-- Aplicação de classes de erro via ngClass -->
[ngClass]="{'bg-red-50 border-l-4 border-l-red-500': form.get('cliente')?.touched && form.get('cliente')?.hasError('required')}"
```

### Mensagens de Erro
- **Cliente obrigatório**: "Cliente é obrigatório"
- **Data obrigatória**: "Data é obrigatória"
- **Produtos necessários**: Botão "Salvar" desabilitado se não houver produtos

## Fluxo de Trabalho

### Criação de Venda
1. **Iniciar**: Clicar em "Criar Venda"
2. **Dados Básicos**: Preencher cliente e data
3. **Adicionar Produtos**: 
   - Selecionar produto
   - Definir quantidade
   - Ajustar preço (opcional)
   - Confirmar unidade de medida
   - Clicar "Adicionar Produto"
4. **Repetir**: Adicionar quantos produtos necessário
5. **Finalizar**: Clicar "Salvar Venda"

### Edição de Venda
1. **Selecionar**: Clicar no ícone de edição
2. **Modificar**: Alterar dados básicos ou produtos
3. **Salvar**: Confirmar alterações

### Visualização Detalhada
1. **Expandir**: Clicar na seta para baixo
2. **Visualizar**: Ver todos os produtos da venda
3. **Contrair**: Clicar na seta para cima

## Boas Práticas

### Performance
- **Paginação**: Implementada para grandes volumes
- **Contagem Eficiente**: Uso de `getCountFromServer`
- **Busca Otimizada**: Filtros aplicados no Firestore

### UX/UI
- **Feedback Visual**: Estados claros de erro e sucesso
- **Responsividade**: Interface adaptável
- **Acessibilidade**: Uso adequado de labels e semântica

### Segurança
- **Isolamento por Empresa**: Filtro automático por `empresa_id`
- **Validação**: Client-side e server-side
- **Normalização**: Dados consistentes (UPPERCASE)

### Manutenibilidade
- **Herança**: Uso do BaseComponent para reutilização
- **Separação**: Service dedicado para operações de dados
- **Tipagem**: Interfaces TypeScript bem definidas

## Integração com Outros Módulos

### Dependências
- **ProdutoService**: Para listagem de produtos disponíveis
- **UnidadeMedidaService**: Para unidades de medida
- **BaseComponent**: Para funcionalidades comuns
- **MessageService**: Para feedback ao usuário
- **LoaderService**: Para indicadores de carregamento

### Relacionamentos
- **Produtos**: Vendas referenciam produtos cadastrados
- **Unidades**: Cada produto tem sua unidade de medida
- **Empresa**: Vendas isoladas por empresa/usuário

## Melhorias Futuras

### Funcionalidades
- [ ] Relatórios de vendas por período
- [ ] Análise de lucratividade
- [ ] Histórico de alterações
- [ ] Vendas em lote
- [ ] Integração com estoque

### Performance
- [ ] Cache de produtos frequentes
- [ ] Lazy loading de dados
- [ ] Otimização de queries

### UX
- [ ] Auto-complete para clientes
- [ ] Sugestões de preço
- [ ] Calculadora integrada
- [ ] Impressão de comprovantes

---

**Última atualização**: 2 de julho de 2025  
**Versão**: 1.0  
**Responsável**: Sistema de Estoque CEASA
