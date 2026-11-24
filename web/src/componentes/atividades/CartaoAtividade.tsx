/*
 * Um cartão de atividade (modo normal): nome, tecla de atalho, tempo feito hoje e barra da meta.
 *
 * - Clique: escolhe a atividade (aparece na roda).
 * - Duplo clique: começa-a (ou para-a, se já estiver a correr).
 * - Arrastar: leva a atividade para a coluna Plano da linha do tempo.
 */
import type { CSSProperties, DragEvent } from 'react';
import { useAgora } from '../../estado/useAgora';
import { useLoja } from '../../estado/loja';
import { corDe, totalNoDia } from '../../lib/consultas';
import { MIN, curto, hoje } from '../../lib/tempo';
import type { Atividade } from '../../tipos';

/** Tipo de dados usado ao arrastar uma atividade (a linha do tempo vai ler isto). */
export const TIPO_ARRASTO_ATIVIDADE = 'application/x-cronometro-atividade';

interface Props {
  atividade: Atividade;
  /** Posição na lista (as 9 primeiras têm atalho de teclado 1–9). */
  indice: number;
  escolhida: boolean;
}

export function CartaoAtividade({ atividade: a, indice, escolhida }: Props) {
  const agora = useAgora();
  const dados = useLoja(s => s.dados);
  const escolher = useLoja(s => s.escolher);
  const comecar = useLoja(s => s.comecar);

  const aCorrer = dados.run?.id === a.id;
  const feito = totalNoDia(dados, a.id, hoje(), agora);
  const progresso = a.goal ? Math.min(100, (feito / (a.goal * MIN)) * 100) : 0;

  function aoArrastar(e: DragEvent) {
    e.dataTransfer.setData(TIPO_ARRASTO_ATIVIDADE, String(a.id));
    e.dataTransfer.setData('text/plain', a.name);
    e.dataTransfer.effectAllowed = 'copy';
  }

  return (
    <button
      type="button"
      draggable
      onDragStart={aoArrastar}
      onClick={() => escolher(a.id)}
      onDoubleClick={e => {
        e.preventDefault();
        comecar(a.id);
      }}
      title={
        (aCorrer ? 'A correr · duplo clique para parar' : 'Clica para escolher · duplo clique para começar') +
        '\nArrasta para a coluna Plano da linha do tempo para planear'
      }
      style={{ '--c': corDe(a) } as CSSProperties}
      className={`relative flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-[14px] border px-3 pt-2.5 pb-3 text-left transition select-none hover:-translate-y-px ${
        aCorrer ? 'bg-[color-mix(in_srgb,var(--c)_14%,var(--surface))]' : 'bg-surface2'
      } ${
        aCorrer || escolhida
          ? 'border-[var(--c)]'
          : 'border-line hover:border-[color-mix(in_srgb,var(--c)_55%,var(--line))]'
      } ${escolhida ? 'shadow-[inset_0_0_0_1px_var(--c)]' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-[7px]">
        <span
          className={`size-2.5 flex-none rounded-full bg-[var(--c)] ${
            aCorrer ? 'animate-brilho shadow-[0_0_0_4px_color-mix(in_srgb,var(--c)_30%,transparent)]' : ''
          }`}
        />
        <span className="flex-1 truncate font-semibold">{a.name}</span>
        {indice < 9 && (
          <kbd className="rounded-[5px] border border-b-2 border-line bg-surface px-[5px] py-0.5 text-[11px] leading-none text-mute">
            {indice + 1}
          </kbd>
        )}
      </div>
      <div className="font-num text-[12.5px] text-mute tabular-nums">
        {curto(feito)}
        {a.goal ? ` / ${a.goal} min` : ' hoje'}
      </div>
      <div className="h-1 overflow-hidden rounded-sm bg-[color-mix(in_srgb,var(--c)_16%,transparent)]">
        <i
          className="block h-full bg-[var(--c)] transition-[width] duration-500"
          style={{ width: `${progresso}%` }}
        />
      </div>
    </button>
  );
}
