/*
 * O campo onde se escreve o tempo nos números grandes da roda (funções puras).
 *
 * O campo guarda só algarismos, e os dois pontos são fixos: os números entram pela direita.
 *   6 → "00:06"   6,3 → "00:63"   6,3,4 → "06:34"   1,2,3,4,5 → "123:45"
 * Assim é impossível apagar os ":" ou escrever letras.
 */
import { doisDigitos } from './tempo';

/** Máximo que se pode escrever: 12 horas (em minutos). */
export const MAXIMO_ESCRITO = 12 * 60;
/** Quantos algarismos cabem no campo (até "999:99"). */
export const MAX_ALGARISMOS = 5;

/** Minutos → algarismos do campo: 6.5 → "630" (6 min 30 s). */
export function algarismosDe(minutos: number): string {
  const s = Math.max(0, Math.round(minutos * 60));
  return s ? String(Math.floor(s / 60)) + doisDigitos(s % 60) : '';
}

/** Algarismos do campo → minutos. "634" → 6.5667. Os segundos a mais contam: "090" = 1 min 30 s. */
export function minutosDe(algarismos: string): number {
  const s = algarismos.padStart(3, '0');
  return (+s.slice(0, -2) * 60 + +s.slice(-2)) / 60;
}

/** O que o campo mostra: "634" → "06:34". */
export function mostrarAlgarismos(algarismos: string): string {
  const s = algarismos.padStart(4, '0');
  return s.slice(0, -2) + ':' + s.slice(-2);
}

/** Junta um algarismo à direita (sem zeros à esquerda). Devolve null se já não couber. */
export function juntarAlgarismo(algarismos: string, novo: string): string | null {
  if (algarismos.length >= MAX_ALGARISMOS) return null;
  return (algarismos + novo).replace(/^0+/, '');
}

/** Textos de ajuda mostrados por baixo do campo. */
export const DICAS = {
  parado: 'escreve os números · Enter',
  aCorrer: 'quanto falta · Enter',
  demasiado: 'no máximo 12 horas'
};
