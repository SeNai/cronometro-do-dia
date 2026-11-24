/*
 * Componente principal: carrega os dados no arranque, liga os relógios e monta o ecrã.
 *
 * Estrutura: o topo, a barra lateral (separadores) e o separador escolhido:
 *   Hoje   → roda, atividades, agenda e linha do tempo
 *   Planos → semanas e planos do dia
 *   Resumo → o dia escolhido e os últimos 7 dias
 *   Registo → os blocos feitos no dia escolhido
 */
import { useEffect } from 'react';
import { CartaoAgenda } from './componentes/agenda/CartaoAgenda';
import { CartaoAtividades } from './componentes/atividades/CartaoAtividades';
import { CartaoLinhaDoTempo } from './componentes/linha-do-tempo/CartaoLinhaDoTempo';
import { JanelaDefinicoes } from './componentes/definicoes/JanelaDefinicoes';
import { SeparadorPlanos } from './componentes/planos/SeparadorPlanos';
import { SeparadorRegisto } from './componentes/resumo/SeparadorRegisto';
import { SeparadorResumo } from './componentes/resumo/SeparadorResumo';
import { CartaoRoda } from './componentes/roda/CartaoRoda';
import { BarraLateral } from './componentes/topo/BarraLateral';
import { Topo } from './componentes/topo/Topo';
import { Avisos, Confirmacao } from './componentes/ui/Avisos';
import { irPara } from './estado/acoesPlano';
import { useLoja } from './estado/loja';
import { useAlertas } from './estado/useAlertas';
import { useAtalhos } from './estado/useAtalhos';
import { useCalendarios } from './estado/useCalendarios';
import { useGoogle } from './estado/useGoogle';
import { useTituloDaJanela } from './estado/useTituloDaJanela';
import { hoje } from './lib/tempo';

/** Separador «Hoje»: à esquerda a roda e as atividades; à direita a agenda e a linha do tempo. */
function SeparadorHoje() {
  return (
    <div className="grid items-start gap-[18px] lg:grid-cols-[400px_minmax(0,1fr)]">
      <div className="grid min-w-0 gap-[18px]">
        <CartaoRoda />
        <CartaoAtividades />
      </div>
      <div className="grid min-w-0 gap-[18px]">
        <CartaoAgenda />
        <CartaoLinhaDoTempo />
      </div>
    </div>
  );
}

export default function App() {
  const carregar = useLoja(s => s.carregar);
  const carregado = useLoja(s => s.carregado);
  const erro = useLoja(s => s.erro);
  const vista = useLoja(s => s.vista);
  const definicoesAbertas = useLoja(s => s.definicoesAbertas);

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
  useGoogle(); // estado da ligação ao Google, a cada minuto

  return (
    <>
      <Topo />
      <div className="sm:grid sm:grid-cols-[78px_minmax(0,1fr)]">
        <BarraLateral />
        <main className="mx-auto w-full max-w-[1280px] min-w-0 px-5 pt-[18px] pb-[60px]">
          {erro && <p className="mb-4 rounded-cartao bg-surface p-4 text-warn shadow-cartao">{erro}</p>}
          {carregado && vista === 'hoje' && <SeparadorHoje />}
          {carregado && vista === 'planos' && <SeparadorPlanos />}
          {carregado && vista === 'stats' && <SeparadorResumo />}
          {carregado && vista === 'log' && <SeparadorRegisto />}
        </main>
      </div>
      {definicoesAbertas && <JanelaDefinicoes />}
      <Avisos />
      <Confirmacao />
    </>
  );
}
