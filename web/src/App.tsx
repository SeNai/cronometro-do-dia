/*
 * Componente principal: carrega os dados no arranque e monta o ecrã.
 *
 * Por agora tem a roda e uma lista simples de atividades (provisória) para a testar:
 * um clique escolhe a atividade, duplo clique começa-a.
 * Os cartões verdadeiros, a agenda e a linha do tempo vêm nos próximos passos.
 */
import { useEffect, type CSSProperties } from 'react';
import { CartaoRoda } from './componentes/roda/CartaoRoda';
import { useLoja } from './estado/loja';
import { useTituloDaJanela } from './estado/useTituloDaJanela';
import { atividadeNaRoda, corDe } from './lib/consultas';

export default function App() {
  const carregar = useLoja(s => s.carregar);
  const carregado = useLoja(s => s.carregado);
  const erro = useLoja(s => s.erro);
  const dados = useLoja(s => s.dados);
  const escolher = useLoja(s => s.escolher);
  const comecar = useLoja(s => s.comecar);

  // corre uma vez, quando a app aparece
  useEffect(() => {
    carregar();
  }, [carregar]);

  useTituloDaJanela();

  const naRoda = atividadeNaRoda(dados);

  return (
    <main className="mx-auto grid max-w-md gap-4 p-6">
      {erro && <p className="rounded-cartao bg-surface p-4 text-warn shadow-cartao">{erro}</p>}

      {carregado && (
        <>
          <CartaoRoda />

          {/* provisório: será substituído pelos cartões das atividades */}
          <section className="rounded-cartao border border-line bg-surface p-4.5 shadow-cartao">
            <h2 className="mb-3 text-[13px] font-[650] tracking-[0.04em] text-mute uppercase">Atividades</h2>
            <ul className="grid gap-2">
              {dados.acts.map(a => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => escolher(a.id)}
                    onDoubleClick={() => comecar(a.id)}
                    style={{ '--c': corDe(a) } as CSSProperties}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border p-3 text-left ${
                      naRoda?.id === a.id
                        ? 'border-[var(--c)] shadow-[inset_0_0_0_1px_var(--c)]'
                        : 'border-line'
                    }`}
                  >
                    <span className="size-2.5 rounded-full bg-[var(--c)]" />
                    <b className="flex-1 font-medium">{a.name}</b>
                    {dados.run?.id === a.id && <span className="text-xs text-mute">a correr</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
