/*
 * Barra do topo (fica fixa ao fazer scroll): nome da app, escolha do dia (‹ Hoje ›),
 * o chip do Google, e os botões dos avisos, do som e das Definições.
 */
import { irPara } from '../../estado/acoesPlano';
import { useLoja } from '../../estado/loja';
import { hoje, rotuloDoDia, somarDias } from '../../lib/tempo';
import { Botao } from '../ui/Botao';
import { BotaoNotificacoes } from './BotaoNotificacoes';
import { BotaoSom } from './BotaoSom';
import { ChipGoogle } from './ChipGoogle';

/** O ícone da app (o mesmo do atalho). */
function Logotipo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="size-[30px] flex-none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#35a083" />
          <stop offset="1" stopColor="#1e5c4c" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#lg)" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="6" />
      <path d="M32 14a18 18 0 1 1-18 18" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <circle cx="14" cy="32" r="5" fill="#fff" />
    </svg>
  );
}

/** ‹ Hoje, segunda-feira, 24 nov › [Hoje] */
function EscolherDia() {
  const dia = useLoja(s => s.dia);
  const botao = 'cursor-pointer rounded-[9px] px-2.5 py-1.5 text-mute hover:bg-surface2 hover:text-ink';
  return (
    <div className="flex items-center rounded-xl border border-line bg-surface p-[3px] shadow-cartao">
      <button type="button" title="Dia anterior" className={botao} onClick={() => irPara(somarDias(dia, -1))}>
        ‹
      </button>
      <b className="min-w-[170px] px-1 text-center text-[13.5px] font-semibold">{rotuloDoDia(dia)}</b>
      <button type="button" title="Dia seguinte" className={botao} onClick={() => irPara(somarDias(dia, 1))}>
        ›
      </button>
      <button type="button" className={botao} onClick={() => irPara(hoje())}>
        Hoje
      </button>
    </div>
  );
}

export function Topo() {
  return (
    <header className="sticky top-0 z-[5] border-b border-[color-mix(in_srgb,var(--line)_60%,transparent)] bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3.5 px-5 py-3">
        <div className="flex min-w-[180px] flex-1 items-center gap-2.5 text-[17px] font-[650]">
          <Logotipo />
          Cronómetro do Dia
        </div>
        <EscolherDia />
        <ChipGoogle />
        <BotaoNotificacoes />
        <BotaoSom />
        <Botao onClick={() => useLoja.setState({ definicoesAbertas: true })}>⚙ Definições</Botao>
      </div>
    </header>
  );
}
