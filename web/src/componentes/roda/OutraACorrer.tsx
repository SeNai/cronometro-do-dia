/*
 * Aviso por cima da roda quando está a correr uma atividade diferente da que estás a ver:
 * «● A correr: Estudo 12:04». Ao clicar, a roda volta a essa atividade.
 */
import type { CSSProperties } from 'react';
import { useAgora } from '../../estado/useAgora';
import { useLoja } from '../../estado/loja';
import { atividadePorId, corDe, corridaNaRoda } from '../../lib/consultas';
import { relogio } from '../../lib/tempo';

export function OutraACorrer() {
  const agora = useAgora();
  const dados = useLoja(s => s.dados);
  const escolher = useLoja(s => s.escolher);

  const run = dados.run;
  if (!run || corridaNaRoda(dados)) return null; // nada a correr, ou é a que já está na roda
  const a = atividadePorId(dados, run.id);

  return (
    <button
      type="button"
      title="Clica para voltar a esta atividade"
      onClick={() => escolher(run.id)}
      style={{ '--rc': corDe(a) } as CSSProperties}
      className="relative z-10 mx-auto -mt-1.5 mb-1 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--rc)_50%,var(--line))] bg-[color-mix(in_srgb,var(--rc)_12%,var(--surface))] px-3 py-1 text-[12.5px]"
    >
      <span className="size-2.5 animate-brilho rounded-full bg-[var(--rc)]" />A correr:{' '}
      <b>{a?.name ?? '?'}</b> <span className="font-num tabular-nums">{relogio(agora - run.start)}</span>
    </button>
  );
}
