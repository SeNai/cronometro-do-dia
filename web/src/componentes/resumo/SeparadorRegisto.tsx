/*
 * Separador «Registo»: os blocos feitos no dia escolhido no topo, com botão para apagar
 * e «⧉ Copiar resumo» (copia um texto com o resumo e os blocos, para colar onde quiseres).
 */
import { useState } from 'react';
import { avisar, confirmar } from '../../estado/avisos';
import { useLoja } from '../../estado/loja';
import { atividadePorId, corDe } from '../../lib/consultas';
import { blocosDoRegisto, textoDoResumo } from '../../lib/resumo';
import { curto, horaMinuto, rotuloDoDia } from '../../lib/tempo';
import { Botao } from '../ui/Botao';
import { Cartao } from '../ui/Cartao';
import { Janela } from '../ui/Janela';

export function SeparadorRegisto() {
  const dados = useLoja(s => s.dados);
  const dia = useLoja(s => s.dia);
  const escreverNoGoogle = useLoja(s => s.config.google_escrever);
  const [textoParaCopiar, setTextoParaCopiar] = useState<string | null>(null);
  const blocos = blocosDoRegisto(dados, dia);

  async function apagar(uid: string) {
    const aviso = escreverNoGoogle ? ' (também sai do Google Calendar)' : '';
    if (!(await confirmar('Apagar este bloco do registo?' + aviso))) return;
    useLoja.setState(s => {
      s.dados.log = s.dados.log.filter(b => b.uid !== uid);
    });
  }

  async function copiar() {
    const texto = textoDoResumo(dados, dia);
    try {
      await navigator.clipboard.writeText(texto);
      avisar('Resumo copiado.');
    } catch {
      // sem acesso à área de transferência: mostra o texto para copiar à mão
      setTextoParaCopiar(texto);
    }
  }

  return (
    <>
      <Cartao
        titulo={`Registo de blocos · ${rotuloDoDia(dia)}`}
        acoes={
          <Botao variante="fantasma" pequeno onClick={copiar}>
            ⧉ Copiar resumo
          </Botao>
        }
      >
        <table className="w-full border-collapse text-sm">
          <tbody>
            {blocos.map(b => {
              const a = atividadePorId(dados, b.id);
              return (
                <tr key={b.uid} className="border-b border-line last:border-b-0">
                  <td className="px-1 py-2">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: corDe(a) }} />
                      {a?.name ?? '(removida)'}
                    </span>
                  </td>
                  <td className="px-1 py-2 font-num text-mute tabular-nums">
                    {horaMinuto(b.start)} – {horaMinuto(b.end)}
                  </td>
                  <td className="px-1 py-2 text-right font-num tabular-nums">{curto(b.end - b.start)}</td>
                  <td className="w-10 px-1 py-2 text-right">
                    <button
                      type="button"
                      title="Apagar bloco"
                      onClick={() => apagar(b.uid)}
                      className="cursor-pointer rounded-md px-1.5 py-0.5 text-faint hover:bg-surface2 hover:text-warn"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
            {!blocos.length && (
              <tr>
                <td className="px-1 py-2 text-mute">Sem blocos neste dia.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Cartao>

      {textoParaCopiar !== null && (
        <Janela largura={440} aoFechar={() => setTextoParaCopiar(null)} rotulo="Resumo para copiar">
          <p className="mb-2">Resumo (seleciona e copia):</p>
          <textarea
            readOnly
            value={textoParaCopiar}
            onFocus={e => e.target.select()}
            className="h-[200px] w-full rounded-[10px] border border-line bg-surface2 p-2 font-mono text-xs"
          />
          <div className="mt-2 flex justify-end">
            <Botao onClick={() => setTextoParaCopiar(null)}>Fechar</Botao>
          </div>
        </Janela>
      )}
    </>
  );
}
