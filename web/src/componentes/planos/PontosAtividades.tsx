/*
 * Pontinhos com as cores das atividades de uma lista de blocos (até 6), para reconhecer um plano de relance.
 */
import { useLoja } from '../../estado/loja';
import { atividadePorId, corDe } from '../../lib/consultas';
import type { BlocoModelo } from '../../tipos';

export function PontosAtividades({ blocos }: { blocos: BlocoModelo[] }) {
  const dados = useLoja(s => s.dados);
  const ids = [...new Set(blocos.map(b => b.id))].filter(id => atividadePorId(dados, id)).slice(0, 6);
  return (
    <span className="flex gap-0.5">
      {ids.map(id => (
        <span
          key={id}
          className="size-2 rounded-full"
          style={{ background: corDe(atividadePorId(dados, id)) }}
        />
      ))}
    </span>
  );
}
