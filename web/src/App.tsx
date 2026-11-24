/*
 * Componente principal: carrega os dados no arranque e monta o ecrã.
 *
 * Por agora: a roda e os cartões das atividades. A agenda, a linha do tempo,
 * os separadores e as Definições vêm nos próximos passos.
 */
import { useEffect } from 'react';
import { CartaoAtividades } from './componentes/atividades/CartaoAtividades';
import { CartaoRoda } from './componentes/roda/CartaoRoda';
import { Avisos, Confirmacao } from './componentes/ui/Avisos';
import { useLoja } from './estado/loja';
import { useTituloDaJanela } from './estado/useTituloDaJanela';

export default function App() {
  const carregar = useLoja(s => s.carregar);
  const carregado = useLoja(s => s.carregado);
  const erro = useLoja(s => s.erro);

  // corre uma vez, quando a app aparece
  useEffect(() => {
    carregar();
  }, [carregar]);

  useTituloDaJanela();

  return (
    <>
      <main className="mx-auto grid max-w-md gap-4 p-6">
        {erro && <p className="rounded-cartao bg-surface p-4 text-warn shadow-cartao">{erro}</p>}
        {carregado && (
          <>
            <CartaoRoda />
            <CartaoAtividades />
          </>
        )}
      </main>
      <Avisos />
      <Confirmacao />
    </>
  );
}
