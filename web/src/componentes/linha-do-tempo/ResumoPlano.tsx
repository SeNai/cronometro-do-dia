/*
 * Chips por cima da linha do tempo: para cada meta, quanto já está feito + planeado nesse dia.
 * Ex.: «● Estudo 1h 15/90» e um ✓ quando a meta fica coberta.
 */
import type { CSSProperties } from 'react';
import { useAgora } from '../../estado/useAgora';
import { useLoja } from '../../estado/loja';
import { corDe, totalNoDia } from '../../lib/consultas';
import { blocosDoDia, minutosPlaneados, podePlanear } from '../../lib/plano';
import { MIN, curto, hoje } from '../../lib/tempo';

const Dica = ({ children }: { children: string }) => <span className="py-[3px] text-faint">{children}</span>;

export function ResumoPlano() {
  const agora = useAgora();
  const dados = useLoja(s => s.dados);
  const dia = useLoja(s => s.dia);
  const temBlocos = blocosDoDia(dados, dia).length > 0;
  const eHoje = dia === hoje();

  let conteudo;
  if (!podePlanear(dia)) conteudo = temBlocos ? <Dica>Plano que tinhas para este dia.</Dica> : null;
  else {
    const chips = dados.acts.map(a => {
      const planeado = Math.round(minutosPlaneados(dados, a.id, dia, undefined, agora));
      const feito = eHoje ? Math.round(totalNoDia(dados, a.id, dia, agora) / MIN) : 0;
      if (!a.goal && !planeado) return null;
      const total = planeado + feito;
      const cumprida = a.goal > 0 && total >= a.goal;
      return (
        <span
          key={a.id}
          style={{ '--c': corDe(a) } as CSSProperties}
          title={`${a.name}: ${eHoje ? `${feito} min feitos + ` : ''}${planeado} min planeados${a.goal ? ` · meta ${a.goal} min` : ''}`}
          className={`inline-flex items-center gap-1.5 rounded-full border bg-surface2 px-[9px] py-[3px] text-mute ${
            cumprida ? 'border-[color-mix(in_srgb,var(--c)_55%,transparent)]' : 'border-line'
          }`}
        >
          <span className="size-2 rounded-full bg-[var(--c)]" />
          {a.name} <b className="font-num font-semibold text-ink tabular-nums">{curto(total * MIN)}</b>
          {a.goal ? `/${a.goal}` : ''}
          {cumprida && ' ✓'}
        </span>
      );
    });
    conteudo = (
      <>
        {chips}
        {!temBlocos && <Dica>Arrasta uma atividade para a coluna Plano, ou clica lá para escolher.</Dica>}
      </>
    );
  }

  if (!conteudo) return null;
  return <div className="-mt-1 mb-2.5 flex flex-wrap gap-1.5 text-xs">{conteudo}</div>;
}
