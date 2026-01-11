import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { collection, Firestore, query, where, getDocs, orderBy, limit } from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';

export interface EstatisticaDiaria {
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

export interface EstatisticaMensal {
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

export interface ResumoEstatisticas {
  total_vendas: number;
  valor_total: number;
  lucro_total: number;
  media_por_venda: number;
  produtos_mais_vendidos: Array<{
    produto_id: string;
    nome: string;
    quantidade: number;
    valor_total: number;
    lucro_total: number;
    unidade_medida?: string;
  }>;
  produtos_mais_lucrativos: Array<{
    produto_id: string;
    nome: string;
    quantidade: number;
    valor_total: number;
    lucro_total: number;
    unidade_medida?: string;
  }>;
  clientes_mais_frequentes: Array<{
    nome: string;
    quantidade_compras: number;
    valor_total: number;
  }>;
  vendas_por_dia: Array<{
    data: string;
    total_vendas: number;
    valor_total: number;
    lucro_total: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class EstatisticasService {

  constructor(private firestore: Firestore, private auth: Auth) { }

  /**
   * Busca estatísticas de um período específico
   */
  async buscarEstatisticasPeriodo(dataInicial: Date, dataFinal: Date): Promise<ResumoEstatisticas> {
    const user = this.auth.currentUser;
    if (!user) {
      return this.getResumoVazio();
    }

    const dataInicialStr = this.formatarData(dataInicial);
    const dataFinalStr = this.formatarData(dataFinal);

    const estatisticasRef = collection(this.firestore, 'estatisticas_diarias');
    const q = query(
      estatisticasRef,
      where('empresa_id', '==', user.uid),
      where('data', '>=', dataInicialStr),
      where('data', '<=', dataFinalStr),
      orderBy('data', 'asc')
    );

    const snapshot = await getDocs(q);
    const estatisticas: EstatisticaDiaria[] = [];

    snapshot.forEach((doc) => {
      estatisticas.push(doc.data() as EstatisticaDiaria);
    });

    return this.agregarEstatisticas(estatisticas);
  }

  /**
   * Busca estatísticas do dia atual
   */
  async buscarEstatisticasHoje(): Promise<EstatisticaDiaria | null> {
    const user = this.auth.currentUser;
    if (!user) return null;

    const hoje = new Date();
    const dataStr = this.formatarData(hoje);
    const estatisticaId = `${user.uid}_${dataStr}`;

    const estatisticasRef = collection(this.firestore, 'estatisticas_diarias');
    const q = query(
      estatisticasRef,
      where('empresa_id', '==', user.uid),
      where('data', '==', dataStr),
      limit(1)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as EstatisticaDiaria;
  }

  /**
   * Busca estatísticas dos últimos N dias
   */
  async buscarEstatisticasUltimosDias(dias: number): Promise<ResumoEstatisticas> {
    const dataFinal = new Date();
    const dataInicial = new Date();
    dataInicial.setDate(dataFinal.getDate() - dias);

    return this.buscarEstatisticasPeriodo(dataInicial, dataFinal);
  }

  /**
   * Busca estatísticas do mês atual
   */
  async buscarEstatisticasMesAtual(): Promise<ResumoEstatisticas> {
    const hoje = new Date();
    const dataInicial = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const dataFinal = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    return this.buscarEstatisticasPeriodo(dataInicial, dataFinal);
  }

  /**
   * Busca estatísticas mensais pré-agregadas
   */
  async buscarEstatisticasMensal(ano: number, mes: number): Promise<EstatisticaMensal | null> {
    const user = this.auth.currentUser;
    if (!user) return null;

    const mesStr = `${ano}-${String(mes).padStart(2, '0')}`;
    const estatisticaId = `${user.uid}_${mesStr}`;

    const estatisticasRef = collection(this.firestore, 'estatisticas_mensais');
    const q = query(
      estatisticasRef,
      where('empresa_id', '==', user.uid),
      where('mes', '==', mesStr),
      limit(1)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as EstatisticaMensal;
  }

  /**
   * Busca múltiplos meses de estatísticas
   */
  async buscarEstatisticasMeses(dataInicial: Date, dataFinal: Date): Promise<ResumoEstatisticas> {
    const user = this.auth.currentUser;
    if (!user) {
      return this.getResumoVazio();
    }

    const mesInicial = `${dataInicial.getFullYear()}-${String(dataInicial.getMonth() + 1).padStart(2, '0')}`;
    const mesFinal = `${dataFinal.getFullYear()}-${String(dataFinal.getMonth() + 1).padStart(2, '0')}`;

    const estatisticasRef = collection(this.firestore, 'estatisticas_mensais');
    const q = query(
      estatisticasRef,
      where('empresa_id', '==', user.uid),
      where('mes', '>=', mesInicial),
      where('mes', '<=', mesFinal),
      orderBy('mes', 'asc')
    );

    const snapshot = await getDocs(q);
    const estatisticasMensais: EstatisticaMensal[] = [];

    snapshot.forEach((doc) => {
      estatisticasMensais.push(doc.data() as EstatisticaMensal);
    });

    return this.agregarEstatisticasMensais(estatisticasMensais, dataInicial, dataFinal);
  }

  /**
   * Agrega múltiplas estatísticas diárias em um resumo consolidado
   */
  private agregarEstatisticas(estatisticas: EstatisticaDiaria[]): ResumoEstatisticas {
    if (estatisticas.length === 0) {
      return this.getResumoVazio();
    }

    let totalVendas = 0;
    let valorTotal = 0;
    let lucroTotal = 0;

    const produtosMap = new Map<string, any>();
    const clientesMap = new Map<string, any>();
    const vendasPorDia: Array<any> = [];

    estatisticas.forEach((est) => {
      totalVendas += est.total_vendas;
      valorTotal += est.valor_total;
      lucroTotal += est.lucro_total;

      // Agregar vendas por dia
      vendasPorDia.push({
        data: est.data,
        total_vendas: est.total_vendas,
        valor_total: est.valor_total,
        lucro_total: est.lucro_total
      });

      // Agregar produtos
      Object.keys(est.produtos_vendidos).forEach((produtoId) => {
        const produto = est.produtos_vendidos[produtoId];
        
        if (produtosMap.has(produtoId)) {
          const existing = produtosMap.get(produtoId);
          existing.quantidade += produto.quantidade;
          existing.valor_total += produto.valor_total;
          existing.lucro_total += produto.lucro_total;
        } else {
          produtosMap.set(produtoId, {
            produto_id: produtoId,
            nome: produto.nome,
            quantidade: produto.quantidade,
            valor_total: produto.valor_total,
            lucro_total: produto.lucro_total,
            unidade_medida: produto.unidade_medida
          });
        }
      });

      // Agregar clientes
      Object.keys(est.clientes).forEach((clienteNome) => {
        const cliente = est.clientes[clienteNome];
        
        if (clientesMap.has(clienteNome)) {
          const existing = clientesMap.get(clienteNome);
          existing.quantidade_compras += cliente.quantidade_compras;
          existing.valor_total += cliente.valor_total;
        } else {
          clientesMap.set(clienteNome, {
            nome: clienteNome,
            quantidade_compras: cliente.quantidade_compras,
            valor_total: cliente.valor_total
          });
        }
      });
    });

    // Converter maps para arrays e ordenar
    const produtosMaisVendidos = Array.from(produtosMap.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);

    const produtosMaisLucrativos = Array.from(produtosMap.values())
      .sort((a, b) => b.lucro_total - a.lucro_total)
      .slice(0, 10);

    const clientesMaisFrequentes = Array.from(clientesMap.values())
      .sort((a, b) => b.quantidade_compras - a.quantidade_compras)
      .slice(0, 10);

    return {
      total_vendas: totalVendas,
      valor_total: valorTotal,
      lucro_total: lucroTotal,
      media_por_venda: totalVendas > 0 ? valorTotal / totalVendas : 0,
      produtos_mais_vendidos: produtosMaisVendidos,
      produtos_mais_lucrativos: produtosMaisLucrativos,
      clientes_mais_frequentes: clientesMaisFrequentes,
      vendas_por_dia: vendasPorDia
    };
  }

  /**
   * Agrega estatísticas mensais em um resumo
   */
  private agregarEstatisticasMensais(
    estatisticasMensais: EstatisticaMensal[],
    dataInicial: Date,
    dataFinal: Date
  ): ResumoEstatisticas {
    if (estatisticasMensais.length === 0) {
      return this.getResumoVazio();
    }

    // Se temos apenas um mês, usar dados diretos
    if (estatisticasMensais.length === 1) {
      const est = estatisticasMensais[0];

      return {
        total_vendas: est.total_vendas,
        valor_total: est.valor_total,
        lucro_total: est.lucro_total,
        media_por_venda: est.media_por_venda,
        produtos_mais_vendidos: est.produtos_mais_vendidos.map(p => ({
          produto_id: p.produto_id,
          nome: p.nome,
          quantidade: p.quantidade_total,
          valor_total: p.valor_total,
          lucro_total: p.lucro_total,
          unidade_medida: p.unidade_medida
        })),
        produtos_mais_lucrativos: est.produtos_mais_vendidos
          .sort((a, b) => b.lucro_total - a.lucro_total)
          .slice(0, 5)
          .map(p => ({
            produto_id: p.produto_id,
            nome: p.nome,
            quantidade: p.quantidade_total,
            valor_total: p.valor_total,
            lucro_total: p.lucro_total,
            unidade_medida: p.unidade_medida
          })),
        clientes_mais_frequentes: est.clientes_frequentes,
        vendas_por_dia: est.vendas_por_dia.map(v => ({
          data: v.data,
          total_vendas: v.total_vendas,
          valor_total: v.valor_total,
          lucro_total: 0
        }))
      };
    }

    // Agregar múltiplos meses
    let totalVendas = 0;
    let valorTotal = 0;
    let lucroTotal = 0;

    const produtosMap = new Map<string, any>();
    const clientesMap = new Map<string, any>();
    const vendasPorDia: Array<any> = [];

    estatisticasMensais.forEach((est) => {
      totalVendas += est.total_vendas;
      valorTotal += est.valor_total;
      lucroTotal += est.lucro_total;

      // Agregar vendas por dia
      est.vendas_por_dia.forEach(v => {
        vendasPorDia.push({
          data: v.data,
          total_vendas: v.total_vendas,
          valor_total: v.valor_total,
          lucro_total: 0
        });
      });

      // Agregar produtos
      est.produtos_mais_vendidos.forEach((produto) => {
        if (produtosMap.has(produto.produto_id)) {
          const existing = produtosMap.get(produto.produto_id);
          existing.quantidade += produto.quantidade_total;
          existing.valor_total += produto.valor_total;
          existing.lucro_total += produto.lucro_total;
        } else {
          produtosMap.set(produto.produto_id, {
            produto_id: produto.produto_id,
            nome: produto.nome,
            quantidade: produto.quantidade_total,
            valor_total: produto.valor_total,
            lucro_total: produto.lucro_total,
            unidade_medida: produto.unidade_medida
          });
        }
      });

      // Agregar clientes
      est.clientes_frequentes.forEach((cliente) => {
        if (clientesMap.has(cliente.nome)) {
          const existing = clientesMap.get(cliente.nome);
          existing.quantidade_compras += cliente.quantidade_compras;
          existing.valor_total += cliente.valor_total;
        } else {
          clientesMap.set(cliente.nome, {
            nome: cliente.nome,
            quantidade_compras: cliente.quantidade_compras,
            valor_total: cliente.valor_total
          });
        }
      });
    });

    // Top 5 produtos
    const produtosMaisVendidos = Array.from(produtosMap.values())
      .sort((a, b) => b.valor_total - a.valor_total)
      .slice(0, 5);

    const produtosMaisLucrativos = Array.from(produtosMap.values())
      .sort((a, b) => b.lucro_total - a.lucro_total)
      .slice(0, 5);

    const clientesMaisFrequentes = Array.from(clientesMap.values())
      .sort((a, b) => b.quantidade_compras - a.quantidade_compras)
      .slice(0, 5);

    return {
      total_vendas: totalVendas,
      valor_total: valorTotal,
      lucro_total: lucroTotal,
      media_por_venda: totalVendas > 0 ? valorTotal / totalVendas : 0,
      produtos_mais_vendidos: produtosMaisVendidos,
      produtos_mais_lucrativos: produtosMaisLucrativos,
      clientes_mais_frequentes: clientesMaisFrequentes,
      vendas_por_dia: vendasPorDia
    };
  }

  /**
   * Retorna um resumo vazio
   */
  private getResumoVazio(): ResumoEstatisticas {
    return {
      total_vendas: 0,
      valor_total: 0,
      lucro_total: 0,
      media_por_venda: 0,
      produtos_mais_vendidos: [],
      produtos_mais_lucrativos: [],
      clientes_mais_frequentes: [],
      vendas_por_dia: []
    };
  }

  /**
   * Formata data para YYYY-MM-DD
   */
  private formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
