/*
 * Campo para escrever o tempo nos números grandes da roda (abre ao clicar nos números).
 *
 * - Só aceita algarismos, que entram pela direita: 6, 3, 4 → 06:34. Os «:» são fixos.
 * - ↑/↓ somam/tiram 1 minuto (com Shift, 1 segundo). Backspace apaga o último; Delete apaga tudo.
 * - Colar aceita formatos como «6:34», «6 min 34 s» ou «1h20».
 * - Enter (ou sair do campo) aplica; Esc cancela.
 *
 * A lógica dos algarismos está em lib/tempoEscrito.ts; aqui fica só o comportamento do campo.
 */
import { useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import {
  DICAS,
  MAXIMO_ESCRITO,
  algarismosDe,
  juntarAlgarismo,
  minutosDe,
  mostrarAlgarismos
} from '../../lib/tempoEscrito';
import { lerDuracao, limitar } from '../../lib/tempo';

interface Props {
  /** Minutos com que o campo abre (null = vazio). */
  inicial: number | null;
  aCorrer: boolean;
  /** Recebe os minutos escritos. Devolve false se não foram aceites (o campo abana e fica aberto). */
  aoAplicar: (minutos: number) => boolean;
  aoFechar: () => void;
  /** Muda o texto de ajuda por baixo do campo. */
  aoMudarDica: (dica: string) => void;
}

export function EditorTempo({ inicial, aCorrer, aoAplicar, aoFechar, aoMudarDica }: Props) {
  const [algarismos, setAlgarismos] = useState(inicial ? algarismosDe(inicial) : '');
  // «fresco»: ainda não se escreveu nada; o primeiro algarismo substitui o valor que lá estava
  const [fresco, setFresco] = useState(true);
  const [recusado, setRecusado] = useState(false); // borda laranja depois de uma recusa
  const campo = useRef<HTMLInputElement>(null);
  const fechado = useRef(false);

  const valor = mostrarAlgarismos(algarismos);

  // depois de cada mudança, o cursor fica sempre no fim
  useLayoutEffect(() => {
    const el = campo.current;
    if (!el) return;
    if (document.activeElement !== el) el.focus();
    el.setSelectionRange(valor.length, valor.length);
  });

  /** Abana o campo (Web Animations API: recomeça a animação mesmo que se repita). */
  function recusar() {
    setRecusado(true);
    campo.current?.animate(
      [
        { transform: 'none' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'none' }
      ],
      300
    );
  }

  function mudar(novos: string) {
    setAlgarismos(novos);
    setFresco(false);
    setRecusado(false);
    aoMudarDica(aCorrer ? DICAS.aCorrer : DICAS.parado);
  }

  function fechar() {
    fechado.current = true;
    aoFechar();
  }

  function aplicar() {
    if (fechado.current) return;
    if (!algarismos && fresco) return fechar(); // não se escreveu nada
    const minutos = minutosDe(algarismos);
    if (minutos > MAXIMO_ESCRITO) {
      recusar();
      aoMudarDica(DICAS.demasiado);
      return;
    }
    if (aoAplicar(minutos)) fechar();
    else recusar();
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation(); // os atalhos da app não reagem enquanto se escreve
    if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Tab') return; // deixa Ctrl+V, Tab…
    e.preventDefault();

    if (/^[0-9]$/.test(e.key)) {
      const novos = juntarAlgarismo(fresco ? '' : algarismos, e.key);
      if (novos === null) recusar();
      else mudar(novos);
    } else if (e.key === 'Backspace') mudar(fresco ? '' : algarismos.slice(0, -1));
    else if (e.key === 'Delete') mudar('');
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const passo = (e.shiftKey ? 1 / 60 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
      mudar(algarismosDe(limitar(minutosDe(algarismos) + passo, 0, MAXIMO_ESCRITO)));
    } else if (e.key === 'Enter') aplicar();
    else if (e.key === 'Escape') fechar();
    else if (e.key.length === 1) recusar(); // letras, espaços, «:» e outros símbolos não entram
  }

  function aoColar(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const minutos = lerDuracao(e.clipboardData.getData('text'));
    if (minutos != null && minutos <= MAXIMO_ESCRITO) mudar(algarismosDe(minutos));
    else recusar();
  }

  return (
    <input
      ref={campo}
      value={valor}
      autoComplete="off"
      spellCheck={false}
      inputMode="numeric"
      aria-label={aCorrer ? 'Tempo que falta, minutos e segundos' : 'Duração do bloco, minutos e segundos'}
      onKeyDown={aoTeclar}
      onPaste={aoColar}
      // teclados de ecrã (telemóvel) escrevem diretamente no campo: fica-se só com os algarismos
      onChange={e => mudar(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(-5))}
      onPointerUp={() => campo.current?.setSelectionRange(valor.length, valor.length)}
      onBlur={aplicar}
      style={{ width: `${valor.length + 0.9}ch` }}
      className={`pointer-events-auto rounded-xl border-[1.5px] bg-surface2 px-1 text-center font-num text-[46px] leading-[1.1] font-semibold tabular-nums shadow-[0_0_0_4px_color-mix(in_srgb,var(--c)_18%,transparent)] outline-none ${
        fresco ? 'text-mute' : 'text-ink'
      } ${recusado ? 'border-warn' : 'border-[var(--c)]'}`}
    />
  );
}
