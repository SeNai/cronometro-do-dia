/*
 * A grelha do editor de planos: uma coluna (plano do dia) ou sete (semana, Seg–Dom).
 *
 *   - clicar (ou clicar e arrastar) num espaço vazio cria um bloco («Que atividade?»);
 *   - arrastar um bloco muda-lhe a hora e, numa semana, também o dia;
 *   - puxar a base muda a duração; clicar abre as opções; Delete apaga; Enter abre as opções;
 *   - largar uma atividade vinda da paleta cria um bloco.
 *
 * Os blocos usam minutos desde a meia-noite. Como não têm identificador, cada bloco
 * é conhecido pela coluna e pela posição (índice) na lista ordenada dessa coluna.
 */
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type PointerEvent
} from 'react';
import { moverBloco, mudarColuna } from '../../estado/acoesPlanos';
import { useLoja } from '../../estado/loja';
import { atividadePorId, corDe } from '../../lib/consultas';
import {
  MINUTOS_DIA,
  duracaoNoModelo,
  encaixarMinutos,
  fimQueCabeNoModelo,
  horaDeMinutos,
  primeiroLivre,
  type Coluna,
  type PlanoAberto
} from '../../lib/planos';
import { MIN, curto, doisDigitos, limitar } from '../../lib/tempo';
import type { BlocoModelo } from '../../tipos';
import { MenuBlocoGuardado, MenuNovoBlocoGuardado, type PreviaGrelha } from './MenusGrelha';

/** Píxeis por minuto na grelha (mais compacta do que a linha do tempo). */
export const PX_GRELHA = 0.9;

export interface ColunaDaGrelha {
  chave: Coluna;
  blocos: BlocoModelo[];
}

type Arrasto =
  | { modo: 'novo'; ci: number; ancora: number; s: number; e: number; y0: number; mexeu: boolean }
  | {
      modo: 'mover' | 'esticar';
      ci: number;
      indice: number;
      bloco: BlocoModelo;
      s: number;
      e: number;
      para: number;
      x0: number;
      y0: number;
      mexeu: boolean;
    };

type Menu =
  | { tipo: 'novo'; x: number; y: number; ci: number; s: number; e: number | null }
  | { tipo: 'bloco'; x: number; y: number; ci: number; indice: number };

interface Props {
  plano: PlanoAberto;
  colunas: ColunaDaGrelha[];
  /** Atividade a ser arrastada da paleta (null = nenhuma). */
  arrastada: number | null;
  aoLargar: () => void;
}

interface PropsBloco {
  s: number;
  e: number;
  /** Minuto do topo da grelha (h0 × 60). */
  inicioGrelha: number;
  cor: string;
  rotulo: string;
  className?: string;
  aMexer?: boolean;
  /** Bloco verdadeiro (não uma pré-visualização): pode ser focado, arrastado e esticado. */
  indice?: number;
  title?: string;
}

/** Um bloco na grelha (ou uma pré-visualização, se não tiver `indice`). */
function BlocoGrelha({ s, e, inicioGrelha, cor, rotulo, className = '', aMexer, indice, title }: PropsBloco) {
  const h = Math.max(16, (e - s) * PX_GRELHA);
  const real = indice !== undefined;
  return (
    <div
      data-indice={real ? indice : undefined}
      tabIndex={real ? 0 : undefined}
      title={title}
      style={{ top: (s - inicioGrelha) * PX_GRELHA, height: h, '--c': cor } as CSSProperties}
      className={`group absolute inset-x-[3px] overflow-hidden rounded-lg border-[1.5px] border-[var(--c)] px-[7px] py-[3px] text-xs leading-[1.25] select-none ${
        aMexer ? 'z-[4] border-solid shadow-[0_8px_24px_#0003]' : 'border-dashed'
      } ${
        real
          ? 'z-[1] cursor-grab touch-none bg-[color-mix(in_srgb,var(--c)_9%,var(--surface))] text-[color-mix(in_srgb,var(--c)_75%,var(--ink))] outline-none hover:bg-[color-mix(in_srgb,var(--c)_18%,var(--surface))] focus-visible:bg-[color-mix(in_srgb,var(--c)_18%,var(--surface))]'
          : 'pointer-events-none z-[3] bg-[color-mix(in_srgb,var(--c)_20%,var(--surface))] text-ink'
      } ${className}`}
    >
      <b className="block truncate font-semibold">{rotulo}</b>
      {h > 30 && (
        <small className="block truncate opacity-80">
          {horaDeMinutos(s)}–{horaDeMinutos(e)} · {curto((e - s) * MIN)}
        </small>
      )}
      {/* pega na base do bloco para esticar */}
      {real && (
        <i
          data-esticar
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize after:absolute after:bottom-0.5 after:left-1/2 after:-ml-[9px] after:h-[3px] after:w-[18px] after:rounded-sm after:bg-[var(--c)] after:opacity-0 after:transition-opacity group-hover:after:opacity-60"
        />
      )}
    </div>
  );
}

export function GrelhaPlano({ plano, colunas, arrastada, aoLargar }: Props) {
  const dados = useLoja(s => s.dados);
  const blocoMax = useLoja(s => s.config.bloco_max_min);

  // horas visíveis: das 6h (ou mais cedo, se houver blocos antes) até à meia-noite
  const h0 = Math.min(6, ...colunas.flatMap(c => c.blocos.map(b => Math.floor(b.s / 60))));
  const altura = (24 - h0) * 60 * PX_GRELHA;

  const scroll = useRef<HTMLDivElement>(null);
  const colunasEl = useRef<(HTMLDivElement | null)[]>([]);
  const [arrasto, setArrastoEstado] = useState<Arrasto | null>(null);
  const arrastoRef = useRef<Arrasto | null>(null);
  const setArrasto = (a: Arrasto | null) => {
    arrastoRef.current = a;
    setArrastoEstado(a);
  };
  const [menu, setMenu] = useState<Menu | null>(null);
  const [previa, setPrevia] = useState<PreviaGrelha | null>(null);

  // ao abrir outro plano, faz scroll até às 8h
  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = Math.max(0, (8 - h0) * 60 * PX_GRELHA);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando muda o plano aberto
  }, [plano.tipo, plano.id]);

  /** Minuto do dia numa posição vertical de uma coluna. */
  const minutoEm = (ci: number, clienteY: number) =>
    h0 * 60 + (clienteY - (colunasEl.current[ci]?.getBoundingClientRect().top ?? 0)) / PX_GRELHA;
  /** Coluna debaixo do rato (para mudar um bloco de dia). */
  const colunaEm = (clienteX: number) =>
    colunasEl.current.findIndex(c => {
      const r = c?.getBoundingClientRect();
      return r && clienteX >= r.left && clienteX < r.right;
    });
  function scrollNasBordas(clienteY: number) {
    const el = scroll.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (clienteY < r.top + 30) el.scrollTop -= 12;
    else if (clienteY > r.bottom - 30) el.scrollTop += 12;
  }

  function aoCarregar(e: PointerEvent<HTMLDivElement>, ci: number) {
    if (e.button !== 0) return;
    const alvo = e.target as HTMLElement;
    const el = alvo.closest<HTMLElement>('[data-indice]');
    if (el) {
      const indice = +el.dataset.indice!;
      const bloco = colunas[ci].blocos[indice];
      setArrasto({
        modo: alvo.dataset.esticar !== undefined ? 'esticar' : 'mover',
        ci,
        indice,
        bloco,
        s: bloco.s,
        e: bloco.e,
        para: ci,
        x0: e.clientX,
        y0: e.clientY,
        mexeu: false
      });
    } else {
      const m = encaixarMinutos(minutoEm(ci, e.clientY));
      setArrasto({ modo: 'novo', ci, ancora: m, s: m, e: m + 30, y0: e.clientY, mexeu: false });
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function aoMover(e: PointerEvent<HTMLDivElement>) {
    const d = arrastoRef.current;
    if (!d) return;
    const x0 = d.modo === 'novo' ? e.clientX : d.x0;
    if (!d.mexeu && Math.abs(e.clientY - d.y0) < 4 && Math.abs(e.clientX - x0) < 6) return;
    scrollNasBordas(e.clientY);
    if (d.modo === 'novo') {
      const m = limitar(encaixarMinutos(minutoEm(d.ci, e.clientY)), 0, MINUTOS_DIA);
      const s = Math.min(d.ancora, m);
      setArrasto({ ...d, mexeu: true, s, e: Math.max(d.ancora, m, s + 5) });
    } else if (d.modo === 'mover') {
      const duracao = d.bloco.e - d.bloco.s;
      const s = limitar(
        encaixarMinutos(d.bloco.s + (e.clientY - d.y0) / PX_GRELHA),
        0,
        MINUTOS_DIA - duracao
      );
      const para = colunas.length > 1 ? Math.max(0, colunaEm(e.clientX)) : d.ci;
      setArrasto({ ...d, mexeu: true, s, e: s + duracao, para: para < 0 ? d.ci : para });
    } else {
      const fim = Math.min(MINUTOS_DIA, Math.max(d.bloco.s + 5, encaixarMinutos(minutoEm(d.ci, e.clientY))));
      setArrasto({ ...d, mexeu: true, e: fim });
    }
  }

  function aoSoltar(e: PointerEvent<HTMLDivElement>) {
    const d = arrastoRef.current;
    if (!d) return;
    setArrasto(null);
    const p = { x: e.clientX, y: e.clientY };
    if (d.modo === 'novo') {
      const fim = d.mexeu ? Math.max(d.e, d.s + 10) : null;
      setPrevia({
        ci: d.ci,
        s: d.s,
        e: fim ?? fimQueCabeNoModelo(colunas[d.ci].blocos, d.s, 30),
        rotulo: 'Novo bloco'
      });
      setMenu({ tipo: 'novo', ...p, ci: d.ci, s: d.s, e: fim });
    } else if (!d.mexeu) setMenu({ tipo: 'bloco', ...p, ci: d.ci, indice: d.indice });
    else if (d.modo === 'mover')
      moverBloco(plano, colunas[d.ci].chave, d.indice, colunas[d.para].chave, d.s, d.e);
    else
      mudarColuna(plano, colunas[d.ci].chave, bs =>
        bs.map((b, i) => (i === d.indice ? { ...b, e: d.e } : b))
      );
  }

  /* ---------- largar uma atividade da paleta ---------- */

  function sitioParaLargar(ci: number, clienteY: number, id: number): PreviaGrelha {
    const bs = colunas[ci].blocos;
    const a = atividadePorId(dados, id);
    const s = primeiroLivre(bs, Math.max(0, encaixarMinutos(minutoEm(ci, clienteY) - 10)));
    return {
      ci,
      s,
      e: fimQueCabeNoModelo(bs, s, duracaoNoModelo(a?.goal, blocoMax)),
      cor: corDe(a),
      rotulo: a?.name ?? ''
    };
  }

  function aoArrastarPorCima(e: DragEvent, ci: number) {
    if (arrastada == null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    scrollNasBordas(e.clientY);
    setPrevia(sitioParaLargar(ci, e.clientY, arrastada));
  }

  function aoLargarAtividade(e: DragEvent, ci: number) {
    if (arrastada == null) return;
    e.preventDefault();
    const { s, e: fim } = sitioParaLargar(ci, e.clientY, arrastada);
    mudarColuna(plano, colunas[ci].chave, bs => [...bs, { id: arrastada, s, e: fim }]);
    setPrevia(null);
    aoLargar();
  }

  function fecharMenu() {
    setMenu(null);
    setPrevia(null);
  }

  const colunaMenu = menu ? colunas[menu.ci] : undefined;
  const estiloGrelha = { gridTemplateColumns: `46px repeat(${colunas.length}, minmax(0, 1fr))` };

  return (
    <>
      <div
        ref={scroll}
        className="h-[min(66vh,720px)] overflow-y-auto border-t border-line [scrollbar-width:thin]"
      >
        <div className="grid gap-x-1" style={{ ...estiloGrelha, height: altura }}>
          {/* horas */}
          <div className="relative">
            {Array.from({ length: 25 - h0 }, (_, i) => (
              <span
                key={i}
                className="absolute right-1.5 -translate-y-px text-[11px] text-faint"
                style={{ top: i * 60 * PX_GRELHA }}
              >
                {doisDigitos((h0 + i) % 24)}:00
              </span>
            ))}
          </div>

          {colunas.map((c, ci) => (
            <div
              key={c.chave}
              ref={el => {
                colunasEl.current[ci] = el;
              }}
              data-coluna={c.chave}
              onPointerDown={e => aoCarregar(e, ci)}
              onPointerMove={aoMover}
              onPointerUp={aoSoltar}
              onPointerCancel={() => setArrasto(null)}
              onDragOver={e => aoArrastarPorCima(e, ci)}
              onDragLeave={e => !e.currentTarget.contains(e.relatedTarget as Node) && setPrevia(null)}
              onDrop={e => aoLargarAtividade(e, ci)}
              onKeyDown={e => {
                const el = (e.target as HTMLElement).closest<HTMLElement>('[data-indice]');
                if (!el) return;
                const indice = +el.dataset.indice!;
                if (e.key === 'Delete' || e.key === 'Backspace') {
                  e.preventDefault();
                  e.stopPropagation();
                  mudarColuna(plano, c.chave, bs => bs.filter((_, i) => i !== indice));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  const r = el.getBoundingClientRect();
                  setMenu({ tipo: 'bloco', x: r.right, y: r.top + 20, ci, indice });
                }
              }}
              style={{ backgroundSize: `100% ${60 * PX_GRELHA}px` }}
              className={`relative cursor-copy rounded-md bg-[color-mix(in_srgb,var(--surface2)_45%,transparent)] bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--line)_75%,transparent)_1px,transparent_1px)] hover:bg-[color-mix(in_srgb,var(--accent)_5%,var(--surface2))] ${
                arrastada != null
                  ? 'outline-[1.5px] -outline-offset-2 outline-[color-mix(in_srgb,var(--accent)_45%,transparent)] outline-dashed'
                  : ''
              }`}
            >
              {c.blocos.map((b, i) => {
                const d =
                  arrasto && arrasto.modo !== 'novo' && arrasto.ci === ci && arrasto.indice === i
                    ? arrasto
                    : null;
                if (d?.mexeu && d.modo === 'mover' && d.para !== ci) return null; // está a ser levado para outro dia
                const a = atividadePorId(dados, b.id);
                return (
                  <BlocoGrelha
                    key={i}
                    indice={i}
                    s={d?.mexeu ? d.s : b.s}
                    e={d?.mexeu ? d.e : b.e}
                    inicioGrelha={h0 * 60}
                    cor={corDe(a)}
                    rotulo={a?.name ?? '(removida)'}
                    aMexer={!!d?.mexeu}
                    title={`${a?.name ?? '(removida)'} · ${horaDeMinutos(b.s)}–${horaDeMinutos(b.e)}`}
                  />
                );
              })}

              {/* bloco a ser levado de outro dia para este */}
              {arrasto?.modo === 'mover' && arrasto.mexeu && arrasto.para === ci && arrasto.ci !== ci && (
                <BlocoGrelha
                  s={arrasto.s}
                  e={arrasto.e}
                  inicioGrelha={h0 * 60}
                  cor={corDe(atividadePorId(dados, arrasto.bloco.id))}
                  rotulo={atividadePorId(dados, arrasto.bloco.id)?.name ?? ''}
                  aMexer
                />
              )}

              {/* período a ser marcado com o rato */}
              {arrasto?.modo === 'novo' && arrasto.mexeu && arrasto.ci === ci && (
                <BlocoGrelha
                  s={arrasto.s}
                  e={arrasto.e}
                  inicioGrelha={h0 * 60}
                  cor="var(--accent)"
                  rotulo="Novo bloco"
                />
              )}

              {/* pré-visualização (menu aberto ou atividade a ser largada) */}
              {previa && previa.ci === ci && !arrasto && (
                <BlocoGrelha
                  s={previa.s}
                  e={previa.e}
                  inicioGrelha={h0 * 60}
                  cor={previa.cor ?? 'var(--accent)'}
                  rotulo={previa.rotulo}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {menu?.tipo === 'novo' && colunaMenu && (
        <MenuNovoBlocoGuardado
          x={menu.x}
          y={menu.y}
          plano={plano}
          coluna={colunaMenu.chave}
          ci={menu.ci}
          blocos={colunaMenu.blocos}
          s={menu.s}
          e={menu.e}
          aoFechar={fecharMenu}
          aoPrever={setPrevia}
        />
      )}
      {menu?.tipo === 'bloco' && colunaMenu && (
        <MenuBlocoGuardado
          x={menu.x}
          y={menu.y}
          plano={plano}
          coluna={colunaMenu.chave}
          blocos={colunaMenu.blocos}
          indice={menu.indice}
          aoFechar={fecharMenu}
        />
      )}
    </>
  );
}
