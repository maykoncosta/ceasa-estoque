# 🚀 Instruções Rápidas - Migração de Databases Firestore

## Cenário: Um projeto Firebase com dois databases
- **Database origem**: `(default)` - banco atual com dados
- **Database destino**: `prod` - banco novo vazio

## 📥 Passo 1: Baixar a chave do projeto

1. Abra: https://console.firebase.google.com/project/balcao-rapido/settings/serviceaccounts/adminsdk
2. Clique em **"Gerar nova chave privada"**
3. Salve o arquivo como `firebase-origem-key.json` na pasta `scripts/`

**Nota**: Você só precisa de UMA chave porque é o mesmo projeto!

## ✅ Passo 2: Verificar arquivos

Certifique-se de que este arquivo existe em `scripts/`:
```
scripts/
├── migrate-firestore.js
└── firebase-origem-key.json    ✅
```

## ▶️ Passo 3: Executar migração

```bash
cd scripts
node migrate-firestore.js
```

O script irá:
1. Mostrar os databases (ORIGEM: default, DESTINO: prod)
2. Pedir confirmação (você deve digitar "CONFIRMAR")
3. Copiar todos os dados de (default) para prod
4. Mostrar relatório final

## 🎯 Exemplo de saída esperada:

```
🚀 Iniciando migração de dados do Firestore

============================================================
📍 ORIGEM:  meu-projeto-antigo
📍 DESTINO: balcao-rapido
============================================================

⚠️  ATENÇÃO: Esta operação irá SOBRESCREVER dados no banco de destino!
⚠️  Certifique-se de que os projetos estão corretos!

Digite "CONFIRMAR" para prosseguir: CONFIRMAR

✅ Confirmado! Iniciando migração...

📦 Migrando collection: empresas
   📊 Total de documentos: 1
   ✅ Batch de 1 documentos commitado
   ✅ Migração concluída: 1 sucesso, 0 erros
...
```

## ⚠️ Importante:

- **Confira os nomes dos projetos** antes de confirmar!
- O script vai **SOBRESCREVER** dados no destino
- Não migra: autenticação (Firebase Auth) e Storage (arquivos)

## 🔐 Segurança:

- **NUNCA** commite os arquivos `*-key.json` no Git
- Eles já estão no `.gitignore`
- Delete os arquivos após a migração
