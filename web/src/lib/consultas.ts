/*
 * Perguntas sobre os dados: «que cor tem esta atividade?», «quanto fiz hoje disto?»…
 *
 * São funções puras: recebem os dados e devolvem uma resposta, sem mexer em nada.
 * Isso torna-as fáceis de perceber e de testar (fase 5: Vitest).
 */
import type { Atividade, Config, Dados, Dia, Evento } from '../tipos';
import { ESCALA_RODA, MIN, PASSO_RODA, hoje, inicioDoDia, limitar, somarDias } from './tempo';

/** Paleta usada pelas atividades que não têm cor escolhida. */
export const PALETA = [
  '#2f8f78',
  '#3b6ea8',
  '#d06a3a',
  '#8a5aa8',
  '#c99a22',
  '#4f8a3a',
  '#b8456a',
  '#2f8f9a'
];

/** Atividade pelo id. */
export const atividadePorId = (dados: Dados, id: number | null | undefined) =>
  dados.acts.find(a => a.id === id);

/** Cor da atividade: a escolhida, ou uma da paleta conforme o id. */
export const corDe = (a: Atividade | undefined) =>
  a ? (a.color ?? PALETA[(a.id - 1) % PALETA.length]) : '#888';

/** O evento ocupa tempo? (não é de dia inteiro nem está marcado como «livre») */
export const ocupa = (e: Evento) => !e.diaTodo && !e.livre;

/** Milissegundos feitos numa atividade num dia, incluindo o bloco que está a correr. */
export function totalNoDia(dados: Dados, id: number, dia: Dia, agora = Date.now()): number {
  const a = inicioDoDia(dia);
  const b = inicioDoDia(somarDias(dia, 1));
  // só conta a parte de cada bloco que cai dentro do dia
  const dentro = (s: number, e: number) => Math.max(0, Math.min(e, b) - Math.max(s, a));
  let total = 0;
  for (const bloco of dados.log) if (bloco.id === id) total += dentro(bloco.start, bloco.end);
  if (dados.run?.id === id) total += dentro(dados.run.start, agora);
  return total;
}

/**
 * Duração sugerida na roda (minutos) para uma atividade:
 * a última que usaste nela; se nunca usaste, o que falta da meta (até ao bloco máximo), ou 25.
 */
export function duracaoSugerida(dados: Dados, config: Config, a: Atividade | undefined): number {
  if (!a) return 25;
  if (a.dur != null) return a.dur;
  const falta = a.goal ? a.goal - Math.round(totalNoDia(dados, a.id, hoje()) / MIN) : 0;
  const m = Math.min(config.bloco_max_min || 45, falta > 0 ? falta : 25);
  return limitar(Math.round(m / PASSO_RODA) * PASSO_RODA, PASSO_RODA, ESCALA_RODA);
}

/** A atividade mostrada na roda: a escolhida, senão a que está a correr, senão a primeira. */
export const atividadeNaRoda = (dados: Dados) =>
  atividadePorId(dados, dados.sel) ?? atividadePorId(dados, dados.run?.id) ?? dados.acts[0];

/** O bloco a correr, mas só se for da atividade mostrada na roda. */
export function corridaNaRoda(dados: Dados) {
  const a = atividadeNaRoda(dados);
  return dados.run && a && dados.run.id === a.id ? dados.run : null;
}

/** Duração mostrada na roda (minutos): a do bloco a correr, ou a sugerida. */
export function duracaoNaRoda(dados: Dados, config: Config): number {
  const r = corridaNaRoda(dados);
  return r ? r.target || 0 : duracaoSugerida(dados, config, atividadeNaRoda(dados));
}
