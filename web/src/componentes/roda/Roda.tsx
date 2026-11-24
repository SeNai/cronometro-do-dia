/*
 * A roda do cronómetro (SVG): tracinhos, arcos, botão para arrastar e os números no centro.
 *
 * Arrastar o botão (ou clicar no anel) escolhe a duração, de 5 em 5 minutos.
 * Com o botão focado, as setas mudam ±5 min e PageUp/PageDown ±15 min.
 *
 * As cores vêm da variável CSS --c (cor da atividade), definida no cartão à volta.
 */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useAgora } from '../../estado/useAgora';
import { useLoja } from '../../estado/loja';
import { atividadeNaRoda, corridaNaRoda, duracaoNaRoda } from '../../lib/consultas';
import {
  CENTRO,
  RAIO,
  TRACOS,
  anguloDe,
  calcularMostrador,
  minutosNoPonto,
  pontoNoAngulo,
  semSaltoNoTopo
} from '../../lib/roda';
import { PASSO_RODA, duracaoPorExtenso } from '../../lib/tempo';

/** Um arco da roda, preenchido numa fração (0–1). */
function Arco({ fracao, cor, semAnimacao }: { fracao: number; cor: string; semAnimacao: boolean }) {
  const f = Math.max(0, Math.min(1, fracao));
  return (
    <circle
      cx={CENTRO}
      cy={CENTRO}
      r={RAIO}
      fill="none"
      strokeWidth={20}
      strokeLinecap="round"
      // pathLength=100 faz o perímetro valer 100: «37 100» desenha 37% do círculo
      pathLength={100}
      strokeDasharray={`${(f * 100).toFixed(3)} 100`}
      transform={`rotate(-90 ${CENTRO} ${CENTRO})`}
      style={{ stroke: cor, opacity: f > 0.001 ? 1 : 0 }}
      className={semAnimacao ? '' : 'transition-[stroke-dasharray,stroke] duration-300'}
    />
  );
}

export function Roda() {
  const agora = useAgora();
  const dados = useLoja(s => s.dados);
  const config = useLoja(s => s.config);
  const definirDuracao = useLoja(s => s.definirDuracao);

  const atividade = atividadeNaRoda(dados);
  const corrida = corridaNaRoda(dados);
  const alvo = duracaoNaRoda(dados, config);
  const m = calcularMostrador(corrida, alvo, agora);

  // useRef guarda valores entre desenhos sem provocar um novo desenho
  const svg = useRef<SVGSVGElement>(null);
  const ultimo = useRef(0); // último valor ao arrastar (para não saltar no topo)
  const [aArrastar, setAArrastar] = useState(false);

  function aoCarregar(e: PointerEvent<SVGSVGElement>) {
    if (!svg.current || !atividade) return;
    const { minutos, distancia } = minutosNoPonto(e.clientX, e.clientY, svg.current.getBoundingClientRect());
    if (distancia < 80 || distancia > 160) return; // só conta perto do anel
    e.preventDefault();
    svg.current.setPointerCapture(e.pointerId);
    setAArrastar(true);
    ultimo.current = semSaltoNoTopo(alvo, minutos);
    definirDuracao(ultimo.current);
  }

  function aoMover(e: PointerEvent<SVGSVGElement>) {
    if (!aArrastar || !svg.current) return;
    const { minutos } = minutosNoPonto(e.clientX, e.clientY, svg.current.getBoundingClientRect());
    ultimo.current = semSaltoNoTopo(ultimo.current, minutos);
    definirDuracao(ultimo.current);
  }

  function aoTeclar(e: KeyboardEvent) {
    const passo = (
      {
        ArrowUp: PASSO_RODA,
        ArrowRight: PASSO_RODA,
        ArrowDown: -PASSO_RODA,
        ArrowLeft: -PASSO_RODA,
        PageUp: 15,
        PageDown: -15
      } as Record<string, number>
    )[e.key];
    if (!passo) return;
    e.preventDefault();
    e.stopPropagation();
    definirDuracao(alvo + passo);
  }

  const botao = pontoNoAngulo(anguloDe(alvo), RAIO);
  const corDecorrido = m.excedido ? 'var(--warn)' : 'var(--c)';

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[320px]">
      <svg
        ref={svg}
        viewBox="0 0 300 300"
        aria-label="Roda do cronómetro"
        className="block size-full touch-none overflow-visible select-none"
        onPointerDown={aoCarregar}
        onPointerMove={aoMover}
        onPointerUp={() => setAArrastar(false)}
        onPointerCancel={() => setAArrastar(false)}
      >
        {TRACOS.map(t => (
          <g key={t.minutos}>
            <line
              x1={t.de.x}
              y1={t.de.y}
              x2={t.ate.x}
              y2={t.ate.y}
              strokeLinecap="round"
              className={t.maior ? 'stroke-mute' : 'stroke-faint'}
              strokeWidth={t.maior ? 2.5 : 1.5}
            />
            {t.rotulo && (
              <text
                x={t.rotulo.x}
                y={t.rotulo.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-faint text-[11px]"
              >
                {t.minutos}
              </text>
            )}
          </g>
        ))}

        {/* anel de fundo, duração escolhida (claro) e tempo decorrido (forte) */}
        <circle cx={CENTRO} cy={CENTRO} r={RAIO} fill="none" strokeWidth={20} className="stroke-surface2" />
        <Arco
          fracao={m.arcoAlvo}
          cor="color-mix(in srgb, var(--c) 28%, transparent)"
          semAnimacao={aArrastar}
        />
        <g className={corrida ? 'animate-brilho' : ''}>
          <Arco fracao={m.arcoDecorrido} cor={corDecorrido} semAnimacao={aArrastar} />
        </g>

        <circle
          cx={botao.x}
          cy={botao.y}
          r={14}
          tabIndex={0}
          role="slider"
          aria-label="Duração do bloco (minutos)"
          aria-valuemin={0}
          aria-valuemax={120}
          aria-valuenow={Math.round(alvo)}
          aria-valuetext={alvo ? duracaoPorExtenso(alvo) : 'sem limite'}
          onKeyDown={aoTeclar}
          className={`fill-surface stroke-[var(--c)] stroke-[5] drop-shadow-md outline-none focus:stroke-[7] ${
            aArrastar ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        />
      </svg>

      {/* números no centro (pointer-events-none: os cliques passam para a roda) */}
      <div className="pointer-events-none absolute inset-[22%] flex flex-col items-center justify-center">
        <div className="text-xs tracking-[0.06em] text-mute uppercase">{m.rotulo}</div>
        <div
          className={`font-num text-[52px] leading-[1.05] font-semibold tracking-tight tabular-nums ${
            m.excedido ? 'text-warn' : ''
          }`}
        >
          {m.grande}
        </div>
        <div className="mt-0.5 font-num text-[13px] text-mute tabular-nums">{m.sub}</div>
      </div>
    </div>
  );
}
