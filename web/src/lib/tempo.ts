/*
 * Datas e tempos: constantes e funções puras (sem estado, sem React).
 *
 * Convenções:
 *   - um dia é texto «AAAA-MM-DD» (tipo Dia);
 *   - um instante é em milissegundos (como Date.now());
 *   - uma duração na roda é em minutos (pode ter frações, que são segundos: 6.5 = 6 min 30 s).
 */
import type { Dia } from '../tipos';

/** Um minuto em milissegundos. */
export const MIN = 60_000;
/** A roda vai de 0 a 120 minutos… */
export const ESCALA_RODA = 120;
/** …de 5 em 5. */
export const PASSO_RODA = 5;

/** 7 → "07" */
export const doisDigitos = (n: number) => String(n).padStart(2, '0');

/** O dia local de um instante. */
export function diaDe(t: number): Dia {
  const d = new Date(t);
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}

/** O dia de hoje. */
export const hoje = (): Dia => diaDe(Date.now());

/** Meia-noite (ms) de um dia. */
export function inicioDoDia(dia: Dia): number {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(a, m - 1, d).getTime();
}

/** Soma (ou subtrai) n dias a um dia. */
export function somarDias(dia: Dia, n: number): Dia {
  const [a, m, d] = dia.split('-').map(Number);
  return diaDe(new Date(a, m - 1, d + n).getTime());
}

/** Tempo como num relógio: «05:09» ou «1:05:09». */
export function relogio(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  return (h ? h + ':' : '') + doisDigitos(Math.floor((s % 3600) / 60)) + ':' + doisDigitos(s % 60);
}

/** Tempo curto: «45 min» ou «1h 30». */
export function curto(ms: number): string {
  const m = Math.round(ms / MIN);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? ' ' + doisDigitos(m % 60) : ''}`;
}

/** Hora «14:30» de um instante. */
export function horaMinuto(t: number): string {
  const d = new Date(t);
  return doisDigitos(d.getHours()) + ':' + doisDigitos(d.getMinutes());
}

/** Minutos da roda → «06:34». */
export function minutosSegundos(minutos: number): string {
  const s = Math.round(minutos * 60);
  return doisDigitos(Math.floor(s / 60)) + ':' + doisDigitos(s % 60);
}

/** Minutos da roda → «6 min 34 s», «45 min» ou «20 s». */
export function duracaoPorExtenso(minutos: number): string {
  const s = Math.round(minutos * 60);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return mm && ss ? `${mm} min ${ss} s` : mm ? `${mm} min` : `${ss} s`;
}

/** Identificador único curto (para os blocos do registo e do plano). */
export const novoUid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Limita um número entre um mínimo e um máximo. */
export const limitar = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
