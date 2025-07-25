export interface EnderecoEmpresa {
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface ContatoEmpresa {
  telefone?: string;
  celular?: string;
  email: string;
  site?: string;
}

export interface ConfiguracaoEmpresa {
  cor_primaria: string;
  cor_secundaria: string;
  mostrar_logo_cupom: boolean;
  formato_data: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  moeda: string;
}

export interface Empresa {
  id: string;
  nome: string;
  razao_social: string;
  cnpj?: string;
  endereco: EnderecoEmpresa;
  contato: ContatoEmpresa;
  logo_url?: string;
  configuracoes: ConfiguracaoEmpresa;
  criado_em: Date;
  atualizado_em: Date;
  ativo: boolean;
}

export interface EstatisticasEmpresa {
  total_produtos: number;
  total_clientes: number;
  total_vendas: number;
  valor_total_vendas: number;
  data_primeira_venda?: Date;
  data_ultima_venda?: Date;
}

export interface EnderecoViaCep {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
}

// Dados padrão para nova empresa
export const EMPRESA_PADRAO: Partial<Empresa> = {
  nome: '',
  razao_social: '',
  endereco: {
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: ''
  },
  contato: {
    telefone: '',
    celular: '',
    email: '',
    site: ''
  },
  configuracoes: {
    cor_primaria: '#3B82F6', // Azul padrão
    cor_secundaria: '#10B981', // Verde padrão
    mostrar_logo_cupom: true,
    formato_data: 'DD/MM/YYYY',
    moeda: 'BRL'
  },
  ativo: true
};

// Estados brasileiros para dropdown
export const ESTADOS_BRASIL = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];

// Cores predefinidas para seleção rápida
export const CORES_PREDEFINIDAS = [
  '#3B82F6', // Azul
  '#10B981', // Verde
  '#F59E0B', // Amarelo
  '#EF4444', // Vermelho
  '#8B5CF6', // Roxo
  '#06B6D4', // Ciano
  '#84CC16', // Lima
  '#F97316', // Laranja
  '#EC4899', // Rosa
  '#6B7280'  // Cinza
];
