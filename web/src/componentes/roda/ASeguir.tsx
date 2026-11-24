/*
 * Linhas por baixo da roda: o próximo compromisso do calendário e o próximo bloco do plano de hoje.
 */
import { useAgora } from '../../estado/useAgora';
import { useLoja } from '../../estado/loja';
import { atividadePorId, proximoCompromisso } from '../../lib/consultas';
import { curto, hoje, horaMinuto } from '../../lib/tempo';

export function ASeguir() {
  const agora = useAgora();
  const dados = useLoja(s => s.dados);
  // Atenção: o seletor tem de devolver sempre o mesmo valor enquanto nada muda.
  // `s.eventos[hoje()]?.eventos ?? []` criaria um [] novo a cada chamada, e o React entrava
  // num ciclo infinito de desenhos. Por isso lê-se a resposta e o «?? []» fica cá fora.
  const resposta = useLoja(s => s.eventos[hoje()]);
  const eventos = resposta?.eventos ?? [];

  const compromisso = proximoCompromisso(eventos, agora);
  const bloco = (dados.plans[hoje()] ?? []).find(p => p.start > agora && atividadePorId(dados, p.id));
  if (!compromisso && !bloco) return null;

  return (
    <div className="mt-3 grid gap-0.5 text-[13px] text-mute">
      {compromisso && (
        <div>
          📅 {compromisso.titulo} às {horaMinuto(compromisso.inicio)}{' '}
          <span>(daqui a {curto(compromisso.inicio - agora)})</span>
        </div>
      )}
      {bloco && (
        <div>
          ✨ A seguir no plano: {atividadePorId(dados, bloco.id)?.name} às {horaMinuto(bloco.start)}
        </div>
      )}
    </div>
  );
}
