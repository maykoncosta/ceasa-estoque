# Documentação - Clientes

## Visão Geral
O módulo de Clientes gerencia o cadastro e controle de clientes da empresa, incluindo informações básicas como nome e celular. O sistema permite operações completas de CRUD (Create, Read, Update, Delete) com paginação, busca e validação, seguindo os mesmos padrões dos outros módulos.

## Funcionalidades Principais

### 👥 **Gestão de Clientes**
- **Criação**: Registro de novos clientes
- **Edição**: Modificação de clientes existentes
- **Exclusão**: Remoção de clientes com validação de uso
- **Visualização**: Listagem paginada com busca por nome

### 🔍 **Paginação e Busca**
- **Paginação**: Sistema centralizado do BaseComponent
- **Busca por Nome**: Filtro por nome do cliente
- **Ordenação**: Por nome (ordem alfabética)
- **Configuração**: 10 itens por página (configurável: 5, 10, 20, 50)

### 🔒 **Validações de Integridade**
- **Verificação de Uso**: Impede exclusão de clientes com vendas associadas
- **Duplicatas**: Impede cadastro de clientes com mesmo nome
- **Normalização**: Nome convertido automaticamente para UPPERCASE

## Estrutura de Dados

### Interface Cliente
```typescript
interface Cliente {
  id: string;
  nome: string;
  celular: string;
  empresa_id: string;
}
```

### Campos Obrigatórios
- **nome**: Nome do cliente (máximo 50 caracteres)
- **celular**: Número de celular formatado (11) 99999-9999

### Validações
- **Nome**: Campo obrigatório, máximo 50 caracteres, único por empresa
- **Celular**: Campo obrigatório, formato (11) 99999-9999, apenas números aceitos
- **Empresa**: Isolamento automático por empresa_id
- **Formatação**: Celular formatado automaticamente durante digitação

## Componente ClienteComponent

### Herança
```typescript
export class ClienteComponent extends BaseComponent<Cliente>
```
Herda funcionalidades de paginação, busca e navegação do BaseComponent.

### Propriedades Principais
```typescript
// Controle do modal
showFormModal = false;
selectedCliente: Cliente | null = null;

// Configurações de paginação
paginationConfig = { pageSize: 10, orderByField: 'nome' };
pageSizeOptions = [5, 10, 20, 50];
```

### Métodos Principais

#### Configuração e Inicialização
- `initializePaginationConfig()`: Configura paginação (10 itens/página)
- `onLoadValues()`: Sem carregamento adicional necessário
- `initializeForm()`: Inicializa formulário reativo com validações

#### Operações CRUD
- `saveItem()`: Salva cliente (criação/edição) com tratamento de erros
- `onDeleteItem()`: Exclui cliente com verificação de uso
- `buscarItensPaginados()`: Busca paginada por nome

#### Gestão do Modal
- `openFormModal()`: Abre modal para criação/edição
- `closeFormModal()`: Fecha modal e limpa estado
- `saveClienteFromModal()`: Processa salvamento do modal

## Service ClienteService

### Métodos Disponíveis

#### Operações Básicas
```typescript
// Listagem simples (compatibilidade)
listarClientes(): Observable<Cliente[]>

// Criação com normalização e validação
adicionarCliente(cliente: Cliente): Promise<DocumentReference>

// Atualização com normalização
atualizarCliente(id: string, cliente: Partial<Cliente>): Promise<void>

// Exclusão com verificação de integridade
excluirCliente(id: string, nome: string): Promise<void>
```

#### Busca Paginada
```typescript
buscarClientesPaginadas(
  pageSize: number, 
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>,
  searchTerm?: string
): Promise<PaginatedResult<Cliente>>
```

### Normalização de Dados
- **nome**: Convertido automaticamente para UPPERCASE
- **celular**: Mantido conforme digitado
- **empresa_id**: Preenchido automaticamente com UID do usuário

### Validações de Integridade
- **Duplicatas**: Verifica se já existe cliente com mesmo nome
- **Uso em Vendas**: Impede exclusão se cliente possui vendas
- **Isolamento**: Operações restritas à empresa do usuário

### Configuração de Busca
- **Campo de Busca**: nome
- **Ordenação**: nome (asc) - ordem alfabética
- **Contagem**: Usando `getCountFromServer` para performance

## Interface do Usuário

### Layout Principal
```
[CLIENTES] - Título
├── Campo de Busca (por nome)
├── Tabela de Clientes
│   ├── Nome | Celular | Ações
│   └── Controles de ação (editar, excluir)
└── Controles de Paginação
```

### Modal de Cliente
```
[Cadastrar/Editar Cliente]
├── Nome (obrigatório, max 50 chars)
├── Celular (obrigatório, max 20 chars)
└── Botões (Cancelar | Salvar)
```

### Recursos Visuais
- **Modal Responsivo**: Interface adaptável para diferentes telas
- **Estilização de Erro**: Campos com fundo vermelho quando há erro
- **Feedback Visual**: Cores diferenciadas para ações
- **Validação em Tempo Real**: Mensagens de erro contextuais

## Validação e Feedback

### Validação de Formulário
```typescript
form = new UntypedFormGroup({
  id: new UntypedFormControl({ value: '', disabled: true }),
  nome: new UntypedFormControl(undefined, [Validators.required, Validators.maxLength(50)]),
  celular: new UntypedFormControl(undefined, [
    Validators.required, 
    Validators.maxLength(20),
    Validators.pattern(/^\(\d{2}\) \d{4,5}-\d{4}$/)
  ])
});
```

### Estilização Condicional
```html
<!-- Aplicação de classes de erro via ngClass -->
[ngClass]="{'bg-red-50 border-l-4 border-l-red-500': hasFieldError(form, 'nome', 'required', profileForm) || hasFieldError(form, 'nome', 'maxlength', profileForm)}"
```

### Mensagens de Erro
- **Nome obrigatório**: "Nome é obrigatório"
- **Nome muito longo**: "Nome deve ter no máximo 50 caracteres"
- **Celular obrigatório**: "Celular é obrigatório"
- **Celular muito longo**: "Celular deve ter no máximo 20 caracteres"
- **Formato inválido**: "Formato inválido. Use: (11) 99999-9999"
- **Cliente duplicado**: "Cliente já existe!"
- **Cliente em uso**: "Não é possível excluir o cliente pois ele possui vendas associadas!"

## Fluxo de Trabalho

### Criação de Cliente
1. **Iniciar**: Clicar no ícone "+" na tabela
2. **Preencher**: Inserir nome e celular
3. **Validar**: Sistema verifica duplicatas
4. **Salvar**: Confirmar criação

### Edição de Cliente
1. **Selecionar**: Clicar no ícone de edição
2. **Modificar**: Alterar dados necessários
3. **Salvar**: Confirmar alterações

### Exclusão de Cliente
1. **Selecionar**: Clicar no ícone de exclusão
2. **Confirmar**: Modal de confirmação
3. **Validar**: Sistema verifica se cliente tem vendas
4. **Excluir**: Remove se não houver impedimentos

## Boas Práticas

### Performance
- **Paginação**: Implementada para grandes volumes
- **Contagem Eficiente**: Uso de `getCountFromServer`
- **Busca Otimizada**: Filtros aplicados no Firestore

### UX/UI
- **Modal Pattern**: Interface consistente com outros módulos
- **Feedback Visual**: Estados claros de erro e sucesso
- **Responsividade**: Interface adaptável
- **Acessibilidade**: Labels e semântica adequadas

### Segurança
- **Isolamento por Empresa**: Filtro automático por `empresa_id`
- **Validação de Integridade**: Verificação de relacionamentos
- **Normalização**: Dados consistentes (UPPERCASE para nomes)

### Manutenibilidade
- **Herança**: Uso do BaseComponent para reutilização
- **Padrão Modal**: Consistência com outros formulários
- **Separação**: Service dedicado para operações de dados
- **Tipagem**: Interfaces TypeScript bem definidas

## Integração com Outros Módulos

### Dependências
- **BaseComponent**: Para funcionalidades comuns
- **MessageService**: Para feedback ao usuário
- **LoaderService**: Para indicadores de carregamento
- **FirebaseAuth**: Para autenticação e isolamento

### Relacionamentos
- **Vendas**: Clientes podem ter vendas associadas
- **Empresa**: Clientes isolados por empresa/usuário
- **Validação**: Verificação de uso antes da exclusão

### Impacto em Outros Módulos
- **VendaService**: Pode referenciar clientes por nome
- **Relatórios**: Clientes podem aparecer em análises futuras

## Arquivos do Módulo

### Service
- `cliente.service.ts`: Service com operações CRUD e paginação

### Componente Principal
- `cliente.component.ts`: Componente principal com herança do BaseComponent
- `cliente.component.html`: Template com tabela e paginação
- `cliente.component.css`: Estilos (vazio, usa Tailwind)

### Modal Form
- `cliente-form-modal.component.ts`: Componente do modal
- `cliente-form-modal.component.html`: Template do formulário
- `cliente-form-modal.component.css`: Estilos do modal

### Configuração
- `app.module.ts`: Declaração dos componentes
- `app-routing.module.ts`: Rota `/clientes`
- `sidebar.component.html`: Link no menu

## Melhorias Futuras

### Funcionalidades
- [ ] Campos adicionais (email, endereço)
- [ ] Histórico de vendas por cliente
- [ ] Exportação de lista de clientes
- [ ] Importação em lote
- [ ] Auto-complete na tela de vendas

### Validações
- [ ] Validação de formato de celular
- [ ] Verificação de celular duplicado
- [ ] Integração com APIs de validação

### UX
- [ ] Busca por celular também
- [ ] Ordenação por diferentes campos
- [ ] Filtros avançados
- [ ] Visualização detalhada

### Performance
- [ ] Cache de clientes frequentes
- [ ] Lazy loading
- [ ] Otimização de queries

---

**Criado em**: 2 de julho de 2025  
**Versão**: 1.0  
**Padrão**: Seguindo arquitetura dos módulos Produtos e Unidades de Medida  
**Responsável**: Sistema de Estoque CEASA
