/*
 * Mostra o cronómetro no título da janela/separador: «12:04 · Estudo».
 * Assim vês o tempo mesmo com a app minimizada ou noutro separador.
 */
import { useEffect } from 'react';
import { atividadePorId } from '../lib/consultas';
import { MIN, relogio } from '../lib/tempo';
import { useAgora } from './useAgora';
import { useLoja } from './loja';

export function useTituloDaJanela() {
  const agora = useAgora();
  const dados = useLoja(s => s.dados);

  // useEffect corre depois de cada desenho em que `agora` ou `dados` mudaram
  useEffect(() => {
    const run = dados.run;
    if (!run) {
      document.title = 'Cronómetro do Dia';
      return;
    }
    const decorrido = agora - run.start;
    const alvo = (run.target || 0) * MIN;
    const tempo = alvo
      ? decorrido >= alvo
        ? '+' + relogio(decorrido - alvo)
        : relogio(alvo - decorrido)
      : relogio(decorrido);
    document.title = `${tempo} · ${atividadePorId(dados, run.id)?.name ?? ''}`;
  }, [agora, dados]);
}
