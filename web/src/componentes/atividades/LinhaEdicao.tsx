/*
 * Uma atividade no modo de edição: cor · nome · meta diária · remover.
 */
import type { CSSProperties } from 'react';
import { confirmar } from '../../estado/avisos';
import { useLoja } from '../../estado/loja';
import { corDe } from '../../lib/consultas';
import type { Atividade } from '../../tipos';
import { SeletorMeta } from './SeletorMeta';

/** As colunas da grelha (iguais no cabeçalho e em cada linha). */
export const COLUNAS_EDICAO = 'grid-cols-[22px_minmax(0,1fr)_126px_24px]';

export function LinhaEdicao({ atividade: a }: { atividade: Atividade }) {
  const alterar = useLoja(s => s.alterarAtividade);
  const remover = useLoja(s => s.removerAtividade);
  /** Grava o nome (se ficar vazio, volta ao anterior). */
  function gravarNome(campo: HTMLInputElement) {
    const limpo = campo.value.replace(/\s+/g, ' ').trim();
    if (limpo && limpo !== a.name) alterar(a.id, { name: limpo });
    else campo.value = a.name;
  }

  async function pedirRemover() {
    if (await confirmar(`Remover «${a.name}»? Os blocos já registados ficam como «(removida)».`))
      remover(a.id);
  }

  return (
    <div
      style={{ '--c': corDe(a) } as CSSProperties}
      className={`grid ${COLUNAS_EDICAO} items-center gap-2 rounded-[14px] border border-line bg-surface2 py-2 pr-2 pl-3`}
    >
      <input
        type="color"
        title="Cor"
        value={corDe(a)}
        onChange={e => alterar(a.id, { color: e.target.value })}
        className="size-[22px] cursor-pointer border-none bg-transparent p-0"
      />
      <input
        // campo «não controlado»: o browser guarda o texto enquanto escreves; o key recria-o
        // se o nome mudar noutro sítio (ex.: por baixo da roda)
        key={a.name}
        defaultValue={a.name}
        aria-label="Nome"
        maxLength={40}
        onBlur={e => gravarNome(e.currentTarget)}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        className="h-9 min-w-0 rounded-lg border border-line bg-surface px-2.5 font-semibold"
      />
      <SeletorMeta valor={a.goal || 0} aoMudar={goal => alterar(a.id, { goal })} />
      <button
        type="button"
        title="Remover"
        onClick={pedirRemover}
        className="cursor-pointer rounded-md px-1.5 py-0.5 text-faint hover:bg-surface hover:text-warn"
      >
        ✕
      </button>
    </div>
  );
}
