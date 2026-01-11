# 🚀 Guia de Deploy - Cloud Functions para Otimização

## 📋 O que foi criado

### 1. **Cloud Functions** (`functions/src/index.ts`)
- ✅ Triggers automáticos quando vendas são criadas/editadas/deletadas
- ✅ Function agendada para recalcular estatísticas diariamente às 00:05
- ✅ Processamento de agregações em tempo real

### 2. **Serviço de Estatísticas** (`estatisticas.service.ts`)
- ✅ Métodos otimizados para buscar dados agregados
- ✅ Suporte a períodos personalizados
- ✅ Agregação inteligente de múltiplos dias

### 3. **Collection `estatisticas_diarias`**
- ✅ Dados pré-processados por dia/empresa
- ✅ Produtos mais vendidos e lucrativos
- ✅ Clientes frequentes
- ✅ Totais e médias

## 🔧 Passos para Deploy

### 1. Instalar Firebase CLI (se ainda não tiver)
```bash
npm install -g firebase-tools
```

### 2. Login no Firebase
```bash
firebase login
```

### 3. Instalar dependências das Functions
```bash
cd functions
npm install
```

### 4. Build das Functions
```bash
npm run build
```

### 5. Deploy das Functions
```bash
# Voltar para raiz do projeto
cd ..

# Deploy apenas das functions
firebase deploy --only functions

# OU deploy completo (functions + firestore rules + indexes)
firebase deploy
```

### 6. Aguardar processamento inicial
- As functions começarão a processar vendas automaticamente
- Para gerar estatísticas históricas, você pode:
  - Aguardar as vendas novas serem processadas
  - OU criar um script de migração (opcional)

## 📊 Como usar no código

### Dashboard otimizado:
```typescript
import { EstatisticasService } from 'src/app/core/services/estatisticas.service';

constructor(private estatisticasService: EstatisticasService) {}

async carregarDados() {
  // Estatísticas de hoje
  const hoje = await this.estatisticasService.buscarEstatisticasHoje();
  this.vendasHoje = hoje?.total_vendas || 0;
  this.valorTotalHoje = hoje?.valor_total || 0;

  // Últimos 7 dias
  const ultimos7Dias = await this.estatisticasService.buscarEstatisticasUltimosDias(7);
  this.produtosMaisVendidos = ultimos7Dias.produtos_mais_vendidos.slice(0, 5);
  this.clientesMaisFrequentes = ultimos7Dias.clientes_mais_frequentes.slice(0, 3);
}
```

### Relatório otimizado:
```typescript
async gerarRelatorio() {
  const dataInicial = new Date(this.form.get('dataInicial')?.value);
  const dataFinal = new Date(this.form.get('dataFinal')?.value);
  
  const resumo = await this.estatisticasService.buscarEstatisticasPeriodo(
    dataInicial, 
    dataFinal
  );
  
  this.resumo = resumo;
}
```

## 💰 Economia Estimada

### Antes (sem functions):
- Dashboard: ~1000 reads (todas as vendas)
- Relatório mensal: ~1000 reads
- **Total: ~2000 reads por acesso**

### Depois (com functions):
- Dashboard: 1-7 reads (estatísticas agregadas)
- Relatório mensal: ~30 reads (30 dias)
- **Total: ~37 reads por acesso**

### 🎯 Economia: **~98% menos leituras!**

## ⚠️ Importante

### Custos das Functions:
- Triggers: Gratuito até 2 milhões/mês
- Function agendada: Gratuito até 3/dia
- **Seu uso está bem dentro do free tier!**

### Monitoramento:
```bash
# Ver logs em tempo real
firebase functions:log

# Ver logs de uma function específica
firebase functions:log --only onVendaCriada
```

## 🔍 Verificar se está funcionando

1. Acesse o Firebase Console
2. Vá em **Firestore Database**
3. Procure a collection `estatisticas_diarias`
4. Deve aparecer documentos no formato: `{empresa_id}_{YYYY-MM-DD}`

## 🛠️ Próximos passos

Depois do deploy, você precisará atualizar:
1. ✅ Dashboard component - usar EstatisticasService
2. ✅ Relatório component - usar EstatisticasService

Quer que eu faça essas atualizações agora?
