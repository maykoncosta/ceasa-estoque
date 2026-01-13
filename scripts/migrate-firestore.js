const admin = require('firebase-admin');
const fs = require('fs');

// Configuração do banco de ORIGEM
const serviceAccountOrigem = require('./firebase-origem-key.json');
const adminOrigem = admin.initializeApp({
  credential: admin.credential.cert(serviceAccountOrigem),
  projectId: serviceAccountOrigem.project_id,
  databaseURL: `https://${serviceAccountOrigem.project_id}.firebaseio.com`
}, 'origem');

// Usar o database (default) como origem e prod como destino
const dbOrigem = adminOrigem.firestore();
// Especificar o database padrão explicitamente
dbOrigem.settings({ databaseId: '(default)' });

// Para o destino, usamos a mesma chave mas apontamos para o database 'prod'
const adminDestino = admin.initializeApp({
  credential: admin.credential.cert(serviceAccountOrigem), // Mesma chave, mesmo projeto
  projectId: serviceAccountOrigem.project_id,
  databaseURL: `https://${serviceAccountOrigem.project_id}.firebaseio.com`
}, 'destino');

const dbDestino = adminDestino.firestore();
// Especificar o database 'prod' como destino
dbDestino.settings({ databaseId: 'prod' });

// Collections a serem migradas
const COLLECTIONS = [
  'empresas',
  'usuarios',
  'clientes',
  'produtos',
  'unidades',
  'unidades_medida',
  'vendas',
  'estatisticas_diarias',
  'estatisticas_mensais'
];

async function migrateCollection(collectionName) {
  console.log(`\n📦 Migrando collection: ${collectionName}`);
  
  try {
    const snapshot = await dbOrigem.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`   ⚠️  Collection vazia: ${collectionName}`);
      return { total: 0, sucesso: 0, erros: 0 };
    }

    console.log(`   📊 Total de documentos: ${snapshot.size}`);
    
    let sucesso = 0;
    let erros = 0;
    let batch = dbDestino.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      try {
        const docRef = dbDestino.collection(collectionName).doc(doc.id);
        batch.set(docRef, doc.data());
        batchCount++;

        // Firestore batch tem limite de 500 operações
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`   ✅ Batch de ${batchCount} documentos commitado`);
          // Criar novo batch após commit
          batch = dbDestino.batch();
          batchCount = 0;
        }
        sucesso++;
      } catch (error) {
        console.error(`   ❌ Erro ao migrar documento ${doc.id}:`, error.message);
        erros++;
      }
    }

    // Commit do batch restante
    if (batchCount > 0) {
      await batch.commit();
      console.log(`   ✅ Batch final de ${batchCount} documentos commitado`);
    }

    console.log(`   ✅ Migração concluída: ${sucesso} sucesso, ${erros} erros`);
    return { total: snapshot.size, sucesso, erros };
  } catch (error) {
    console.error(`   ❌ Erro ao migrar collection ${collectionName}:`, error.message);
    return { total: 0, sucesso: 0, erros: 1 };
  }
}

async function migrateSubcollections(parentCollection, parentDocId, subcollections) {
  for (const subcollection of subcollections) {
    console.log(`\n   📁 Migrando subcollection: ${parentCollection}/${parentDocId}/${subcollection}`);
    
    try {
      const snapshot = await dbOrigem
        .collection(parentCollection)
        .doc(parentDocId)
        .collection(subcollection)
        .get();

      if (snapshot.empty) {
        console.log(`      ⚠️  Subcollection vazia`);
        continue;
      }

      const batch = dbDestino.batch();
      let count = 0;

      for (const doc of snapshot.docs) {
        const docRef = dbDestino
          .collection(parentCollection)
          .doc(parentDocId)
          .collection(subcollection)
          .doc(doc.id);
        batch.set(docRef, doc.data());
        count++;
      }

      if (count > 0) {
        await batch.commit();
        console.log(`      ✅ ${count} documentos migrados`);
      }
    } catch (error) {
      console.error(`      ❌ Erro:`, error.message);
    }
  }
}

async function confirmarMigracao() {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Digite "CONFIRMAR" para prosseguir: ', (answer) => {
      readline.close();
      resolve(answer.toUpperCase() === 'CONFIRMAR');
    });
  });
}

async function migrateAll() {
  console.log('🚀 Iniciando migração de dados do Firestore\n');
  console.log('='.repeat(60));
  console.log(`📍 Projeto: ${serviceAccountOrigem.project_id}`);
  console.log(`📍 Database ORIGEM:  (default)`);
  console.log(`📍 Database DESTINO: prod`);
  console.log('='.repeat(60));
  console.log('\n⚠️  ATENÇÃO: Esta operação irá COPIAR dados de (default) para prod!');
  console.log('⚠️  O database prod será SOBRESCRITO!\n');

  const confirmado = await confirmarMigracao();
  
  if (!confirmado) {
    console.log('\n❌ Migração cancelada pelo usuário.\n');
    process.exit(0);
  }

  console.log('\n✅ Confirmado! Iniciando migração...\n');

  const stats = {
    totalCollections: 0,
    totalDocs: 0,
    totalSucesso: 0,
    totalErros: 0
  };

  for (const collection of COLLECTIONS) {
    const result = await migrateCollection(collection);
    stats.totalCollections++;
    stats.totalDocs += result.total;
    stats.totalSucesso += result.sucesso;
    stats.totalErros += result.erros;

    // Delay entre collections para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA MIGRAÇÃO');
  console.log('='.repeat(60));
  console.log(`Collections migradas: ${stats.totalCollections}`);
  console.log(`Total de documentos: ${stats.totalDocs}`);
  console.log(`✅ Sucesso: ${stats.totalSucesso}`);
  console.log(`❌ Erros: ${stats.totalErros}`);
  console.log('='.repeat(60) + '\n');

  process.exit(0);
}

// Executar migração
migrateAll().catch(error => {
  console.error('❌ Erro fatal na migração:', error);
  process.exit(1);
});
