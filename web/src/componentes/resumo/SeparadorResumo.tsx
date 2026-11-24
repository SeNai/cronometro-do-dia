/*
 * Separador «Resumo»: o dia escolhido no topo (tempo por atividade, percentagem e metas)
 * e os últimos 7 dias em barras empilhadas.
 */
import type { CSSProperties } from 'react';
import { useAgora } from '../../estado/useAgora';
import { useLoja } from '../../estado/loja';
import { corDe } from '../../lib/consultas';
import { totaisDoDia, ultimos7Dias, type TotalAtividade } from '../../lib/resumo';
import { MIN, curto, hoje, rotuloDoDia } from '../../lib/tempo';
import { Cartao } from '../ui/Cartao';

/** Uma barra horizontal dividida pelas atividades (cada uma com a sua cor). */
function BarraEmpilhada({
  partes,
  total,
  className = ''
}: {
  partes: TotalAtividade[];
  total: number;
  className?: string;
}) {
  return (
    <div className={`flex gap-0.5 overflow-hidden rounded-md bg-surface2 ${className}`}>
      {total > 0 &&
        partes
          .filter(p => p.feito)
          .map(p => (
            <i
              key={p.atividade.id}
              title={`${p.atividade.name}: ${curto(p.feito)}`}
              className="block h-full"
              style={{ width: `${(p.feito / total) * 100}%`, background: corDe(p.atividade) }}
            />
          ))}
    </div>
  );
}

function ResumoDoDia() {
  const agora = useAgora();
  const dados = useLoja(s => s.dados);
  const dia = useLoja(s => s.dia);
  const { porAtividade, total } = totaisDoDia(dados, dia, agora);

  return (
    <Cartao titulo={`Resumo · ${rotuloDoDia(dia)}`}>
      <BarraEmpilhada partes={porAtividade} total={total} className="mb-3.5 h-3" />
      {porAtividade.map(({ atividade: a, feito }) => (
        <div
          key={a.id}
          style={{ '--c': corDe(a) } as CSSProperties}
          className="grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-0.5 border-b border-line py-[7px] last:border-b-0"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="size-2.5 flex-none rounded-full bg-[var(--c)]" />
            {a.name}
          </span>
          <span className="text-right font-num tabular-nums">
            {curto(feito)}
            {a.goal > 0 && <span className="text-mute"> / {a.goal} min</span>}{' '}
            <span className="text-[13px] text-mute">· {total ? Math.round((feito / total) * 100) : 0}%</span>
          </span>
          {a.goal > 0 && (
            <div className="col-span-full h-1 overflow-hidden rounded-sm bg-surface2">
              <i
                className="block h-full bg-[var(--c)]"
                style={{ width: `${Math.min(100, (feito / (a.goal * MIN)) * 100)}%` }}
              />
            </div>
          )}
        </div>
      ))}
      <div className="flex justify-between pt-2.5 font-[650]">
        <span>Total</span>
        <span className="font-num tabular-nums">{curto(total)}</span>
      </div>
    </Cartao>
  );
}

function UltimosSeteDias() {
  const agora = useAgora();
  const dados = useLoja(s => s.dados);
  const dias = ultimos7Dias(dados, agora);
  const maximo = Math.max(1, ...dias.map(d => d.total));

  return (
    <Cartao titulo="Últimos 7 dias">
      {dias.map(d => (
        <div key={d.dia} className="my-[7px] grid grid-cols-[40px_1fr_64px] items-center gap-2.5 text-[13px]">
          <span className={d.dia === hoje() ? 'font-[650] text-ink' : 'text-mute'}>{d.nome}</span>
          <div>
            <div style={{ width: `${Math.max(2, (d.total / maximo) * 100)}%` }}>
              <BarraEmpilhada partes={d.porAtividade} total={d.total} className="h-3.5" />
            </div>
          </div>
          <span className="text-right font-num tabular-nums">{curto(d.total)}</span>
        </div>
      ))}
      <div className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[12.5px] text-mute">
        {dados.acts.map((a, j) => (
          <span key={a.id} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: corDe(a) }} />
            {a.name}:{' '}
            <b className="font-num tabular-nums">
              {curto(dias.reduce((s, d) => s + d.porAtividade[j].feito, 0))}
            </b>
          </span>
        ))}
      </div>
    </Cartao>
  );
}

export function SeparadorResumo() {
  return (
    <div className="grid items-start gap-[18px] lg:grid-cols-2">
      <ResumoDoDia />
      <UltimosSeteDias />
    </div>
  );
}
