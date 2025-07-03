# Funcionalidade de Unidades de Medida no CEASA-Estoque

## Visão Geral

A funcionalidade de Unidades de Medida é um componente fundamental do sistema CEASA-Estoque, fornecendo a base para a padronização de medidas utilizadas no cadastro de produtos e registros de vendas. Esta funcionalidade implementa operações CRUD (Criar, Ler, Atualizar e Deletar) para unidades de medida, além de incluir validações de integridade que impedem a exclusão de unidades em uso. Com a implementação da paginação, a tela oferece performance otimizada e navegação eficiente mesmo com grandes volumes de dados.

## Interface do Usuário

A interface de usuário para gerenciamento de unidades de medida é composta pelos seguintes elementos:

### Tela Principal de Unidades de Medida

- **Campo de Busca**: Sistema de busca integrado que permite localizar unidades por nome OU descrição com:
  - Campo de texto com placeholder "Buscar unidade por nome..."
  - Botão de busca com ícone de lupa
  - Botão de limpar busca com ícone "X"
  - Funcionalidade de busca em tempo real por nome ou descrição
  - Utiliza operador `or` do Firebase para busca em múltiplos campos

- **Tabela de Listagem de Unidades**: Exibe todas as unidades de medida cadastradas com as seguintes colunas:
  - Nome (identificador principal da unidade)
  - Descrição (detalhamento da unidade de medida)
  - Ações (editar/excluir)

- **Botão de Adicionar Unidade**: Ícone "+" no cabeçalho da tabela que inicia o processo de criação de uma nova unidade de medida.

- **Controles de Paginação**: Sistema avançado de paginação que permite navegar entre diferentes páginas quando há muitas unidades cadastradas. Inclui:
  - Indicador de página atual (ex: "Página 1 de 3")
  - Botões de navegação (primeira página, anterior, próxima)
  - Seletor de quantidade de itens por página (5, 10, 20, 50)
  - Indicador de total de itens (ex: "Mostrando 1 a 10 de 25 unidades")
  - Navegação responsiva adaptada para dispositivos móveis

### Formulário de Unidade de Medida

O formulário reativo para criação/edição de unidades contém os seguintes campos:

- **Nome**: Campo de texto com validação de obrigatoriedade e limite de 20 caracteres
- **Descrição**: Campo de texto com validação de obrigatoriedade e limite de 100 caracteres

O formulário inclui:
- Validação em tempo real com feedback visual
- Mensagens de erro específicas para cada tipo de validação
- Estados visuais para campos inválidos (borda vermelha)
- Botões contextuais (Salvar/Atualizar e Cancelar)

## Fluxos de Trabalho

### 1. Listagem de Unidades de Medida

**Fluxo básico:**
1. Usuário acessa a página de unidades de medida
2. Sistema carrega a primeira página de unidades do banco de dados (Firestore)
3. Sistema exibe as unidades na tabela com paginação
4. Sistema exibe controles de busca e paginação
5. Usuário pode navegar entre as páginas usando os controles de paginação
6. Usuário pode alterar o número de itens exibidos por página
7. Sistema mantém o histórico de navegação para voltar páginas anteriores

**Fluxo de busca:**
1. Usuário digita termo de busca no campo específico
2. Sistema realiza busca em tempo real por nome OU descrição da unidade
3. Sistema utiliza operador `or` do Firebase para buscar em múltiplos campos
4. Sistema exibe resultados filtrados com paginação
5. Usuário pode limpar a busca para retornar à visualização completa

### 2. Criação de Unidade de Medida

**Fluxo básico:**
1. Usuário clica no botão "+" para adicionar uma nova unidade
2. Sistema exibe o formulário reativo de criação
3. Usuário preenche os campos obrigatórios:
   - Nome da unidade (ex: "KG", "LT", "UN")
   - Descrição detalhada (ex: "Quilograma", "Litro", "Unidade")
4. Sistema valida os dados em tempo real
5. Usuário clica em "Salvar"
6. Sistema verifica se já existe uma unidade com o mesmo nome
7. Sistema envia os dados para o Firestore
8. Sistema atualiza a lista paginada e exibe mensagem de sucesso
9. Sistema fecha o formulário e retorna à listagem

**Fluxo alternativo (dados inválidos):**
1. Se algum campo obrigatório não for preenchido, o sistema exibe validação visual
2. Mensagens de erro específicas são exibidas abaixo dos campos
3. Formulário permanece aberto para correção
4. Botão "Salvar" pode ser desabilitado até correção dos erros

**Fluxo alternativo (nome duplicado):**
1. Se já existir uma unidade com o mesmo nome, o sistema exibe erro
2. Operação é cancelada e formulário permanece aberto
3. Usuário deve alterar o nome antes de tentar salvar novamente

### 3. Edição de Unidade de Medida

**Fluxo básico:**
1. Usuário clica no ícone de edição (lápis) ao lado da unidade
2. Sistema carrega os dados da unidade no formulário reativo
3. Sistema altera o título do formulário para "Editar Unidade de Medida"
4. Usuário altera os campos desejados
5. Sistema valida as alterações em tempo real
6. Usuário clica em "Atualizar"
7. Sistema valida os dados e atualiza no Firestore
8. Sistema atualiza a lista paginada e exibe mensagem de sucesso
9. Sistema fecha o formulário e retorna à listagem

### 4. Exclusão de Unidade de Medida

**Fluxo básico:**
1. Usuário clica no ícone de exclusão (lixeira) ao lado da unidade
2. Sistema exibe modal de confirmação
3. Usuário confirma a exclusão
4. Sistema verifica se a unidade está sendo utilizada em produtos
5. Sistema remove a unidade do Firestore
6. Sistema atualiza a lista paginada e exibe mensagem de sucesso

**Fluxo alternativo (unidade em uso):**
1. Se a unidade estiver sendo utilizada em produtos, o sistema bloqueia a exclusão
2. Sistema exibe mensagem de erro informativa
3. Modal de confirmação é fechado sem realizar alterações
4. Usuário deve primeiro remover ou alterar produtos que usam esta unidade

**Fluxo alternativo (cancelamento):**
1. Usuário cancela a exclusão no modal de confirmação
2. Sistema fecha o modal sem realizar alterações

### 5. Busca de Unidades

**Fluxo básico:**
1. Usuário digita no campo de busca
2. Sistema realiza busca por nome OU descrição da unidade usando Firebase query com operador `or`
3. Sistema aplica filtro eficiente para busca em múltiplos campos
4. Resultados são exibidos com paginação mantida
5. Contador de resultados é atualizado
6. Usuário pode navegar pelos resultados filtrados

**Fluxo de limpeza:**
1. Usuário clica no botão "X" para limpar busca
2. Sistema remove o filtro de busca
3. Sistema retorna à listagem completa com paginação
4. Primeira página é carregada automaticamente

### 6. Paginação Avançada

**Fluxo básico:**
1. Sistema carrega primeira página (configurável, padrão 10 itens)
2. Controles de paginação são exibidos se houver mais itens
3. Usuário pode navegar entre páginas usando botões de navegação
4. Sistema mantém histórico para navegação bidirecional
5. Contador de páginas e itens é atualizado dinamicamente

**Navegação entre páginas:**
- **Primeira página**: Retorna imediatamente à primeira página
- **Página anterior**: Utiliza histórico de documentos para navegação eficiente
- **Próxima página**: Usa cursor do último documento para busca otimizada

## Integração com Outras Funcionalidades

### 1. Integração com Produtos

- Unidades de medida são utilizadas no cadastro de produtos
- Campo "Unidade de Medida" em produtos carrega as opções desta funcionalidade
- Validação de integridade impede exclusão de unidades em uso
- Alterações em unidades podem afetar a visualização em produtos existentes

### 2. Integração com Vendas

- Vendas herdam a unidade de medida do produto selecionado
- Exibição de unidades nas tabelas de produtos da venda
- Informações de unidade são preservadas nos registros históricos de vendas

### 3. Integração com Relatórios

- Relatórios de produtos agrupam informações por unidade de medida
- Análises de vendas consideram diferentes unidades para cálculos precisos

## Aspectos Técnicos

### Modelo de Dados

A unidade de medida é modelada pela interface `UnidadeMedida` com as seguintes propriedades:
```typescript
export interface UnidadeMedida {
  id: string;
  nome: string;
  descricao: string;
  empresa_id: string;
}
```

### Serviços

O `UnidadeMedidaService` fornece os seguintes métodos:

1. **Métodos Tradicionais:**
   - `listarUnidades()`: Retorna Observable com todas as unidades do usuário
   - `adicionarUnidade(unidade: UnidadeMedida)`: Adiciona nova unidade com validação de duplicatas e normalização de strings
   - `atualizarUnidade(id: string, unidade: Partial<UnidadeMedida>)`: Atualiza unidade existente com normalização
   - `excluirUnidade(id: string, nome: string)`: Remove unidade com validação de uso

2. **Métodos de Paginação:**
   - `buscarUnidadesPaginadas(pageSize, startAfterDoc?, searchTerm?)`: Busca paginada com suporte a filtros
   - Implementa contagem total de registros para navegação precisa
   - Utiliza operador `or` do Firebase para busca por nome OU descrição
   - Otimizada para performance com Firebase Firestore queries compostas

### Componente

O `UnidadeMedidaComponent` estende a classe `BaseComponent<UnidadeMedida>` e implementa:

1. **Herança do BaseComponent:**
   - Funcionalidades de paginação automáticas
   - Gerenciamento de estado padronizado
   - Métodos de navegação integrados
   - Sistema de busca unificado

2. **Implementações Específicas:**
   - Configuração de paginação (pageSize: 10, ordem por nome)
   - Formulário reativo com validações customizadas
   - Lógica de negócio específica para unidades de medida
   - Integração com outros serviços quando necessário

3. **Métodos Override Implementados:**
   - `buscarItensPaginados()`: Integração com serviço de busca paginada
   - `initializeForm()`: Configuração do formulário reativo
   - `saveItem()`: Lógica de salvamento com validações
   - `onDeleteItem()`: Exclusão com validação de integridade

### Persistência de Dados

- Dados armazenados no Firebase Firestore
- Coleção `unidades` com isolamento por `empresa_id`
- Queries otimizadas para busca e paginação
- Índices automaticamente criados pelo Firebase para performance

### Validações Implementadas

1. **Validações de Formulário:**
   - Nome: obrigatório, máximo 20 caracteres
   - Descrição: obrigatória, máximo 100 caracteres
   - Feedback visual em tempo real

2. **Validações de Negócio:**
   - Verificação de nomes duplicados na criação
   - Validação de uso em produtos antes da exclusão
   - Autenticação obrigatória para todas as operações
   - **Normalização de dados**: Campos de texto convertidos automaticamente para uppercase antes do salvamento

3. **Validações de Paginação:**
   - Parâmetros de busca validados
   - Limites de pageSize respeitados
   - Tratamento de erros de conectividade

## Considerações de Segurança

- Operações CRUD limitadas aos dados do usuário autenticado (`empresa_id`)
- Acesso protegido por autenticação Firebase
- Validações de entrada no cliente e servidor
- Queries de segurança impedem acesso a dados de outras empresas
- Sanitização de termos de busca para prevenir ataques

## Performance e Otimização

- **Paginação Eficiente:** Carregamento sob demanda reduz tempo de resposta
- **Busca Otimizada:** Queries Firebase com índices apropriados
- **Cache Local:** Dados de unidades mantidos em cache quando possível
- **Lazy Loading:** Componentes carregados apenas quando necessários
- **Debounce na Busca:** Evita queries excessivas durante digitação

## Possibilidades de Melhoria

1. **Funcionalidades Avançadas:**
   - Sistema de conversão entre unidades relacionadas
   - Categorização de unidades (peso, volume, comprimento, etc.)
   - Import/export de unidades padrão do sistema
   - Histórico de alterações em unidades

2. **Interface e Usabilidade:**
   - Ordenação por diferentes campos (nome, descrição, data de criação)
   - Filtros avançados por categoria ou tipo
   - Busca por descrição além do nome
   - Interface drag-and-drop para reordenação

3. **Integrações:**
   - API de unidades padrão nacionais/internacionais
   - Sincronização com sistemas externos
   - Validação automática de unidades comuns
   - Sugestões inteligentes baseadas em uso

4. **Relatórios e Analytics:**
   - Relatório de uso de unidades por produto
   - Análise de unidades mais utilizadas
   - Identificação de unidades órfãs ou redundantes
   - Dashboard de estatísticas de unidades
