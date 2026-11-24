/*
 * O plano de cada dia (funções puras): quanto falta das metas, onde cabe um bloco,
 * «✨ Preencher o dia» e encher um dia vazio com o programa da semana ativa.
 *
 * Um plano é uma lista de blocos {uid, id, start, end} guardada em dados.plans[dia].
 * Uma lista vazia ([]) quer dizer que o dia foi limpo de propósito: a semana ativa não o volta a encher.
 */
import type { Atividade, Bloco, Config, Dados, Dia, Evento } from '../tipos';
import { ocupa, totalNoDia } from './consultas';
import { MIN, hoje, inicioDoDia, novoUid, somarDias } from './tempo';

/** Os blocos do plano encaixam de 5 em 5 minutos. */
export const ENCAIXE = 5 * MIN;
/** Arredonda um instante ao encaixe mais próximo. */
export const encaixar = (t: number) => Math.round(t / ENCAIXE) * ENCAIXE;
/** Um bloco nunca é mais curto do que 10 minutos (ao criar com um clique ou ao preencher). */
const BLOCO_MINIMO = 10;

/** Blocos planeados para um dia. */
export const blocosDoDia = (dados: Dados, dia: Dia): Bloco[] => dados.plans[dia] ?? [];

/** Só se planeia hoje ou dias futuros. */
export const podePlanear = (dia: Dia) => dia >= hoje();

/** O primeiro instante em que se pode pôr um bloco: hoje, agora (não se planeia para trás); nos outros dias, a meia-noite. */
export const primeiroInstante = (dia: Dia, agora = Date.now()) =>
  dia === hoje() ? Math.floor(agora / ENCAIXE) * ENCAIXE : inicioDoDia(dia);

/** Hora «08:00» nesse dia → instante (ms). */
export function horaNoDia(dia: Dia, hora: string | undefined, porOmissao: string): number {
  const [h, m] = (hora || porOmissao).split(':').map(Number);
  return inicioDoDia(dia) + ((h || 0) * 60 + (m || 0)) * MIN;
}

/** Onde começa o plano: agora (hoje) ou a hora de início das Definições (dias futuros). */
export const inicioDoPlano = (dia: Dia, config: Config, agora = Date.now()) =>
  dia === hoje() ? Math.ceil(agora / ENCAIXE) * ENCAIXE : horaNoDia(dia, config.inicio_do_dia, '08:00');

/** Onde acaba o plano: a hora de fim das Definições. */
export const fimDoPlano = (dia: Dia, config: Config) => horaNoDia(dia, config.fim_do_dia, '23:00');

/** Minutos planeados de uma atividade num dia (hoje, só a parte que ainda não passou). */
export function minutosPlaneados(dados: Dados, id: number, dia: Dia, excetoUid?: string, agora = Date.now()) {
  const desde = dia === hoje() ? agora : 0;
  return blocosDoDia(dados, dia)
    .filter(p => p.id === id && p.uid !== excetoUid && p.end > desde)
    .reduce((soma, p) => soma + (p.end - Math.max(p.start, desde)) / MIN, 0);
}

/** Quanto falta da meta nesse dia (minutos), já contando o que fizeste (hoje) e o que planeaste. null = sem meta. */
export function faltaDaMeta(dados: Dados, a: Atividade, dia: Dia, excetoUid?: string, agora = Date.now()) {
  if (!a.goal) return null;
  const feito = dia === hoje() ? totalNoDia(dados, a.id, dia, agora) / MIN : 0;
  return Math.round(a.goal - feito - minutosPlaneados(dados, a.id, dia, excetoUid, agora));
}

/** Duração (min) sugerida para um bloco novo: o que falta da meta, até ao bloco máximo das Definições. */
export function duracaoDeBlocoNovo(dados: Dados, config: Config, a: Atividade, dia: Dia) {
  const falta = faltaDaMeta(dados, a, dia);
  const maximo = Math.max(BLOCO_MINIMO, config.bloco_max_min || 45);
  const m = Math.min(maximo, falta != null && falta >= BLOCO_MINIMO ? falta : 30);
  return Math.max(BLOCO_MINIMO, Math.round(m / 5) * 5);
}

/**
 * Onde acaba um bloco que começa em `inicio` e quer durar `minutos`:
 * encurta-o para não passar por cima do bloco seguinte do plano, nem de um compromisso, nem da meia-noite.
 */
export function fimQueCabe(
  dados: Dados,
  eventos: Evento[],
  dia: Dia,
  inicio: number,
  minutos: number,
  excetoUid?: string
) {
  let fim = Math.min(inicio + minutos * MIN, inicioDoDia(somarDias(dia, 1)));
  for (const p of blocosDoDia(dados, dia))
    if (p.uid !== excetoUid && p.start >= inicio && p.start < fim) fim = p.start;
  for (const e of eventos.filter(ocupa)) if (e.inicio > inicio && e.inicio < fim) fim = e.inicio;
  return Math.max(fim, inicio + ENCAIXE);
}

/** Ordena os blocos por hora de início. */
export const ordenar = (blocos: Bloco[]) => [...blocos].sort((a, b) => a.start - b.start);

/** Resultado de «Preencher o dia». */
export type Preenchimento =
  | { tipo: 'ok'; novos: Bloco[]; faltaMinutos: number }
  | { tipo: 'aviso'; mensagem: string };

/**
 * «✨ Preencher o dia»: encaixa o que falta de cada meta nos espaços livres do dia,
 * sem mexer nos blocos que já existem nem nos compromissos.
 *
 * Como funciona:
 *   1. junta tudo o que está ocupado (compromissos + blocos do plano) e calcula os espaços livres;
 *   2. em cada espaço, põe blocos da atividade a que falta mais (sem repetir a anterior, se houver outra),
 *      com no máximo `bloco_max_min` minutos e 5 minutos de pausa entre blocos.
 */
export function preencherDia(
  dados: Dados,
  config: Config,
  eventos: Evento[],
  dia: Dia,
  agora = Date.now()
): Preenchimento {
  const de = inicioDoPlano(dia, config, agora);
  const ate = fimDoPlano(dia, config);
  if (de >= ate) return { tipo: 'aviso', mensagem: 'Já passou da hora de fim do dia (muda nas Definições).' };

  // 1. espaços livres
  const existentes = blocosDoDia(dados, dia);
  const ocupado = [
    ...eventos.filter(ocupa).map(e => [e.inicio, e.fim]),
    ...existentes.filter(p => p.end > de).map(p => [p.start, p.end])
  ].sort((a, b) => a[0] - b[0]);
  const livres: [number, number][] = [];
  let cursor = de;
  for (const [s, e] of ocupado) {
    if (e <= cursor) continue;
    if (s >= ate) break;
    if (s > cursor) livres.push([cursor, Math.min(s, ate)]);
    cursor = Math.max(cursor, e);
  }
  if (cursor < ate) livres.push([cursor, ate]);

  // quanto falta de cada meta
  const falta: Record<number, number> = {};
  for (const a of dados.acts) {
    const f = faltaDaMeta(dados, a, dia, undefined, agora);
    if (f != null && f >= BLOCO_MINIMO) falta[a.id] = f;
  }
  if (!Object.keys(falta).length)
    return {
      tipo: 'aviso',
      mensagem: dados.acts.some(a => a.goal)
        ? 'As metas desse dia já estão todas cumpridas ou planeadas ✓'
        : 'Define metas em minutos nas atividades (✎ Editar) para o plano saber o que encaixar.'
    };

  // 2. encher os espaços
  const maximo = Math.max(BLOCO_MINIMO, config.bloco_max_min || 45);
  const PAUSA = 5;
  const novos: Bloco[] = [];
  let anterior = dia === hoje() && dados.run ? dados.run.id : null;
  for (const [inicioLivre, fimLivre] of livres) {
    let t = inicioLivre;
    for (;;) {
      const resta = Math.floor((fimLivre - t) / MIN);
      if (resta < BLOCO_MINIMO) break;
      const candidatos = Object.keys(falta)
        .map(Number)
        .filter(id => falta[id] >= BLOCO_MINIMO)
        .sort((x, y) => falta[y] - falta[x]);
      if (!candidatos.length) break;
      const escolhida = candidatos.find(id => id !== anterior) ?? candidatos[0];
      const minutos = Math.min(falta[escolhida], maximo, resta);
      if (minutos < BLOCO_MINIMO) break;
      novos.push({ uid: novoUid(), id: escolhida, start: t, end: t + minutos * MIN });
      falta[escolhida] -= minutos;
      anterior = escolhida;
      t += (minutos + PAUSA) * MIN;
    }
  }
  if (!novos.length)
    return { tipo: 'aviso', mensagem: 'Não há espaços livres suficientes até ao fim do dia.' };
  return { tipo: 'ok', novos, faltaMinutos: Object.values(falta).reduce((s, v) => s + Math.max(0, v), 0) };
}

/** Dia da semana de um dia: 0 = domingo … 6 = sábado. */
export const diaDaSemana = (dia: Dia) => new Date(inicioDoDia(dia)).getDay();

/**
 * Blocos do programa da semana ativa para esse dia, já em instantes desse dia.
 * Devolve null se o dia não deve ser enchido (dia passado, já tem plano, ou a semana não tem nada para ele).
 */
export function blocosDaSemanaAtiva(dados: Dados, dia: Dia): Bloco[] | null {
  if (!podePlanear(dia) || dados.plans[dia] !== undefined) return null;
  const semana = dados.semanas.find(s => s.id === dados.semanaAtiva);
  const programa = semana?.dias[String(diaDaSemana(dia)) as keyof typeof semana.dias] ?? [];
  const d0 = inicioDoDia(dia);
  const blocos = programa
    .filter(b => dados.acts.some(a => a.id === b.id) && b.e > b.s)
    .map(b => ({ uid: novoUid(), id: b.id, start: d0 + b.s * MIN, end: d0 + b.e * MIN }));
  return blocos.length ? blocos : null;
}
