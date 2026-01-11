import {onDocumentCreated, onDocumentUpdated, onDocumentDeleted, onDocumentWritten} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {onRequest} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2";
import * as admin from "firebase-admin";

admin.initializeApp();

// Configurar região padrão
setGlobalOptions({region: "southamerica-east1"});

const db = admin.firestore();

interface Produto {
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_compra: number;
  preco_venda: number;
  total: number;
  unidade_medida?: string;
}

interface Venda {
  id: string;
  empresa_id: string;
  produtos: Produto[];
  valor_total: number;
  lucro_total?: number;
  data: admin.firestore.Timestamp;
  cliente: string;
}

interface EstatisticaDiaria {
  empresa_id: string;
  data: string; // YYYY-MM-DD
  total_vendas: number;
  valor_total: number;
  lucro_total: number;
  produtos_vendidos: {
    [produto_id: string]: {
      nome: string;
      quantidade: number;
      valor_total: number;
      lucro_total: number;
      unidade_medida?: string;
    };
  };
  clientes: {
    [cliente: string]: {
      quantidade_compras: number;
      valor_total: number;
    };
  };
}

interface EstatisticaMensal {
  empresa_id: string;
  mes: string; // YYYY-MM
  total_vendas: number;
  valor_total: number;
  lucro_total: number;
  media_por_venda: number;
  produtos_mais_vendidos: Array<{
    produto_id: string;
    nome: string;
    quantidade_total: number;
    valor_total: number;
    lucro_total: number;
    unidade_medida: string;
  }>;
  clientes_frequentes: Array<{
    nome: string;
    quantidade_compras: number;
    valor_total: number;
  }>;
  vendas_por_dia: Array<{
    data: string;
    total_vendas: number;
    valor_total: number;
  }>;
}

/**
 * Trigger: Atualiza estatísticas quando uma venda é criada
 */
export const onvendacriada = onDocumentCreated("vendas/{vendaId}", async (event) => {
  const venda = event.data?.data() as Venda;
  if (!venda) return;
  await atualizarEstatisticas(venda, "incrementar");
});

/**
 * Trigger: Atualiza estatísticas quando uma venda é atualizada
 */
export const onvendaatualizada = onDocumentUpdated("vendas/{vendaId}", async (event) => {
  const vendaAntiga = event.data?.before.data() as Venda;
  const vendaNova = event.data?.after.data() as Venda;
  
  if (!vendaAntiga || !vendaNova) return;

  // Remover estatísticas antigas
  await atualizarEstatisticas(vendaAntiga, "decrementar");
  // Adicionar estatísticas novas
  await atualizarEstatisticas(vendaNova, "incrementar");
});

/**
 * Trigger: Atualiza estatísticas quando uma venda é deletada
 */
export const onvendadeletada = onDocumentDeleted("vendas/{vendaId}", async (event) => {
  const venda = event.data?.data() as Venda;
  if (!venda) return;
  await atualizarEstatisticas(venda, "decrementar");
});

/**
 * Função auxiliar para atualizar estatísticas
 */
async function atualizarEstatisticas(
  venda: Venda,
  operacao: "incrementar" | "decrementar"
): Promise<void> {
  const dataVenda = venda.data.toDate();
  const dataString = formatarData(dataVenda);
  const estatisticaId = `${venda.empresa_id}_${dataString}`;

  const estatisticaRef = db.collection("estatisticas_diarias")
    .doc(estatisticaId);

  const fator = operacao === "incrementar" ? 1 : -1;

  // Calcular lucro da venda
  let lucroVenda = 0;
  const produtosMap: { [key: string]: any } = {};
  const clientesMap: { [key: string]: any } = {};

  venda.produtos.forEach((produto) => {
    const lucro = (produto.preco_venda - produto.preco_compra) *
      produto.quantidade;
    lucroVenda += lucro;

    // Agregar produtos
    if (!produtosMap[produto.produto_id]) {
      produtosMap[produto.produto_id] = {
        nome: produto.nome,
        quantidade: 0,
        valor_total: 0,
        lucro_total: 0,
        unidade_medida: produto.unidade_medida || "",
      };
    }
    produtosMap[produto.produto_id].quantidade += produto.quantidade * fator;
    produtosMap[produto.produto_id].valor_total += produto.total * fator;
    produtosMap[produto.produto_id].lucro_total += lucro * fator;
  });

  // Agregar clientes
  if (venda.cliente) {
    clientesMap[venda.cliente] = {
      quantidade_compras: fator,
      valor_total: venda.valor_total * fator,
    };
  }

  await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
    const doc = await transaction.get(estatisticaRef);

    if (!doc.exists && operacao === "incrementar") {
      // Criar novo documento
      const novaEstatistica: EstatisticaDiaria = {
        empresa_id: venda.empresa_id,
        data: dataString,
        total_vendas: 1,
        valor_total: venda.valor_total,
        lucro_total: lucroVenda,
        produtos_vendidos: produtosMap,
        clientes: clientesMap,
      };
      transaction.set(estatisticaRef, novaEstatistica);
    } else if (doc.exists) {
      // Atualizar documento existente
      const estatistica = doc.data() as EstatisticaDiaria;

      estatistica.total_vendas += fator;
      estatistica.valor_total += venda.valor_total * fator;
      estatistica.lucro_total += lucroVenda * fator;

      // Atualizar produtos
      Object.keys(produtosMap).forEach((produtoId) => {
        if (!estatistica.produtos_vendidos[produtoId]) {
          estatistica.produtos_vendidos[produtoId] = produtosMap[produtoId];
        } else {
          estatistica.produtos_vendidos[produtoId].quantidade +=
            produtosMap[produtoId].quantidade;
          estatistica.produtos_vendidos[produtoId].valor_total +=
            produtosMap[produtoId].valor_total;
          estatistica.produtos_vendidos[produtoId].lucro_total +=
            produtosMap[produtoId].lucro_total;
        }
      });

      // Atualizar clientes
      Object.keys(clientesMap).forEach((cliente) => {
        if (!estatistica.clientes[cliente]) {
          estatistica.clientes[cliente] = clientesMap[cliente];
        } else {
          estatistica.clientes[cliente].quantidade_compras +=
            clientesMap[cliente].quantidade_compras;
          estatistica.clientes[cliente].valor_total +=
            clientesMap[cliente].valor_total;
        }
      });

      transaction.update(estatisticaRef, estatistica as any);
    }
  });
}

/**
 * Cloud Function agendada: Recalcula estatísticas diárias
 * Executa todo dia às 00:05
 */
export const recalcularestatisticasdiarias = onSchedule({
  schedule: "5 0 * * *",
  timeZone: "America/Sao_Paulo",
}, async (event) => {
  try {
    console.log("Iniciando recálculo de estatísticas diárias");

    const hoje = new Date();
    const dataString = formatarData(hoje);

    // Buscar todas as empresas
    const empresasSnapshot = await db.collection("empresas").get();
    console.log(`Encontradas ${empresasSnapshot.size} empresas`);

    if (empresasSnapshot.empty) {
      console.log("Nenhuma empresa encontrada");
      return;
    }

    for (const empresaDoc of empresasSnapshot.docs) {
      const empresaId = empresaDoc.id;
      console.log(`Processando empresa ${empresaId}`);

      try {
        // Buscar vendas do dia
        const inicioDia = new Date(hoje);
        inicioDia.setHours(0, 0, 0, 0);

        const fimDia = new Date(hoje);
        fimDia.setHours(23, 59, 59, 999);

        const vendasSnapshot = await db.collection("vendas")
          .where("empresa_id", "==", empresaId)
          .where("data", ">=", admin.firestore.Timestamp.fromDate(inicioDia))
          .where("data", "<=", admin.firestore.Timestamp.fromDate(fimDia))
          .get();

        console.log(`Encontradas ${vendasSnapshot.size} vendas para empresa ${empresaId}`);

        // Processar estatísticas
        const estatistica: EstatisticaDiaria = {
          empresa_id: empresaId,
          data: dataString,
          total_vendas: 0,
          valor_total: 0,
          lucro_total: 0,
          produtos_vendidos: {},
          clientes: {},
        };

        vendasSnapshot.docs.forEach((vendaDoc: admin.firestore.QueryDocumentSnapshot) => {
          const venda = vendaDoc.data() as Venda;

          estatistica.total_vendas++;
          estatistica.valor_total += venda.valor_total || 0;

          let lucroVenda = 0;
          if (venda.produtos && Array.isArray(venda.produtos)) {
            venda.produtos.forEach((produto) => {
              const lucro = ((produto.preco_venda || 0) - (produto.preco_compra || 0)) *
                (produto.quantidade || 0);
              lucroVenda += lucro;

              if (!estatistica.produtos_vendidos[produto.produto_id]) {
                estatistica.produtos_vendidos[produto.produto_id] = {
                  nome: produto.nome || "Produto sem nome",
                  quantidade: 0,
                  valor_total: 0,
                  lucro_total: 0,
                  unidade_medida: produto.unidade_medida || "",
                };
              }

              estatistica.produtos_vendidos[produto.produto_id].quantidade +=
                produto.quantidade || 0;
              estatistica.produtos_vendidos[produto.produto_id].valor_total +=
                produto.total || 0;
              estatistica.produtos_vendidos[produto.produto_id].lucro_total +=
                lucro;
            });
          }

          estatistica.lucro_total += lucroVenda;

          // Agregar clientes
          if (venda.cliente) {
            if (!estatistica.clientes[venda.cliente]) {
              estatistica.clientes[venda.cliente] = {
                quantidade_compras: 0,
                valor_total: 0,
              };
            }
            estatistica.clientes[venda.cliente].quantidade_compras++;
            estatistica.clientes[venda.cliente].valor_total += venda.valor_total || 0;
          }
        });

        // Salvar estatística
        const estatisticaId = `${empresaId}_${dataString}`;
        await db.collection("estatisticas_diarias")
          .doc(estatisticaId)
          .set(estatistica);

        console.log(`Estatísticas recalculadas para empresa ${empresaId}: ${estatistica.total_vendas} vendas`);
      } catch (error) {
        console.error(`Erro ao processar empresa ${empresaId}:`, error);
        // Continue processando outras empresas mesmo se uma falhar
      }
    }

    console.log("Recálculo de estatísticas concluído com sucesso");
  } catch (error) {
    console.error("Erro no recálculo de estatísticas:", error);
    throw error;
  }
});

/**
 * Formata data para string YYYY-MM-DD
 */
function formatarData(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/**
 * Trigger: Atualiza estatísticas mensais quando uma estatística diária é criada/atualizada
 */
export const onatualizacaodiaria = onDocumentWritten(
  "estatisticas_diarias/{estatisticaId}",
  async (event) => {
    try {
      const estatisticaDiaria = event.data?.after.data() as EstatisticaDiaria | undefined;
      
      if (!estatisticaDiaria) {
        console.log("Estatística diária deletada, ignorando atualização mensal");
        return;
      }

      const empresaId = estatisticaDiaria.empresa_id;
      const [ano, mes] = estatisticaDiaria.data.split("-");
      const mesString = `${ano}-${mes}`;
      
      await atualizarEstatisticasMensais(empresaId, mesString);
    } catch (error) {
      console.error("Erro ao atualizar estatísticas mensais:", error);
    }
  }
);

/**
 * Função auxiliar para atualizar estatísticas mensais
 */
async function atualizarEstatisticasMensais(
  empresaId: string,
  mesString: string
): Promise<void> {
  console.log(`Atualizando estatísticas mensais para ${empresaId} - ${mesString}`);

  // Buscar todas as estatísticas diárias do mês
  const inicioPeriodo = `${mesString}-01`;
  const [ano, mes] = mesString.split("-");
  const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
  const fimPeriodo = `${mesString}-${String(ultimoDia).padStart(2, "0")}`;

  const estatisticasDiariasSnapshot = await db
    .collection("estatisticas_diarias")
    .where("empresa_id", "==", empresaId)
    .where("data", ">=", inicioPeriodo)
    .where("data", "<=", fimPeriodo)
    .get();

  // Agregar dados
  const estatisticaMensal: EstatisticaMensal = {
    empresa_id: empresaId,
    mes: mesString,
    total_vendas: 0,
    valor_total: 0,
    lucro_total: 0,
    media_por_venda: 0,
    produtos_mais_vendidos: [],
    clientes_frequentes: [],
    vendas_por_dia: [],
  };

  const produtosMap = new Map<string, {
    produto_id: string;
    nome: string;
    quantidade_total: number;
    valor_total: number;
    lucro_total: number;
    unidade_medida: string;
  }>();

  const clientesMap = new Map<string, {
    nome: string;
    quantidade_compras: number;
    valor_total: number;
  }>();

  estatisticasDiariasSnapshot.docs.forEach((doc) => {
    const estatDiaria = doc.data() as EstatisticaDiaria;

    estatisticaMensal.total_vendas += estatDiaria.total_vendas;
    estatisticaMensal.valor_total += estatDiaria.valor_total;
    estatisticaMensal.lucro_total += estatDiaria.lucro_total;

    // Agregar produtos
    Object.entries(estatDiaria.produtos_vendidos).forEach(([produtoId, produto]) => {
      if (produtosMap.has(produtoId)) {
        const produtoExistente = produtosMap.get(produtoId)!;
        produtoExistente.quantidade_total += produto.quantidade;
        produtoExistente.valor_total += produto.valor_total;
        produtoExistente.lucro_total += produto.lucro_total;
      } else {
        produtosMap.set(produtoId, {
          produto_id: produtoId,
          nome: produto.nome,
          quantidade_total: produto.quantidade,
          valor_total: produto.valor_total,
          lucro_total: produto.lucro_total,
          unidade_medida: produto.unidade_medida || "",
        });
      }
    });

    // Agregar clientes
    Object.entries(estatDiaria.clientes).forEach(([clienteNome, cliente]) => {
      if (clientesMap.has(clienteNome)) {
        const clienteExistente = clientesMap.get(clienteNome)!;
        clienteExistente.quantidade_compras += cliente.quantidade_compras;
        clienteExistente.valor_total += cliente.valor_total;
      } else {
        clientesMap.set(clienteNome, {
          nome: clienteNome,
          quantidade_compras: cliente.quantidade_compras,
          valor_total: cliente.valor_total,
        });
      }
    });

    // Adicionar vendas por dia
    estatisticaMensal.vendas_por_dia.push({
      data: estatDiaria.data,
      total_vendas: estatDiaria.total_vendas,
      valor_total: estatDiaria.valor_total,
    });
  });

  // Calcular média
  estatisticaMensal.media_por_venda =
    estatisticaMensal.total_vendas > 0
      ? estatisticaMensal.valor_total / estatisticaMensal.total_vendas
      : 0;

  // Top 5 produtos mais vendidos (por valor)
  estatisticaMensal.produtos_mais_vendidos = Array.from(produtosMap.values())
    .sort((a, b) => b.valor_total - a.valor_total)
    .slice(0, 5);

  // Top 5 clientes mais frequentes
  estatisticaMensal.clientes_frequentes = Array.from(clientesMap.values())
    .sort((a, b) => b.quantidade_compras - a.quantidade_compras)
    .slice(0, 5);

  // Ordenar vendas por dia
  estatisticaMensal.vendas_por_dia.sort((a, b) => a.data.localeCompare(b.data));

  // Salvar estatística mensal
  const estatisticaMensalId = `${empresaId}_${mesString}`;
  await db
    .collection("estatisticas_mensais")
    .doc(estatisticaMensalId)
    .set(estatisticaMensal);

  console.log(
    `Estatísticas mensais atualizadas para ${empresaId} - ${mesString}: ` +
    `${estatisticaMensal.total_vendas} vendas, ` +
    `${estatisticaMensal.produtos_mais_vendidos.length} produtos`
  );
}

/**
 * FUNÇÃO TEMPORÁRIA - Popular estatísticas a partir de vendas existentes
 * Chamar via HTTP: POST https://region-project.cloudfunctions.net/popularestatisticas
 * Depois de usar, remover esta função e fazer redeploy
 */
export const popularestatisticas = onRequest({
  timeoutSeconds: 540, // 9 minutos (máximo)
  memory: "512MiB",
}, async (req, res) => {
  try {
    console.log("Iniciando população de estatísticas...");

    // Buscar todas as vendas
    const vendasSnapshot = await db.collection("vendas").get();
    console.log(`Total de vendas encontradas: ${vendasSnapshot.size}`);

    if (vendasSnapshot.empty) {
      res.json({
        success: true,
        message: "Nenhuma venda encontrada",
        processadas: 0,
      });
      return;
    }

    // Agrupar vendas por empresa e data
    const vendasPorEmpresaData: {
      [key: string]: {
        [data: string]: Venda[]
      }
    } = {};

    vendasSnapshot.forEach((doc) => {
      const venda = doc.data() as Venda;
      venda.id = doc.id;

      const empresaId = venda.empresa_id;
      const data = venda.data.toDate();
      const dataString = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;

      if (!vendasPorEmpresaData[empresaId]) {
        vendasPorEmpresaData[empresaId] = {};
      }
      if (!vendasPorEmpresaData[empresaId][dataString]) {
        vendasPorEmpresaData[empresaId][dataString] = [];
      }

      vendasPorEmpresaData[empresaId][dataString].push(venda);
    });

    // Processar estatísticas diárias
    let diasProcessados = 0;
    const mesesParaProcessar = new Set<string>();

    for (const empresaId of Object.keys(vendasPorEmpresaData)) {
      for (const dataString of Object.keys(vendasPorEmpresaData[empresaId])) {
        const vendas = vendasPorEmpresaData[empresaId][dataString];

        // Calcular estatísticas
        const totalVendas = vendas.length;
        const valorTotal = vendas.reduce((sum, v) => sum + (v.valor_total || 0), 0);
        const lucroTotal = vendas.reduce((sum, v) => sum + (v.lucro_total || 0), 0);

        // Produtos vendidos
        const produtosVendidos: {
          [produto_id: string]: {
            nome: string;
            quantidade: number;
            valor_total: number;
            lucro_total: number;
            unidade_medida?: string;
          };
        } = {};

        vendas.forEach((venda) => {
          venda.produtos.forEach((produto) => {
            if (produtosVendidos[produto.produto_id]) {
              produtosVendidos[produto.produto_id].quantidade += produto.quantidade;
              produtosVendidos[produto.produto_id].valor_total += produto.total;
              produtosVendidos[produto.produto_id].lucro_total += 
                (produto.preco_venda - produto.preco_compra) * produto.quantidade;
            } else {
              produtosVendidos[produto.produto_id] = {
                nome: produto.nome,
                quantidade: produto.quantidade,
                valor_total: produto.total,
                lucro_total: (produto.preco_venda - produto.preco_compra) * produto.quantidade,
                unidade_medida: produto.unidade_medida,
              };
            }
          });
        });

        // Clientes
        const clientes: {
          [cliente: string]: {
            quantidade_compras: number;
            valor_total: number;
          };
        } = {};

        vendas.forEach((venda) => {
          const clienteId = venda.cliente || "sem-cliente";

          if (clientes[clienteId]) {
            clientes[clienteId].quantidade_compras += 1;
            clientes[clienteId].valor_total += venda.valor_total || 0;
          } else {
            clientes[clienteId] = {
              quantidade_compras: 1,
              valor_total: venda.valor_total || 0,
            };
          }
        });

        // Salvar estatística diária
        const estatisticaDiaria: EstatisticaDiaria = {
          empresa_id: empresaId,
          data: dataString,
          total_vendas: totalVendas,
          valor_total: valorTotal,
          lucro_total: lucroTotal,
          produtos_vendidos: produtosVendidos,
          clientes: clientes,
        };

        await db.collection("estatisticas_diarias")
          .doc(`${empresaId}_${dataString}`)
          .set(estatisticaDiaria);

        diasProcessados++;

        // Adicionar mês para processamento posterior
        const [ano, mes] = dataString.split("-");
        mesesParaProcessar.add(`${empresaId}|${ano}-${mes}`);

        // Log a cada 50 dias
        if (diasProcessados % 50 === 0) {
          console.log(`Processados ${diasProcessados} dias...`);
        }
      }
    }

    console.log(`Estatísticas diárias criadas: ${diasProcessados} dias`);

    // Processar estatísticas mensais
    let mesesProcessados = 0;
    for (const chave of Array.from(mesesParaProcessar)) {
      const [empresaId, mesString] = chave.split("|");
      await atualizarEstatisticasMensais(empresaId, mesString);
      mesesProcessados++;

      if (mesesProcessados % 10 === 0) {
        console.log(`Processados ${mesesProcessados} meses...`);
      }
    }

    console.log(`Estatísticas mensais criadas: ${mesesProcessados} meses`);

    res.json({
      success: true,
      message: "Estatísticas populadas com sucesso",
      vendas_processadas: vendasSnapshot.size,
      dias_criados: diasProcessados,
      meses_criados: mesesProcessados,
    });
  } catch (error) {
    console.error("Erro ao popular estatísticas:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});
