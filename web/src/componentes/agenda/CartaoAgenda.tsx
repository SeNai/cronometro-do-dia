/*
 * Cartão «Agenda de hoje»: o compromisso a decorrer, os próximos 4, o tempo livre até ao
 * próximo, os eventos de dia inteiro e os erros dos calendários.
 */
import { avisar } from '../../estado/avisos';
import { useAgora } from '../../estado/useAgora';
import { useLoja } from '../../estado/loja';
import { ocupa } from '../../lib/consultas';
import { curto, hoje, horaMinuto } from '../../lib/tempo';
import { Botao } from '../ui/Botao';
import { Cartao } from '../ui/Cartao';
import type { ReactNode } from 'react';

/** Uma linha da agenda: hora à esquerda, texto à direita. */
function Linha({ hora, agora = false, children }: { hora: string; agora?: boolean; children: ReactNode }) {
  return (
    <div
      className={`flex items-baseline gap-2.5 border-b border-dashed border-line py-[7px] last:border-b-0 ${
        agora ? 'text-warn' : ''
      }`}
    >
      <span className="min-w-11 font-num font-semibold tabular-nums">{hora}</span>
      <span>{children}</span>
    </div>
  );
}

/** Caixa verde com o tempo livre. */
function Livre({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2.5 rounded-xl bg-[color-mix(in_srgb,var(--accent)_11%,transparent)] px-3 py-2.5 text-[color-mix(in_srgb,var(--accent)_70%,var(--ink))]">
      {children}
    </div>
  );
}

export function CartaoAgenda() {
  const agora = useAgora();
  const dia = hoje();
  const resposta = useLoja(s => s.eventos[dia]);
  const temCalendarios = useLoja(s => s.config.calendarios.length > 0);
  const carregarEventos = useLoja(s => s.carregarEventos);

  function atualizar() {
    carregarEventos(dia, true);
    avisar('A atualizar o calendário…');
  }

  let conteudo: ReactNode;
  if (!resposta) conteudo = <span className="text-mute">A ler o calendário…</span>;
  else {
    const ev = resposta.eventos;
    const aDecorrer = ev.filter(e => ocupa(e) && e.inicio <= agora && e.fim > agora);
    const proximos = ev.filter(e => ocupa(e) && e.inicio > agora);
    const diaTodo = ev.filter(e => e.diaTodo);
    conteudo = (
      <>
        {aDecorrer.map(e => (
          <Linha key={'a' + e.inicio + e.titulo} hora="Agora" agora>
            <b>{e.titulo}</b> até às {horaMinuto(e.fim)}
          </Linha>
        ))}
        {proximos.slice(0, 4).map(e => (
          <Linha key={'p' + e.inicio + e.titulo} hora={horaMinuto(e.inicio)}>
            {e.titulo} <span className="text-mute">· daqui a {curto(e.inicio - agora)}</span>
          </Linha>
        ))}
        {!aDecorrer.length &&
          (proximos.length ? (
            <Livre>
              Tens <b>{curto(proximos[0].inicio - agora)}</b> livres até ao próximo compromisso.
            </Livre>
          ) : (
            <Livre>Nada mais marcado hoje. O resto do dia é teu.</Livre>
          ))}
        {diaTodo.length > 0 && (
          <div className="mt-2 text-mute">Dia todo: {diaTodo.map(e => e.titulo).join(', ')}</div>
        )}
        {!temCalendarios && !ev.length && (
          <div className="mt-2 text-mute">Ainda não ligaste nenhum calendário (em ⚙ Definições).</div>
        )}
        {resposta.erros.map(erro => (
          <div key={erro} className="mt-2 text-warn">
            ⚠ {erro}
          </div>
        ))}
      </>
    );
  }

  return (
    <Cartao
      titulo="Agenda de hoje"
      acoes={
        <Botao variante="fantasma" pequeno title="Voltar a ler o calendário" onClick={atualizar}>
          ↻ Atualizar
        </Botao>
      }
    >
      <div className="text-[13px]">{conteudo}</div>
    </Cartao>
  );
}
