/*
 * Barra lateral com os separadores: Hoje, Planos, Resumo e Registo.
 * Em ecrãs estreitos (telemóvel) passa a ser uma barra no fundo do ecrã.
 */
import type { ReactNode } from 'react';
import { mudarVista } from '../../estado/acoesPlanos';
import { useLoja, type Vista } from '../../estado/loja';

/** Os ícones são SVG simples, desenhados com traços. */
const icone = (caminhos: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-[22px]"
  >
    {caminhos}
  </svg>
);

const SEPARADORES: { vista: Vista; nome: string; titulo: string; icone: ReactNode }[] = [
  {
    vista: 'hoje',
    nome: 'Hoje',
    titulo: 'Hoje',
    icone: icone(
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5M9.5 2.5h5" />
      </>
    )
  },
  {
    vista: 'planos',
    nome: 'Planos',
    titulo: 'Planos do dia e semanas',
    icone: icone(
      <>
        <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
        <path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h3M7.5 17h6" />
      </>
    )
  },
  {
    vista: 'stats',
    nome: 'Resumo',
    titulo: 'Resumo e últimos 7 dias',
    icone: icone(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />)
  },
  {
    vista: 'log',
    nome: 'Registo',
    titulo: 'Registo de blocos',
    icone: icone(
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <circle cx="4.5" cy="6" r="1.2" />
        <circle cx="4.5" cy="12" r="1.2" />
        <circle cx="4.5" cy="18" r="1.2" />
      </>
    )
  }
];

export function BarraLateral() {
  const vista = useLoja(s => s.vista);
  return (
    <nav
      aria-label="Secções"
      className="fixed inset-x-0 bottom-0 z-[6] flex justify-around gap-1.5 border-t border-line bg-bg px-2 py-1.5 sm:sticky sm:top-[61px] sm:h-[calc(100vh-61px)] sm:flex-col sm:justify-start sm:border-t-0 sm:border-r sm:border-[color-mix(in_srgb,var(--line)_60%,transparent)] sm:bg-transparent sm:px-[9px] sm:py-4"
    >
      {SEPARADORES.map(s => {
        const ativo = s.vista === vista;
        return (
          <button
            key={s.vista}
            type="button"
            title={s.titulo}
            aria-current={ativo ? 'page' : undefined}
            onClick={() => {
              mudarVista(s.vista);
              window.scrollTo(0, 0);
            }}
            className={`relative flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-xl px-0.5 pt-2.5 pb-2 text-[11.5px] transition-colors sm:flex-none ${
              ativo
                ? 'bg-surface text-ink shadow-cartao before:absolute before:inset-x-[30%] before:-top-1.5 before:h-[3px] before:rounded-b before:bg-accent sm:before:inset-x-auto sm:before:top-3.5 sm:before:bottom-3.5 sm:before:-left-[9px] sm:before:h-auto sm:before:w-[3px] sm:before:rounded-r sm:before:rounded-b-none'
                : 'text-mute hover:bg-surface hover:text-ink'
            }`}
          >
            {s.icone}
            {s.nome}
          </button>
        );
      })}
    </nav>
  );
}
