/*
 * Linhas por baixo da roda com o que vem a seguir no plano de hoje.
 * (O próximo compromisso do calendário entra aqui quando a agenda for passada para React.)
 */
import { useAgora } from '../../estado/useAgora';
import { useLoja } from '../../estado/loja';
import { atividadePorId } from '../../lib/consultas';
import { hoje, horaMinuto } from '../../lib/tempo';

export function ASeguir() {
  const agora = useAgora();
  const dados = useLoja(s => s.dados);

  const proximo = (dados.plans[hoje()] ?? []).find(p => p.start > agora && atividadePorId(dados, p.id));
  if (!proximo) return null;

  return (
    <div className="mt-3 grid gap-0.5 text-[13px] text-mute">
      <div>
        ✨ A seguir no plano: {atividadePorId(dados, proximo.id)?.name} às {horaMinuto(proximo.start)}
      </div>
    </div>
  );
}
