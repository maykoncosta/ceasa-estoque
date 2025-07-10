# Funcionalidade de Impressão - Cupom Não Fiscal

## Visão Geral
A funcionalidade de impressão permite gerar cupons não fiscais em PDF das vendas realizadas, facilitando a entrega de comprovantes aos clientes.

## Características do Cupom

### Formato
- **Tamanho**: 80mm de largura (padrão de impressoras térmicas)
- **Altura**: Variável conforme número de produtos
- **Formato de arquivo**: PDF

### Layout do Cupom
```
====================================
        CEASA ESTOQUE
====================================
      CUPOM NÃO FISCAL
====================================

Cliente: [Nome do Cliente]
Data: [Data da Venda]  Hora: [Hora:Min:Seg]

------------------------------------
Item                   Qtd  Unit.  Total
------------------------------------
Tomate                 2.0   5.50   11.00
Cebola                 1.5   3.00    4.50
Batata                 3.0   2.75    8.25
------------------------------------

                TOTAL GERAL: R$ 23.75

(Lucro: R$ 4.25)

====================================
                Cupom: 12345678
           09/07/2025 14:30:45

      Obrigado pela preferencia!
           Volte sempre!
```

### Informações Incluídas
- **Cabeçalho**: Nome da empresa e tipo de documento
- **Dados da Venda**: Cliente, data e hora com segundos
- **Produtos**: Layout em colunas com nome, quantidade, preço unitário e total
- **Total Geral**: Valor total da venda destacado
- **Lucro**: Informação opcional para controle interno
- **Total Geral**: Valor total da venda
- **Lucro**: Informação opcional para controle interno
- **Rodapé**: Agradecimento, data/hora de impressão e ID do cupom

## Como Usar

### 1. Acessar a Lista de Vendas
- Navegar para **Vendas** no menu principal
- Localizar a venda desejada na lista

### 2. Imprimir o Cupom
- Clicar no botão **Imprimir** (ícone de impressora verde) na linha da venda
- O sistema gerará automaticamente o PDF do cupom
- O arquivo será baixado com nome descritivo

### 3. Nome do Arquivo
O arquivo PDF é gerado com o padrão:
```
cupom_[CLIENTE]_[DATA]_[ID].pdf
```

Exemplo: `cupom_JOAO_SILVA_2025-07-09_12345678.pdf`

## Recursos Técnicos

### Biblioteca Utilizada
- **jsPDF**: Biblioteca JavaScript para geração de PDFs
- **Versão**: Mais recente disponível no npm

### Características Técnicas
- **Fonte**: Courier (aparência de impressora térmica)
- **Altura Dinâmica**: Calcula automaticamente baseada no número de produtos
- **Cálculo**: `(linhas_fixas + produtos) * altura_linha + margem`
- **Formatação**: Colunas alinhadas com larguras fixas
- **Robustez**: Tratamento de erros e validação de dados

### Compatibilidade
- ✅ Funciona em todos os navegadores modernos
- ✅ Responsivo para diferentes tamanhos de tela
- ✅ Compatível com impressoras térmicas de 80mm
- ✅ Geração offline (não requer internet após carregamento)

### Performance
- Geração rápida (menos de 1 segundo)
- Arquivo leve (normalmente menos de 100KB)
- Altura otimizada conforme conteúdo
- Não sobrecarrega o servidor

## Benefícios

### Para o Negócio
- **Profissionalismo**: Cupons padronizados e bem formatados
- **Controle**: ID único para cada cupom gerado com timestamp
- **Rastreabilidade**: Data e hora de impressão com segundos
- **Economia**: Não requer papel especial, funciona com impressoras comuns
- **Flexibilidade**: Layout responsivo ao número de produtos

### Para o Cliente
- **Comprovante**: Documento da compra realizada
- **Clareza**: Informações organizadas em colunas legíveis
- **Portabilidade**: Arquivo digital que pode ser salvo ou impresso
- **Detalhamento**: Valores unitários e totais por produto

### Para o Usuário
- **Simplicidade**: Um clique para gerar o cupom
- **Rapidez**: Geração instantânea
- **Organização**: Nomes de arquivo padronizados

## Possíveis Melhorias Futuras

### Funcionalidades
- [ ] Opção de imprimir múltiplas vendas em lote
- [ ] Personalização do cabeçalho com logo da empresa
- [ ] Diferentes formatos de cupom (A4, carta, etc.)
- [ ] Envio automático por email ou WhatsApp
- [ ] Numeração sequencial personalizada
- [ ] QR Code com link para validação online

### Configurações
- [ ] Opções de fonte e tamanho
- [ ] Escolha de cores
- [ ] Campos opcionais (lucro, margem, etc.)
- [ ] Template customizável

## Troubleshooting

### Problemas Comuns

#### Cupom não é gerado
- **Causa**: Bloqueador de pop-ups ativo
- **Solução**: Permitir downloads automáticos no navegador

#### Texto cortado ou mal formatado
- **Causa**: Nomes de produtos muito longos
- **Solução**: O sistema quebra automaticamente linhas longas

#### PDF não abre
- **Causa**: Leitor de PDF não instalado
- **Solução**: Instalar Adobe Reader ou usar navegador

---

**Implementado em**: 09 de julho de 2025  
**Versão**: 1.0  
**Biblioteca**: jsPDF  
**Compatibilidade**: Todos os navegadores modernos
