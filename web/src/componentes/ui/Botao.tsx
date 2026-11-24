/*
 * Botão base da app, com as variantes usadas em todo o lado.
 *
 *   <Botao>Normal</Botao>
 *   <Botao variante="principal">▶ Começar</Botao>
 *   <Botao variante="parar">■ Parar</Botao>      (usa a cor --c do componente à volta)
 *   <Botao variante="fantasma" pequeno>✎ Editar</Botao>
 */
import type { ButtonHTMLAttributes } from 'react';

type Variante = 'normal' | 'principal' | 'parar' | 'fantasma';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  pequeno?: boolean;
}

const ESTILOS: Record<Variante, string> = {
  normal: 'border-line bg-surface shadow-cartao hover:border-faint',
  principal: 'border-accent bg-accent font-semibold text-white shadow-cartao hover:brightness-105',
  parar:
    'font-semibold shadow-cartao border-[color-mix(in_srgb,var(--c)_60%,var(--line))] bg-[color-mix(in_srgb,var(--c)_14%,var(--surface))]',
  fantasma: 'border-line bg-transparent hover:border-faint'
};

export function Botao({ variante = 'normal', pequeno = false, className = '', ...resto }: Props) {
  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 border transition-colors ${
        pequeno ? 'rounded-[9px] px-2.5 py-1 text-[13px]' : 'rounded-[11px] px-3.5 py-2'
      } ${ESTILOS[variante]} ${className}`}
      {...resto}
    />
  );
}
