/*
 * Botão 🔊/🔇 no topo: liga e desliga todos os sons com um clique.
 */
import { avisar } from '../../estado/avisos';
import { useLoja } from '../../estado/loja';
import { tocarSom } from '../../lib/sons';
import { Botao } from '../ui/Botao';

export function BotaoSom() {
  const config = useLoja(s => s.config);
  const alterarConfig = useLoja(s => s.alterarConfig);
  // o som está desligado se estiver em «mudo» ou com o volume a zero
  const desligado = config.som_mudo || !config.som_volume;

  function alternar() {
    // ao ligar com o volume a zero, põe-no a 50 (senão continuava sem se ouvir)
    const mudancas = desligado
      ? { som_mudo: false, ...(config.som_volume ? {} : { som_volume: 50 }) }
      : { som_mudo: true };
    alterarConfig(mudancas);
    if (desligado) tocarSom('aviso', { ...config, ...mudancas });
    avisar(desligado ? 'Sons ligados.' : 'Sons desligados.');
  }

  return (
    <Botao
      variante={desligado ? 'fantasma' : 'normal'}
      title={desligado ? 'Sons desligados · clica para ligar' : 'Silenciar sons'}
      onClick={alternar}
    >
      {desligado ? '🔇' : '🔊'}
    </Botao>
  );
}
