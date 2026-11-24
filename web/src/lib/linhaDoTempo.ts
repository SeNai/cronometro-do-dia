/*
 * Geometria da linha do tempo (funções puras).
 *
 * A linha do tempo é uma coluna vertical: cada minuto ocupa PX_POR_MINUTO píxeis.
 * Tem uma margem de 52 px à esquerda para as horas e três faixas iguais:
 *   0 = Agenda (compromissos) · 1 = Feito (registo) · 2 = Plano.
 */
import type { Config, Dados, Dia, Evento } from '../tipos';
import { blocosDoDia, inicioDoPlano } from './plano';
import { MIN, hoje, inicioDoDia } from './tempo';

export const PX_POR_MINUTO = 1.4;
const HORA = 60 * MIN;

/** Posição horizontal e largura de cada faixa (CSS). */
export const FAIXAS = {
  agenda: { left: '52px', width: 'calc((100% - 54px) / 3 - 5px)' },
  feito: { left: 'calc(52px + (100% - 54px) / 3)', width: 'calc((100% - 54px) / 3 - 5px)' },
  plano: { left: 'calc(52px + 2 * (100% - 54px) / 3)', width: 'calc((100% - 54px) / 3 - 5px)' }
} as const;
export type Faixa = keyof typeof FAIXAS;

/** O intervalo desenhado: de `lo` (ms) até à meia-noite seguinte (`hi`), começando na hora `primeiraHora`. */
export interface Intervalo {
  lo: number;
  hi: number;
  primeiraHora: number;
  /** Altura total em píxeis. */
  altura: number;
}

/**
 * Começa às 7h (ou mais cedo, se o plano do dia começar antes), e recua até à hora
 * de qualquer coisa que exista mais cedo nesse dia: compromissos, blocos feitos ou planeados.
 */
export function calcularIntervalo(
  dados: Dados,
  eventos: Evento[],
  dia: Dia,
  config: Config,
  agora: number
): Intervalo {
  const d0 = inicioDoDia(dia);
  let h0 = dia === hoje() ? 7 : Math.min(7, Math.floor((inicioDoPlano(dia, config, agora) - d0) / HORA));
  const considerar = (t: number) => {
    const h = (Math.max(t, d0) - d0) / HORA;
    if (h >= 0 && h < h0) h0 = Math.floor(h);
  };
  eventos.filter(e => !e.diaTodo).forEach(e => considerar(e.inicio));
  dados.log.forEach(b => considerar(b.start));
  blocosDoDia(dados, dia).forEach(b => considerar(b.start));
  if (dados.run) considerar(dados.run.start);
  h0 = Math.max(0, h0);
  return {
    lo: d0 + h0 * HORA,
    hi: d0 + 24 * HORA,
    primeiraHora: h0,
    altura: (24 - h0) * 60 * PX_POR_MINUTO + 10
  };
}

/** Posição vertical (px) de um instante. */
export const topoDe = (t: number, lo: number) => ((t - lo) / MIN) * PX_POR_MINUTO;

/** Instante correspondente a uma posição vertical (px) dentro da linha do tempo. */
export const instanteEm = (y: number, lo: number) => lo + (y / PX_POR_MINUTO) * MIN;
