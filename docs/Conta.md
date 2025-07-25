# 🏢 Component de Conta da Empresa

## 📋 Visão Geral

O component de conta é responsável por gerenciar todas as informações da empresa no sistema CEASA Estoque. Permite configurar dados corporativos, personalizar a aparência do sistema e visualizar estatísticas da conta.

## 🎯 Funcionalidades

### 1. **Dados da Empresa**
- Nome da empresa (obrigatório)
- Razão social (obrigatório)
- CNPJ (opcional, com validação)
- Status da conta (ativo/inativo)

### 2. **Endereço Completo**
- Rua, número e complemento
- Bairro, cidade e estado
- CEP com validação e preenchimento automático
- Integração com API de CEP (ViaCEP)

### 3. **Informações de Contato**
- Telefone fixo (opcional)
- Celular (opcional)
- Email (obrigatório, com validação)
- Website (opcional)

### 4. **Logo da Empresa**
- Upload de imagem (JPG, PNG, SVG)
- Tamanho máximo: 2MB
- Preview em tempo real
- Integração com Firebase Storage
- Opção de remoção

### 5. **Configurações do Sistema**
- Cores personalizadas (primária e secundária)
- Formato de data (DD/MM/YYYY ou MM/DD/YYYY)
- Configurações de moeda
- Opções de impressão (mostrar/ocultar logo nos cupons)

### 6. **Estatísticas da Conta**
- Data de criação da conta
- Última atualização dos dados
- Total de produtos cadastrados
- Total de clientes ativos
- Total de vendas realizadas
- Valor total em vendas

## 🏗️ Arquitetura

### **Estrutura de Dados**

```typescript
interface Empresa {
  id: string;                    // ID único da empresa (mesmo do usuário)
  nome: string;                  // Nome fantasia
  razao_social: string;          // Razão social
  cnpj?: string;                 // CNPJ (opcional)
  endereco: EnderecoEmpresa;     // Dados de endereço
  contato: ContatoEmpresa;       // Informações de contato
  logo_url?: string;             // URL da logo no Storage
  configuracoes: ConfigEmpresa;  // Configurações do sistema
  criado_em: Date;               // Data de criação
  atualizado_em: Date;           // Última atualização
  ativo: boolean;                // Status da conta
}
```

### **Serviços Utilizados**

1. **EmpresaService** - CRUD de dados da empresa
2. **AuthService** - Autenticação e dados do usuário
3. **FirebaseStorage** - Upload/gerenciamento de logos
4. **ViaCEP API** - Validação e preenchimento de endereço

## 🎨 Interface do Usuário

### **Layout Responsivo**
- **Desktop:** Grade de 2 colunas com 6 cards
- **Tablet:** Grade adaptável (1-2 colunas)
- **Mobile:** Coluna única empilhada

### **Cards do Sistema**

1. **Card "Dados da Empresa"**
   - Formulário com nome, razão social, CNPJ
   - Indicador de status da conta
   - Validações em tempo real

2. **Card "Endereço"**
   - Formulário completo de endereço
   - Campo CEP com busca automática
   - Mapa opcional (futura implementação)

3. **Card "Contato"**
   - Campos de telefone, email e website
   - Validação de formato de email
   - Links clicáveis para contato

4. **Card "Logo da Empresa"**
   - Área de upload drag-and-drop
   - Preview da logo atual
   - Botões para upload/remoção
   - Indicador de progresso

5. **Card "Configurações"**
   - Seletores de cor (color picker)
   - Opções de formato e preferências
   - Preview das mudanças
   - Botão de reset para padrões

6. **Card "Estatísticas"**
   - Métricas da conta em números
   - Gráficos simples (opcional)
   - Informações de uso do sistema

## 🔧 Funcionalidades Técnicas

### **Validações Implementadas**

1. **CNPJ:** Algoritmo de validação brasileiro
2. **CEP:** Formato brasileiro + consulta API
3. **Email:** Validação de formato RFC
4. **Arquivo:** Tipo, tamanho e dimensões
5. **Cores:** Formato hexadecimal válido

### **Estados da Aplicação**

1. **Loading:** Durante carregamento de dados
2. **Saving:** Durante salvamento de alterações
3. **Error:** Tratamento de erros com mensagens
4. **Success:** Confirmações de operações
5. **Uploading:** Progresso de upload de arquivos

### **Integração com Print Service**

O sistema atualiza automaticamente o PrintService para usar os dados da empresa nos cupons:
- Nome da empresa no cabeçalho
- Logo nos cupons (se habilitada)
- Informações de contato no rodapé
- Cores personalizadas (futura implementação)

## 📱 Experiência do Usuário

### **Fluxo Principal**
1. Usuário acessa a seção "Conta"
2. Sistema carrega dados existentes ou cria empresa inicial
3. Usuário edita informações nos cards
4. Salvamento automático ou manual por card
5. Feedback visual de todas as operações
6. Validações em tempo real

### **Casos de Uso Especiais**

1. **Primeira configuração:** Wizard de setup inicial
2. **Upload de logo:** Preview e redimensionamento
3. **Mudança de cores:** Preview em tempo real
4. **Validação de CNPJ/CEP:** Feedback imediato
5. **Backup de dados:** Export/import de configurações

## 🔐 Segurança e Permissões

### **Regras de Acesso**
- Apenas o proprietário pode editar dados da empresa
- Validação de ownership via AuthService
- Sanitização de uploads de imagem
- Validação server-side no Firestore

### **Backup e Recuperação**
- Versionamento automático de alterações
- Log de atividades administrativas
- Recuperação de logos anteriores
- Export de dados para backup

## 🚀 Futuras Implementações

1. **Multi-empresa:** Suporte a múltiplas empresas por usuário
2. **Temas personalizados:** Personalização completa da UI
3. **Integração contábil:** Export para sistemas contábeis
4. **API pública:** Acesso aos dados via API REST
5. **Relatórios avançados:** Dashboard executivo completo

## 📊 Métricas e Analytics

### **Dados Coletados**
- Frequência de atualizações
- Funcionalidades mais utilizadas
- Tempo de configuração inicial
- Taxa de completude dos dados

### **KPIs do Component**
- Percentual de campos preenchidos
- Tempo médio de configuração
- Frequência de mudanças de logo
- Uso das funcionalidades avançadas

---

## 🛠️ Arquivos do Component

### **Core**
- `empresa.service.ts` - Serviço principal
- `empresa.model.ts` - Interfaces e tipos
- `empresa.service.spec.ts` - Testes unitários

### **Component**
- `conta.component.ts` - Lógica do component
- `conta.component.html` - Template
- `conta.component.css` - Estilos

### **Subcomponents**
- `upload-logo/` - Component de upload de logo
- `color-picker/` - Seletor de cores (opcional)
- `stats-card/` - Card de estatísticas (opcional)

### **Utils**
- `cnpj.validator.ts` - Validador de CNPJ
- `cep.service.ts` - Integração ViaCEP
- `image.utils.ts` - Utilitários de imagem

---

*Documentação criada em: 25/07/2025*  
*Versão: 1.0*  
*Sistema: CEASA Estoque*
