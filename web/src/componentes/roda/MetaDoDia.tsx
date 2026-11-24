/*
 * Linha da meta por baixo da roda: «Hoje: 35 min de 90 min · faltam 55 min» e uma barra de progresso.
 */
import { useAgora } from '../../estado/useAgora';
import { useLoja } from '../../estado/loja';
import { atividadeNaRoda, totalNoDia } from '../../lib/consultas';
import { MIN, curto, hoje } from '../../lib/tempo';

export function MetaDoDia() {
  const agora = useAgora();
  const dados = useLoja(s => s.dados);
  const a = atividadeNaRoda(dados);
  if (!a) return null;

  const feito = totalNoDia(dados, a.id, hoje(), agora);
  const meta = a.goal * MIN;
  const progresso = meta ? feito / meta : 0;
  const cumprida = meta > 0 && progresso >= 1;

  const texto = !meta
    ? `Hoje: ${curto(feito)} · sem meta`
    : cumprida
      ? `Meta de hoje cumprida ✓ (${curto(feito)})`
      : `Hoje: ${curto(feito)} de ${a.goal} min · faltam ${curto(meta - feito)}`;

  return (
    <div className="mx-auto mt-3.5 max-w-[300px]">
      <div className="text-[13px] text-mute">{texto}</div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface2">
        <i
          className="block h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.min(100, progresso * 100)}%`,
            background: cumprida ? 'var(--accent)' : 'var(--c)'
          }}
        />
      </div>
    </div>
  );
}
