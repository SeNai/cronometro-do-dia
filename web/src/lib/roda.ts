/*
 * Geometria e textos da roda do cronómetro (funções puras, sem React).
 *
 * A roda é um SVG de 300×300 com o centro em (150, 150).
 * O ângulo 0 é o topo, e cresce no sentido dos ponteiros do relógio:
 * 0 min no topo, 30 min à direita, 60 min em baixo, 90 min à esquerda.
 */
import { ESCALA_RODA, MIN, PASSO_RODA, duracaoPorExtenso, minutosSegundos, relogio } from './tempo';
import type { EmCurso } from '../tipos';

/** Centro e raio do arco da roda. */
export const CENTRO = 150;
export const RAIO = 104;

/** Ponto (x, y) a uma distância `r` do centro, num ângulo em radianos. */
export const pontoNoAngulo = (angulo: number, r: number) => ({
  x: CENTRO + r * Math.sin(angulo),
  y: CENTRO - r * Math.cos(angulo)
});

/** Ângulo (radianos) correspondente a uma duração na roda. */
export const anguloDe = (minutos: number) => (Math.min(minutos, ESCALA_RODA) / ESCALA_RODA) * 2 * Math.PI;

/** Os tracinhos à volta da roda (de 5 em 5 min; os de 30 em 30 são maiores e têm número). */
export const TRACOS = Array.from({ length: ESCALA_RODA / PASSO_RODA }, (_, i) => {
  const minutos = i * PASSO_RODA;
  const maior = minutos % 30 === 0;
  const ang = anguloDe(minutos);
  return {
    minutos,
    maior,
    de: pontoNoAngulo(ang, 124),
    ate: pontoNoAngulo(ang, maior ? 132 : 129),
    rotulo: maior && minutos ? pontoNoAngulo(ang, 143) : null
  };
});

/**
 * Converte a posição do rato em minutos (de 5 em 5) e na distância ao centro.
 * `caixa` é o retângulo do SVG no ecrã (getBoundingClientRect).
 */
export function minutosNoPonto(clienteX: number, clienteY: number, caixa: DOMRect) {
  const x = ((clienteX - caixa.left) / caixa.width) * 300 - CENTRO;
  const y = ((clienteY - caixa.top) / caixa.height) * 300 - CENTRO;
  let ang = Math.atan2(x, -y);
  if (ang < 0) ang += 2 * Math.PI;
  const minutos = Math.round(((ang / (2 * Math.PI)) * ESCALA_RODA) / PASSO_RODA) * PASSO_RODA;
  return { minutos, distancia: Math.hypot(x, y) };
}

/**
 * Ao arrastar, não deixa saltar de 120 para 0 (ou de 0 para 120) quando se passa pelo topo:
 * se o valor anterior estava perto de um extremo, fica preso nesse extremo.
 */
export function semSaltoNoTopo(anterior: number, novo: number) {
  if (anterior >= ESCALA_RODA - 30 && novo <= 30) return ESCALA_RODA;
  if (anterior <= 30 && novo >= ESCALA_RODA - 30) return 0;
  return novo;
}

/** O que a roda mostra num dado instante. */
export interface Mostrador {
  /** Texto pequeno por cima: «Duração», «Faltam», «Tempo extra», «A decorrer». */
  rotulo: string;
  /** Os números grandes. */
  grande: string;
  /** Texto por baixo dos números. */
  sub: string;
  /** Já passou do tempo escolhido? */
  excedido: boolean;
  /** Fração (0–1) do arco claro: a duração escolhida. */
  arcoAlvo: number;
  /** Fração (0–1) do arco forte: o tempo já decorrido. */
  arcoDecorrido: number;
}

/**
 * Calcula o mostrador da roda.
 * `corrida`: o bloco a correr (se for da atividade mostrada) · `alvo`: duração em minutos (0 = sem limite).
 */
export function calcularMostrador(corrida: EmCurso | null, alvo: number, agora: number): Mostrador {
  const fracAlvo = alvo / ESCALA_RODA;
  if (!corrida)
    return {
      rotulo: 'Duração',
      grande: alvo ? minutosSegundos(alvo) : '∞',
      sub: alvo ? 'arrasta ou clica no tempo' : 'sem limite de tempo',
      excedido: false,
      arcoAlvo: fracAlvo,
      arcoDecorrido: 0
    };

  const decorrido = agora - corrida.start;
  if (!alvo)
    // sem limite: o arco dá a volta de 120 em 120 minutos
    return {
      rotulo: 'A decorrer',
      grande: relogio(decorrido),
      sub: 'sem limite de tempo',
      excedido: false,
      arcoAlvo: 0,
      arcoDecorrido: (decorrido % (ESCALA_RODA * MIN)) / (ESCALA_RODA * MIN)
    };

  const excedido = decorrido >= alvo * MIN;
  return excedido
    ? {
        rotulo: 'Tempo extra',
        grande: '+' + relogio(decorrido - alvo * MIN),
        sub: `de ${duracaoPorExtenso(alvo)} · total ${relogio(decorrido)}`,
        excedido,
        arcoAlvo: fracAlvo,
        arcoDecorrido: fracAlvo
      }
    : {
        rotulo: 'Faltam',
        grande: relogio(alvo * MIN - decorrido),
        sub: `${relogio(decorrido)} de ${duracaoPorExtenso(alvo)}`,
        excedido,
        arcoAlvo: fracAlvo,
        arcoDecorrido: decorrido / MIN / ESCALA_RODA
      };
}
