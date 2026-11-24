/*
 * Tipos dos dados da app.
 *
 * Descrevem exatamente o que o servidor Python devolve e grava (dados.json e config.json).
 * Se um campo mudar no servidor, muda-se aqui, e o TypeScript aponta todos os sítios
 * do código que deixaram de bater certo.
 *
 * Tempos: os instantes (start, end, inicio, fim) estão em milissegundos desde 1970 (Date.now()).
 * Nos modelos de plano (BlocoModelo), s/e são minutos desde a meia-noite (ex.: 510 = 08:30).
 */

/** Um dia no formato «AAAA-MM-DD», ex.: "2026-11-24". */
export type Dia = string;

/** Uma atividade (os cartões: «Estudo», «Candidaturas»…). */
export interface Atividade {
  id: number;
  name: string;
  /** Meta diária em minutos. */
  goal: number;
  /** Cor escolhida (ex.: "#2f8f78"); sem cor, usa-se uma da paleta. */
  color?: string;
  /** Última duração escolhida na roda, em minutos. */
  dur?: number;
}

/** Um bloco de tempo: já feito (no registo) ou planeado (no plano de um dia). */
export interface Bloco {
  /** Identificador único do bloco. */
  uid: string;
  /** Id da atividade. */
  id: number;
  start: number;
  end: number;
}

/** A atividade que está a correr. */
export interface EmCurso {
  id: number;
  start: number;
  /** Duração escolhida na roda (minutos); 0 = sem limite. */
  target: number;
  /** Já se avisou que o tempo acabou? */
  alerted?: boolean;
  /** Começou a partir de um bloco do plano? */
  fromPlan?: boolean;
}

/** Um bloco dentro de um plano guardado (minutos desde a meia-noite). */
export interface BlocoModelo {
  id: number;
  s: number;
  e: number;
}

/** Um plano do dia guardado (ex.: «Dia de estudo»). */
export interface Modelo {
  id: number;
  nome: string;
  blocos: BlocoModelo[];
}

/** Uma semana: o programa de cada dia, de "0" (domingo) a "6" (sábado). */
export interface Semana {
  id: number;
  nome: string;
  dias: Partial<Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', BlocoModelo[]>>;
}

/** Tudo o que está em dados.json (GET/POST /api/dados). */
export interface Dados {
  acts: Atividade[];
  /** Blocos feitos. */
  log: Bloco[];
  run: EmCurso | null;
  /** Próximo id livre para uma atividade nova. */
  next: number;
  /** Plano de cada dia. Uma lista vazia quer dizer «limpo de propósito» (a semana ativa não o volta a encher). */
  plans: Record<Dia, Bloco[]>;
  /** Atividade escolhida na roda. */
  sel: number | null;
  modelos: Modelo[];
  semanas: Semana[];
  semanaAtiva?: number | null;
}

/** Um calendário iCal configurado nas Definições. */
export interface CalendarioConfig {
  nome: string;
  url: string;
  cor?: string;
}

/** Nomes dos sons disponíveis (ver os sons sintetizados). */
export type NomeSom = 'sino' | 'campainha' | 'marimba' | 'suave' | 'arcade' | 'digital' | 'nenhum';

/** As definições (GET/POST /api/config). */
export interface Config {
  calendarios: CalendarioConfig[];
  pausar_em_eventos: boolean;
  aviso_minutos: number;
  /** Hora «08:00» a partir da qual se planeia um dia que ainda não começou. */
  inicio_do_dia: string;
  fim_do_dia: string;
  bloco_max_min: number;
  parar_no_fim: boolean;
  som_mudo: boolean;
  /** 0–100 */
  som_volume: number;
  som_fim: NomeSom;
  som_aviso: NomeSom;
  som_plano: NomeSom;
  google_escrever: boolean;
}

/** Um compromisso lido dos calendários (GET /api/eventos). */
export interface Evento {
  titulo: string;
  inicio: number;
  fim: number;
  diaTodo: boolean;
  local: string;
  /** Nome do calendário de onde veio. */
  calendario: string;
  cor: string | null;
  /** Marcado como «livre» no calendário (não ocupa tempo). */
  livre: boolean;
}

/** Resposta de GET /api/eventos. */
export interface RespostaEventos {
  eventos: Evento[];
  /** Mensagens de calendários que falharam. */
  erros: string[];
}

/** Estado da ligação ao Google (GET /api/google/estado). */
export interface EstadoGoogle {
  /** As bibliotecas do Google estão instaladas no servidor? */
  disponivel: boolean;
  credenciais: boolean;
  ligado: boolean;
  escrever: boolean;
  a_ligar: boolean;
  erro: string | null;
  /** Última sincronização (ms). */
  ultimo: number;
  enviados: number;
}
