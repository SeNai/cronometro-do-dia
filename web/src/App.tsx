/*
 * Componente principal: carrega os dados no arranque, liga os relógios e monta o ecrã.
 *
 * Por agora: botões do topo, a roda, as atividades e a agenda. A linha do tempo,
 * o topo completo, os separadores e as Definições vêm nos próximos passos.
 */
import { useEffect } from 'react';
import { CartaoAgenda } from './componentes/agenda/CartaoAgenda';
import { CartaoAtividades } from './componentes/atividades/CartaoAtividades';
import { CartaoRoda } from './componentes/roda/CartaoRoda';
import { BotaoNotificacoes } from './componentes/topo/BotaoNotificacoes';
import { BotaoSom } from './componentes/topo/BotaoSom';
import { Avisos, Confirmacao } from './componentes/ui/Avisos';
import { useLoja } from './estado/loja';
import { useAlertas } from './estado/useAlertas';
import { useCalendarios } from './estado/useCalendarios';
import { useTituloDaJanela } from './estado/useTituloDaJanela';

export default function App() {
  const carregar = useLoja(s => s.carregar);
  const carregado = useLoja(s => s.carregado);
  const erro = useLoja(s => s.erro);

  // corre uma vez, quando a app aparece
  useEffect(() => {
    carregar();
  }, [carregar]);

  useTituloDaJanela(); // o tempo no título da janela
  useCalendarios(); // compromissos de hoje, relidos a cada 5 min
  useAlertas(); // avisos automáticos, verificados a cada segundo

  return (
    <>
      <main className="mx-auto max-w-[1000px] p-6">
        {erro && <p className="mb-4 rounded-cartao bg-surface p-4 text-warn shadow-cartao">{erro}</p>}
        {carregado && (
          <>
            <div className="mb-4 flex justify-end gap-2">
              <BotaoNotificacoes />
              <BotaoSom />
            </div>
            <div className="grid items-start gap-4 md:grid-cols-2">
              <div className="grid gap-4">
                <CartaoRoda />
                <CartaoAtividades />
              </div>
              <div className="grid gap-4">
                <CartaoAgenda />
              </div>
            </div>
          </>
        )}
      </main>
      <Avisos />
      <Confirmacao />
    </>
  );
}
