# Funcionalidade de Produtos no CEASA-Estoque

## Visão Geral

A funcionalidade de Produtos é um componente central do sistema CEASA-Estoque, permitindo o gerenciamento completo do catálogo de produtos disponíveis para venda. Esta funcionalidade implementa operações CRUD (Criar, Ler, Atualizar e Deletar) para produtos, além de manter o controle de estoque atualizado e integrar-se com outras funcionalidades do sistema, como Vendas e Relatórios.

## Interface do Usuário

A interface de usuário para gerenciamento de produtos é composta pelos seguintes elementos:

### Tela Principal de Produtos

![Tela de Produtos (Representação)](../assets/produtos-representacao.png)

- **Tabela de Listagem de Produtos**: Exibe todos os produtos cadastrados com as seguintes colunas:
  - Nome
  - Estoque (quantidade disponível, destacada em vermelho quando zerada ou negativa)
  - Preço de Compra (exibido como valor monetário)
  - Preço de Venda (exibido como valor monetário)
  - Unidade de Medida
  - Ações (editar/excluir)

- **Botão de Adicionar Produto**: Ícone "+" no cabeçalho da tabela que inicia o processo de criação de um novo produto.

### Formulário de Produto

O formulário para criação/edição de produtos contém os seguintes campos:

- **Nome**: Campo de texto com validação de obrigatoriedade e limite de 15 caracteres
- **Estoque**: Campo numérico obrigatório
- **Preço de Compra**: Campo numérico obrigatório (valor monetário)
- **Preço de Venda**: Campo numérico obrigatório (valor monetário)
- **Unidade de Medida**: Dropdown com opções carregadas do serviço de unidades de medida

Todos os campos possuem validação visual que destaca erros quando o campo obrigatório não é preenchido.

## Fluxos de Trabalho

### 1. Listagem de Produtos

**Fluxo básico:**
1. Usuário acessa a página de produtos
2. Sistema carrega a lista de produtos do banco de dados (Firestore)
3. Sistema exibe os produtos na tabela com formatação adequada
4. Sistema destaca produtos com estoque baixo/zerado em vermelho

### 2. Criação de Produto

**Fluxo básico:**
1. Usuário clica no botão "+" para adicionar um novo produto
2. Sistema exibe o formulário de criação de produto
3. Usuário preenche os campos obrigatórios:
   - Nome do produto
   - Quantidade em estoque
   - Preço de compra
   - Preço de venda
   - Seleciona a unidade de medida
4. Usuário clica em "Salvar"
5. Sistema valida os dados inseridos
6. Sistema envia os dados para o Firestore
7. Sistema atualiza a tabela de produtos e exibe mensagem de sucesso

**Fluxo alternativo (dados inválidos):**
1. Se algum campo obrigatório não for preenchido, o sistema exibe mensagem de erro
2. Sistema destaca os campos com erro
3. Formulário permanece aberto para correção

**Fluxo alternativo (usuário não autenticado):**
1. Se o usuário não estiver autenticado, o sistema exibe mensagem de erro
2. Operação é cancelada

### 3. Edição de Produto

**Fluxo básico:**
1. Usuário clica no ícone de edição (lápis) ao lado do produto
2. Sistema carrega os dados do produto no formulário
3. Usuário altera os campos desejados
4. Usuário clica em "Salvar"
5. Sistema valida os dados
6. Sistema atualiza os dados no Firestore
7. Sistema atualiza a tabela de produtos e exibe mensagem de sucesso

### 4. Exclusão de Produto

**Fluxo básico:**
1. Usuário clica no ícone de exclusão (lixeira) ao lado do produto
2. Sistema exibe modal de confirmação
3. Usuário confirma a exclusão
4. Sistema remove o produto do Firestore
5. Sistema atualiza a tabela de produtos e exibe mensagem de sucesso

**Fluxo alternativo (cancelamento):**
1. Usuário cancela a exclusão no modal de confirmação
2. Sistema fecha o modal sem realizar alterações

### 5. Validação de Campos

- O sistema valida campos obrigatórios quando o usuário tenta salvar o produto
- A função `hasFieldError` é utilizada para verificar condições de erro nos campos
- Mensagens de erro são exibidas abaixo dos campos com problemas

## Integração com Outras Funcionalidades

### 1. Integração com Vendas

- Ao registrar uma venda, os produtos selecionados têm seu estoque reduzido automaticamente
- O sistema permite vendas mesmo quando o estoque é insuficiente, mas exibe alertas ao usuário
- A atualização de estoque ocorre via método `atualizarProduto` do `ProdutoService`

### 2. Integração com Dashboard

- Produtos com estoque baixo (menos de 10 unidades) são destacados no Dashboard
- O Dashboard exibe os produtos em ordem crescente de quantidade em estoque

### 3. Integração com Relatórios

- Os produtos vendidos são rastreados nos relatórios de vendas
- Os relatórios calculam o lucro com base na diferença entre o preço de venda e o preço de compra dos produtos

## Aspectos Técnicos

### Modelo de Dados

O produto é modelado pela interface `Produto` com as seguintes propriedades:
```typescript
export interface Produto {
  empresa_id: string;
  id: string;
  nome: string;
  preco_compra: number;
  preco_venda: number;
  estoque: number;
  unidadeMedida: UnidadeMedida
}
```

### Serviços

O `ProdutoService` fornece os seguintes métodos:

1. `listarProdutos()`: Retorna um Observable com todos os produtos do usuário atual
2. `adicionarProduto(produto: Produto)`: Adiciona um novo produto ao Firestore
3. `atualizarProduto(id: string, produto: Partial<Produto>)`: Atualiza um produto existente
4. `excluirProduto(id: string)`: Remove um produto do Firestore

### Componente

O `ProdutoComponent` estende a classe `BaseComponent<Produto>` e implementa:

1. Inicialização de formulário com validações
2. Gestão de estado (criação, edição, listagem)
3. Operações CRUD via `ProdutoService`
4. Validação de campos usando `hasFieldError`
5. Feedback visual para o usuário via `MessageService`

### Persistência de Dados

Os dados dos produtos são armazenados no Firebase Firestore, associados ao usuário autenticado através do campo `empresa_id`.

## Considerações de Segurança

- Operações CRUD são limitadas aos produtos associados ao usuário autenticado (`empresa_id`)
- O acesso à funcionalidade é protegido por autenticação
- Validações de entrada são aplicadas tanto no cliente quanto no servidor

## Possibilidades de Melhoria

1. Implementação de categorias para produtos
2. Sistema de alertas automáticos para estoque baixo
3. Upload de imagens para produtos
4. Código de barras ou SKU para facilitar identificação
5. Histórico de alterações de preço e estoque
6. Suporte a variações de produtos (tamanhos, cores, etc.)
7. Controle de lotes e datas de validade
