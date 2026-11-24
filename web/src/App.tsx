/*
 * Componente principal: carrega os dados no arranque, liga os relógios e monta o ecrã.
 *
 * Ecrã «Hoje»: à esquerda a roda e as atividades; à direita a agenda e a linha do tempo.
 * A barra lateral com os separadores (Planos, Resumo, Registo) e as Definições vêm nos próximos passos.
 */
import { useEffect } from 'react';
import { CartaoAgenda } from './componentes/agenda/CartaoAgenda';
import { CartaoAtividades } from './componentes/atividades/CartaoAtividades';
import { CartaoLinhaDoTempo } from './componentes/linha-do-tempo/CartaoLinhaDoTempo';
import { CartaoRoda } from './componentes/roda/CartaoRoda';
import { Topo } from './componentes/topo/Topo';
import { Avisos, Confirmacao } from './componentes/ui/Avisos';
import { irPara } from './estado/acoesPlano';
import { useLoja } from './estado/loja';
import { useAlertas } from './estado/useAlertas';
import { useAtalhos } from './estado/useAtalhos';
import { useCalendarios } from './estado/useCalendarios';
import { useTituloDaJanela } from './estado/useTituloDaJanela';
import { hoje } from './lib/tempo';

export default function App() {
  const carregar = useLoja(s => s.carregar);
  const carregado = useLoja(s => s.carregado);
  const erro = useLoja(s => s.erro);

  // corre uma vez, quando a app aparece
  useEffect(() => {
    carregar();
  }, [carregar]);

  // depois de carregar: mostra hoje (e enche-o com a semana ativa, se ainda não tiver plano)
  useEffect(() => {
    if (carregado) irPara(hoje());
  }, [carregado]);

  useTituloDaJanela(); // o tempo no título da janela
  useCalendarios(); // compromissos, relidos a cada 5 min
  useAlertas(); // avisos automáticos, verificados a cada segundo
  useAtalhos(); // teclas 1–9 e Espaço

  return (
    <>
      <Topo />
      <main className="mx-auto max-w-[1280px] p-5">
        {erro && <p className="mb-4 rounded-cartao bg-surface p-4 text-warn shadow-cartao">{erro}</p>}
        {carregado && (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="grid min-w-0 gap-4">
              <CartaoRoda />
              <CartaoAtividades />
            </div>
            <div className="grid min-w-0 gap-4">
              <CartaoAgenda />
              <CartaoLinhaDoTempo />
            </div>
          </div>
        )}
      </main>
      <Avisos />
      <Confirmacao />
    </>
  );
}
