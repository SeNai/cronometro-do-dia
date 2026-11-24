/*
 * Cartão base: a caixa branca (ou escura) com título em maiúsculas e botões à direita.
 *
 *   <Cartao titulo="Agenda de hoje" acoes={<Botao …>↻ Atualizar</Botao>}>
 *     …conteúdo…
 *   </Cartao>
 */
import type { ReactNode } from 'react';

interface Props {
  titulo: ReactNode;
  /** Botões no canto direito do título. */
  acoes?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Cartao({ titulo, acoes, children, className = '' }: Props) {
  return (
    <section
      className={`min-w-0 rounded-cartao border border-line bg-surface p-4.5 shadow-cartao ${className}`}
    >
      <h2 className="mb-3.5 flex flex-wrap items-center gap-2 text-[13px] font-[650] tracking-[0.04em] text-mute uppercase">
        {titulo}
        <span className="flex-1" />
        {/* os botões do título não ficam em maiúsculas */}
        <span className="flex gap-2 font-medium tracking-normal text-ink normal-case">{acoes}</span>
      </h2>
      {children}
    </section>
  );
}
