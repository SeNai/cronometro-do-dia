/*
 * Planos guardados (funções puras): os «planos do dia» (modelos) e as «semanas».
 *
 *   dados.modelos = [{id, nome, blocos: [{id, s, e}]}]                 um dia-modelo
 *   dados.semanas = [{id, nome, dias: {"0": [blocos], …, "6": […]}}]   um programa para cada dia da semana
 *   dados.semanaAtiva = id da semana que enche sozinha os dias sem plano (ou null)
 *
 * Nos blocos guardados, s e e são minutos desde a meia-noite (ex.: 540 = 09:00).
 */
import type { BlocoModelo, Dados, Dia, Modelo, Semana } from '../tipos';
import { diaDaSemana } from './plano';
import { MIN, curto, doisDigitos, inicioDoDia, novoUid } from './tempo';

export const DIAS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
/** A ordem em que os dias aparecem no editor: segunda primeiro, domingo no fim. */
export const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];
/** Um dia tem 1440 minutos. */
export const MINUTOS_DIA = 1440;

/** O que está aberto no editor: um plano do dia ou uma semana. */
export interface PlanoAberto {
  tipo: 'dia' | 'semana';
  id: number;
}
/** Chave de uma coluna do editor: 'd' (plano do dia) ou '0'–'6' (dia da semana). */
export type Coluna = 'd' | '0' | '1' | '2' | '3' | '4' | '5' | '6';

export const modeloPorId = (dados: Dados, id: number | null | undefined) =>
  dados.modelos.find(m => m.id === id);
export const semanaPorId = (dados: Dados, id: number | null | undefined) =>
  dados.semanas.find(s => s.id === id);
/** O plano do dia ou a semana aberta. */
export const planoGuardado = (dados: Dados, p: PlanoAberto | null): Modelo | Semana | undefined =>
  p ? (p.tipo === 'semana' ? semanaPorId(dados, p.id) : modeloPorId(dados, p.id)) : undefined;

/** Os blocos de uma coluna do editor. */
export function blocosDaColuna(dados: Dados, p: PlanoAberto, coluna: Coluna): BlocoModelo[] {
  if (p.tipo === 'dia') return modeloPorId(dados, p.id)?.blocos ?? [];
  return semanaPorId(dados, p.id)?.dias[coluna as Exclude<Coluna, 'd'>] ?? [];
}

/** Próximo id livre numa lista. */
export const proximoId = (lista: { id: number }[]) => Math.max(0, ...lista.map(x => x.id)) + 1;
/** Minutos somados de uma lista de blocos guardados. */
export const somaMinutos = (blocos: BlocoModelo[] = []) => blocos.reduce((s, b) => s + b.e - b.s, 0);
/** «1 bloco» / «3 blocos». */
export const nBlocos = (n: number) => `${n} bloco${n === 1 ? '' : 's'}`;
/** «3 blocos · 2h 30» */
export const resumoBlocos = (blocos: BlocoModelo[]) =>
  `${nBlocos(blocos.length)} · ${curto(somaMinutos(blocos) * MIN)}`;
/** Dias da semana (na ordem Seg–Dom) que têm programa. */
export const diasComPrograma = (s: Semana) =>
  ORDEM_SEMANA.filter(d => (s.dias[String(d) as keyof Semana['dias']] ?? []).length);
/** «5 dias · 20h» */
export function resumoSemana(s: Semana) {
  const n = diasComPrograma(s).length;
  const total = ORDEM_SEMANA.reduce((t, d) => t + somaMinutos(s.dias[String(d) as keyof Semana['dias']]), 0);
  return `${n} dia${n === 1 ? '' : 's'} · ${curto(total * MIN)}`;
}

/** O programa da semana para o dia da semana de `dia`. */
export const programaDoDia = (s: Semana | undefined, dia: Dia): BlocoModelo[] =>
  s?.dias[String(diaDaSemana(dia)) as keyof Semana['dias']] ?? [];

/** Converte blocos guardados (minutos) em blocos de um dia concreto (instantes), ignorando atividades removidas. */
export function paraOPlanoDoDia(dados: Dados, blocos: BlocoModelo[], dia: Dia) {
  const d0 = inicioDoDia(dia);
  return blocos
    .filter(b => dados.acts.some(a => a.id === b.id) && b.e > b.s)
    .map(b => ({ uid: novoUid(), id: b.id, start: d0 + b.s * MIN, end: d0 + b.e * MIN }));
}

/** «14:30» a partir de minutos desde a meia-noite. */
export const horaDeMinutos = (m: number) => doisDigitos(Math.floor(m / 60) % 24) + ':' + doisDigitos(m % 60);
/** Arredonda minutos aos 5. */
export const encaixarMinutos = (m: number) => Math.round(m / 5) * 5;

/** Se `s` cair dentro de um bloco que já existe, passa para logo a seguir a ele. */
export function primeiroLivre(blocos: BlocoModelo[], s: number) {
  for (const b of [...blocos].sort((x, y) => x.s - y.s)) if (b.s <= s && b.e > s) s = b.e;
  return Math.min(s, MINUTOS_DIA - 5);
}

/** Onde acaba um bloco que começa em `s` e quer durar `minutos`, sem passar por cima do seguinte. */
export function fimQueCabeNoModelo(blocos: BlocoModelo[], s: number, minutos: number, excetoIndice?: number) {
  let e = Math.min(s + minutos, MINUTOS_DIA);
  blocos.forEach((b, i) => {
    if (i !== excetoIndice && b.s >= s && b.s < e) e = b.s;
  });
  return Math.max(e, s + 5);
}

/** Duração por omissão de um bloco novo num plano guardado: a meta, até ao bloco máximo. */
export const duracaoNoModelo = (goal: number | undefined, blocoMax: number) =>
  Math.max(10, Math.min(blocoMax || 45, goal || 30));

/** Ordena blocos guardados por hora de início. */
export const ordenarModelo = (blocos: BlocoModelo[]) => [...blocos].sort((a, b) => a.s - b.s);
