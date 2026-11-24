/*
 * Desenha os avisos (canto inferior direito) e a janela de confirmação.
 * O que aparece é controlado por estado/avisos.ts (avisar() e confirmar()).
 */
import { useEffect, useRef } from 'react';
import { useAvisos } from '../../estado/avisos';
import { Botao } from './Botao';

export function Avisos() {
  const avisos = useAvisos(s => s.avisos);
  const fechar = useAvisos(s => s.fechar);

  return (
    <div className="fixed right-4.5 bottom-4.5 z-20 flex max-w-[360px] flex-col gap-2" aria-live="polite">
      {avisos.map(a => (
        <div
          key={a.id}
          className={`flex animate-entrar items-center gap-2.5 rounded-[14px] px-3.5 py-2.5 text-sm shadow-[0_8px_30px_#0005] ${
            a.tipo === 'alerta' ? 'bg-warn text-white' : 'bg-ink text-bg'
          }`}
        >
          <span className="flex-1">{a.texto}</span>
          {a.botao && (
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-current px-2.5 py-0.5"
              onClick={() => {
                a.botao!.acao();
                fechar(a.id);
              }}
            >
              {a.botao.rotulo}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function Confirmacao() {
  const pedido = useAvisos(s => s.confirmacao);
  const sim = useRef<HTMLButtonElement>(null);

  // foca o «Sim» quando a janela abre; Esc cancela
  useEffect(() => {
    if (!pedido) return;
    sim.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && pedido.responder(false);
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [pedido]);

  if (!pedido) return null;
  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[3px]"
      onClick={e => e.target === e.currentTarget && pedido.responder(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-[380px] rounded-[20px] border border-line bg-surface p-5.5 shadow-[0_20px_60px_#0006]"
      >
        <p className="mb-4">{pedido.texto}</p>
        <div className="flex justify-end gap-2">
          <Botao onClick={() => pedido.responder(false)}>Cancelar</Botao>
          <Botao ref={sim} variante="principal" onClick={() => pedido.responder(true)}>
            Sim
          </Botao>
        </div>
      </div>
    </div>
  );
}
