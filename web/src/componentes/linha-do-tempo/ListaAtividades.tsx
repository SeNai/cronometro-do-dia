/*
 * Lista de atividades dentro dos menus do plano, com quanto falta de cada meta nesse dia.
 * Cada botão tem data-atividade, para as teclas 1–9 funcionarem (ver MenuFlutuante).
 */
import type { CSSProperties } from 'react';
import { useLoja } from '../../estado/loja';
import { corDe } from '../../lib/consultas';
import { faltaDaMeta } from '../../lib/plano';
import { MIN, curto } from '../../lib/tempo';
import type { Dia } from '../../tipos';

interface Props {
  dia: Dia;
  /** Atividade atual (fica destacada). */
  atualId?: number;
  /** Bloco a não contar nas metas (ao trocar a atividade de um bloco, ele próprio não conta). */
  excetoUid?: string;
  /** Que botão recebe o foco ao abrir: a primeira atividade, a atual, ou nenhum. */
  focar?: 'primeira' | 'atual' | 'nenhuma';
  aoEscolher: (id: number) => void;
  /** Ao passar o rato ou focar uma atividade (para mostrar a pré-visualização). */
  aoPassar?: (id: number) => void;
}

export function ListaAtividades({
  dia,
  atualId,
  excetoUid,
  focar = 'primeira',
  aoEscolher,
  aoPassar
}: Props) {
  const dados = useLoja(s => s.dados);
  if (!dados.acts.length)
    return (
      <div className="p-1.5 text-[13px] text-mute">Ainda não tens atividades. Cria uma em ✎ Editar.</div>
    );

  return dados.acts.map((a, i) => {
    const falta = faltaDaMeta(dados, a, dia, excetoUid);
    return (
      <button
        key={a.id}
        type="button"
        data-atividade={a.id}
        autoFocus={focar === 'primeira' ? i === 0 : focar === 'atual' && a.id === atualId}
        onClick={() => aoEscolher(a.id)}
        onMouseEnter={() => aoPassar?.(a.id)}
        onFocus={() => aoPassar?.(a.id)}
        style={{ '--c': corDe(a) } as CSSProperties}
        className={`flex w-full cursor-pointer items-center gap-[9px] rounded-[9px] border px-[9px] py-[7px] text-left text-sm outline-none hover:border-line hover:bg-surface2 focus-visible:border-line focus-visible:bg-surface2 ${
          a.id === atualId
            ? 'border-[var(--c)] bg-[color-mix(in_srgb,var(--c)_8%,transparent)]'
            : 'border-transparent'
        }`}
      >
        <span className="size-2.5 flex-none rounded-full bg-[var(--c)]" />
        <span className="min-w-0 flex-1 truncate">{a.name}</span>
        {falta != null && (
          <small className="text-[11.5px] text-faint">
            {falta > 0 ? 'faltam ' + curto(falta * MIN) : '✓'}
          </small>
        )}
        {i < 9 && (
          <kbd className="rounded-[5px] border border-b-2 border-line px-1 text-[10px] text-mute">
            {i + 1}
          </kbd>
        )}
      </button>
    );
  });
}
