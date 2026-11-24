/*
 * A linha do tempo do dia mostrado: horas, compromissos (Agenda), blocos feitos (Feito),
 * blocos planeados (Plano) e a linha vermelha do «agora».
 *
 * Interação na coluna Plano (só hoje e dias futuros):
 *   - passar o rato mostra «＋ 14:30»;
 *   - clicar num espaço vazio abre «Que atividade?»; clicar e arrastar marca um período;
 *   - arrastar um bloco muda-lhe a hora; puxar a base muda a duração; clicar abre as opções;
 *   - duplo clique num bloco de hoje começa-o; Delete apaga o bloco focado; Enter abre as opções;
 *   - largar aqui um cartão de atividade cria um bloco.
 */
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEventHandler,
  type PointerEvent,
  type ReactNode
} from 'react';
import {
  adicionarBloco,
  alterarBloco,
  apagarBloco,
  terminarArrastoDeAtividade
} from '../../estado/acoesPlano';
import { useAgora } from '../../estado/useAgora';
import { useLoja } from '../../estado/loja';
import { atividadePorId, corDe } from '../../lib/consultas';
import {
  FAIXAS,
  PX_POR_MINUTO,
  calcularIntervalo,
  instanteEm,
  topoDe,
  type Faixa
} from '../../lib/linhaDoTempo';
import {
  ENCAIXE,
  blocosDoDia,
  duracaoDeBlocoNovo,
  encaixar,
  fimQueCabe,
  inicioDoPlano,
  podePlanear,
  primeiroInstante
} from '../../lib/plano';
import { MIN, curto, doisDigitos, hoje, horaMinuto, inicioDoDia, somarDias } from '../../lib/tempo';
import type { Bloco } from '../../tipos';
import { MenuBloco, MenuNovoBloco, type Previa } from './MenusDoPlano';

/** Arrasto em curso na coluna Plano. */
type Arrasto =
  | { modo: 'novo'; ancora: number; inicio: number; fim: number; y0: number; mexeu: boolean }
  | { modo: 'mover' | 'esticar'; bloco: Bloco; inicio: number; fim: number; y0: number; mexeu: boolean };

/** Menu aberto. */
type Menu =
  | { tipo: 'novo'; x: number; y: number; inicio: number; fim: number | null }
  | { tipo: 'bloco'; x: number; y: number; uid: string };

interface PropsBloco {
  faixa: Faixa;
  inicio: number;
  fim: number;
  lo: number;
  hi: number;
  titulo: string;
  sub?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  [outro: `data-${string}`]: string | undefined;
  title?: string;
  tabIndex?: number;
  onKeyDown?: KeyboardEventHandler;
}

/** Um bloco posicionado numa faixa (cortado ao intervalo desenhado). */
function BlocoNaLinha({
  faixa,
  inicio,
  fim,
  lo,
  hi,
  titulo,
  sub,
  className = '',
  style,
  children,
  ...resto
}: PropsBloco) {
  const a = Math.max(inicio, lo);
  const b = Math.min(fim, hi);
  if (b <= a) return null;
  const topo = topoDe(a, lo);
  const altura = Math.max(18, topoDe(b, lo) - topo);
  return (
    <div
      {...resto}
      style={{ ...FAIXAS[faixa], top: topo, height: altura, ...style }}
      className={`absolute overflow-hidden rounded-lg px-[7px] py-[3px] text-xs leading-[1.25] ${className}`}
    >
      <b className="block truncate font-semibold">{titulo}</b>
      {altura > 32 && sub && <small className="block truncate opacity-80">{sub}</small>}
      {children}
    </div>
  );
}

export function LinhaDoTempo() {
  const agora = useAgora();
  const dados = useLoja(s => s.dados);
  const config = useLoja(s => s.config);
  const dia = useLoja(s => s.dia);
  const resposta = useLoja(s => s.eventos[dia]);
  const arrastada = useLoja(s => s.atividadeArrastada);
  const comecarBloco = useLoja(s => s.comecarBloco);
  const eventos = resposta?.eventos ?? [];

  const editavel = podePlanear(dia);
  const blocos = blocosDoDia(dados, dia);
  const { lo, hi, primeiraHora, altura } = calcularIntervalo(dados, eventos, dia, config, agora);

  const contentor = useRef<HTMLDivElement>(null); // a caixa com scroll
  const interior = useRef<HTMLDivElement>(null); // o conteúdo (as posições contam a partir daqui)
  const faixaPlano = useRef<HTMLDivElement>(null);

  // O arrasto fica num estado (para desenhar) e numa ref (para os eventos lerem sempre o valor mais recente).
  const [arrasto, setArrastoEstado] = useState<Arrasto | null>(null);
  const arrastoRef = useRef<Arrasto | null>(null);
  const setArrasto = (a: Arrasto | null) => {
    arrastoRef.current = a;
    setArrastoEstado(a);
  };
  // O último bloco em que se carregou. Serve para o duplo clique: como a linha do tempo «captura»
  // o rato ao carregar (setPointerCapture), o browser entrega o dblclick à caixa toda e não ao bloco.
  const ultimoBloco = useRef<string | null>(null);
  const [rato, setRato] = useState<number | null>(null); // linha «＋ 14:30»
  const [menu, setMenu] = useState<Menu | null>(null);
  const [previaMenu, setPreviaMenu] = useState<Previa | null>(null);
  const [previaLargar, setPreviaLargar] = useState<Previa | null>(null);

  /** Instante debaixo de uma posição vertical do rato. */
  const instanteNoRato = (clienteY: number) =>
    instanteEm(clienteY - (interior.current?.getBoundingClientRect().top ?? 0), lo);
  const primeiro = () => primeiroInstante(dia);
  const fimDoDia = inicioDoDia(somarDias(dia, 1));

  /** Faz scroll quando se arrasta perto das bordas. */
  function scrollNasBordas(clienteY: number) {
    const el = contentor.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (clienteY < r.top + 36) el.scrollTop -= 12;
    else if (clienteY > r.bottom - 36) el.scrollTop += 12;
  }

  // Ao mudar de dia, faz scroll até «agora» (hoje) ou até ao início do plano (outros dias).
  const scrollFeitoPara = useRef<string | null>(null);
  useLayoutEffect(() => {
    const el = contentor.current;
    if (!el || scrollFeitoPara.current === dia) return;
    scrollFeitoPara.current = dia;
    el.scrollTop =
      dia === hoje()
        ? Math.max(0, topoDe(agora, lo) - 140)
        : Math.max(0, topoDe(inicioDoPlano(dia, config), lo) - 40);
    // (corre a cada segundo por causa de `agora`, mas só faz scroll uma vez por dia)
  }, [dia, lo, config, agora]);

  /* ---------- rato na coluna Plano ---------- */

  function aoCarregar(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !editavel) return;
    const alvo = e.target as HTMLElement;
    const el = alvo.closest<HTMLElement>('[data-uid]');
    ultimoBloco.current = el?.dataset.uid ?? null;
    if (el) {
      const bloco = blocos.find(b => b.uid === el.dataset.uid);
      if (!bloco) return;
      setArrasto({
        modo: alvo.dataset.esticar !== undefined ? 'esticar' : 'mover',
        bloco,
        inicio: bloco.start,
        fim: bloco.end,
        y0: e.clientY,
        mexeu: false
      });
    } else if (alvo === faixaPlano.current || alvo.closest('[data-linha-rato]')) {
      const t = Math.max(primeiro(), encaixar(instanteNoRato(e.clientY)));
      setArrasto({ modo: 'novo', ancora: t, inicio: t, fim: t + ENCAIXE, y0: e.clientY, mexeu: false });
    } else return;
    e.preventDefault();
    setRato(null);
    contentor.current?.setPointerCapture(e.pointerId);
  }

  function aoMover(e: PointerEvent<HTMLDivElement>) {
    const d = arrastoRef.current;
    if (!d) {
      // sem arrasto: mostra a linha «＋ 14:30» por cima da coluna Plano
      const t = encaixar(instanteNoRato(e.clientY));
      setRato(e.target === faixaPlano.current && editavel && !menu && t >= primeiro() ? t : null);
      return;
    }
    if (!d.mexeu && Math.abs(e.clientY - d.y0) < 4) return; // ainda é um clique
    scrollNasBordas(e.clientY);
    if (d.modo === 'novo') {
      // um período novo: vai da âncora (onde se carregou) até ao rato, para cima ou para baixo
      const t = Math.min(fimDoDia, Math.max(primeiro(), encaixar(instanteNoRato(e.clientY))));
      const inicio = Math.min(d.ancora, t);
      const fim = Math.max(d.ancora, t, inicio + ENCAIXE);
      setArrasto({ ...d, mexeu: true, inicio, fim });
    } else if (d.modo === 'mover') {
      const duracao = d.bloco.end - d.bloco.start;
      let s = encaixar(d.bloco.start + ((e.clientY - d.y0) / PX_POR_MINUTO) * MIN);
      s = Math.min(Math.max(s, primeiro(), inicioDoDia(dia)), fimDoDia - duracao);
      setArrasto({ ...d, mexeu: true, inicio: s, fim: s + duracao });
    } else {
      // esticar: só muda o fim
      const fim = Math.min(fimDoDia, Math.max(d.bloco.start + ENCAIXE, encaixar(instanteNoRato(e.clientY))));
      setArrasto({ ...d, mexeu: true, fim });
    }
  }

  function aoLargar(e: PointerEvent<HTMLDivElement>) {
    const d = arrastoRef.current;
    if (!d) return;
    setArrasto(null);
    if (d.modo === 'novo') {
      // só um clique: a duração vem da atividade escolhida; um período muito curto passa a 10 min
      const fim = !d.mexeu ? null : d.fim - d.inicio < 10 * MIN ? d.inicio + 10 * MIN : d.fim;
      setPreviaMenu({
        inicio: d.inicio,
        fim: fim ?? fimQueCabe(dados, eventos, dia, d.inicio, 30),
        rotulo: 'Novo bloco'
      });
      setMenu({ tipo: 'novo', x: e.clientX, y: e.clientY, inicio: d.inicio, fim });
    } else if (d.mexeu) alterarBloco(dia, d.bloco.uid, { start: d.inicio, end: d.fim });
    else setMenu({ tipo: 'bloco', x: e.clientX, y: e.clientY, uid: d.bloco.uid });
  }

  /** Duplo clique num bloco de hoje que ainda não acabou: começa-o. */
  function aoDuploClique() {
    const bloco = blocos.find(b => b.uid === ultimoBloco.current);
    if (bloco && dia === hoje() && bloco.end > agora) {
      fecharMenu();
      comecarBloco(bloco);
    }
  }

  function fecharMenu() {
    setMenu(null);
    setPreviaMenu(null);
  }

  /* ---------- largar um cartão de atividade ---------- */

  /** Onde fica um bloco largado: começa um pouco acima do rato e encurta para não sobrepor. */
  function sitioParaLargar(clienteY: number, id: number) {
    const a = atividadePorId(dados, id)!;
    const inicio = Math.max(primeiro(), encaixar(instanteNoRato(clienteY) - 10 * MIN));
    const fim = fimQueCabe(dados, eventos, dia, inicio, duracaoDeBlocoNovo(dados, config, a, dia));
    return { inicio, fim, cor: corDe(a), rotulo: a.name };
  }

  function aoArrastarPorCima(e: DragEvent) {
    if (arrastada == null || !editavel) return;
    e.preventDefault(); // sem isto o browser não deixa largar
    e.dataTransfer.dropEffect = 'copy';
    scrollNasBordas(e.clientY);
    setPreviaLargar(sitioParaLargar(e.clientY, arrastada));
  }

  function aoLargarCartao(e: DragEvent) {
    if (arrastada == null || !editavel) return;
    e.preventDefault();
    const { inicio, fim } = sitioParaLargar(e.clientY, arrastada);
    adicionarBloco(dia, arrastada, inicio, fim);
    setPreviaLargar(null);
    terminarArrastoDeAtividade();
  }

  /* ---------- desenho ---------- */

  const previa: Previa | null =
    arrasto?.modo === 'novo' && arrasto.mexeu
      ? { inicio: arrasto.inicio, fim: arrasto.fim, rotulo: 'Novo bloco' }
      : menu?.tipo === 'novo'
        ? previaMenu
        : arrastada != null
          ? previaLargar
          : null;
  const blocoDoMenu = menu?.tipo === 'bloco' ? blocos.find(b => b.uid === menu.uid) : undefined;

  return (
    <>
      <div
        ref={contentor}
        onPointerDown={aoCarregar}
        onPointerMove={aoMover}
        onPointerUp={aoLargar}
        onPointerCancel={() => setArrasto(null)}
        onPointerLeave={() => !arrastoRef.current && setRato(null)}
        onDragOver={aoArrastarPorCima}
        onDragLeave={e => !contentor.current?.contains(e.relatedTarget as Node) && setPreviaLargar(null)}
        onDrop={aoLargarCartao}
        onDoubleClick={aoDuploClique}
        className="relative h-[min(70vh,760px)] overflow-y-auto border-t border-line [scrollbar-width:thin]"
      >
        <div ref={interior} className="relative" style={{ height: altura }}>
          {/* linhas das horas */}
          {Array.from({ length: 25 - primeiraHora }, (_, i) => (
            <div
              key={i}
              className="absolute inset-x-0 border-t border-[color-mix(in_srgb,var(--line)_70%,transparent)]"
              style={{ top: i * 60 * PX_POR_MINUTO }}
            >
              <span className="absolute top-0.5 left-1 font-num text-[11px] text-faint">
                {doisDigitos((primeiraHora + i) % 24)}:00
              </span>
            </div>
          ))}

          {/* a coluna Plano (zona onde se clica e onde se larga) */}
          <div
            ref={faixaPlano}
            title={editavel ? 'Clica ou arrasta para planear' : undefined}
            style={FAIXAS.plano}
            className={`absolute inset-y-0 rounded-lg ${
              editavel ? 'cursor-copy hover:bg-[color-mix(in_srgb,var(--accent)_4%,transparent)]' : ''
            } ${
              arrastada != null && editavel
                ? 'bg-[color-mix(in_srgb,var(--accent)_7%,transparent)] outline-[1.5px] -outline-offset-2 outline-[color-mix(in_srgb,var(--accent)_50%,transparent)] outline-dashed'
                : ''
            }`}
          />

          {/* Agenda: compromissos */}
          {eventos
            .filter(e => !e.diaTodo)
            .map(e => (
              <BlocoNaLinha
                key={'e' + e.inicio + e.titulo}
                faixa="agenda"
                inicio={e.inicio}
                fim={e.fim}
                lo={lo}
                hi={hi}
                titulo={e.titulo}
                sub={`${horaMinuto(e.inicio)}–${horaMinuto(e.fim)}${e.local ? ' · ' + e.local : ''}`}
                title={`${e.titulo} (${e.calendario})`}
                className={`border-l-[3px] border-evb bg-ev ${e.livre ? 'opacity-55' : ''}`}
                style={e.cor ? { borderLeftColor: e.cor } : undefined}
              />
            ))}

          {/* Feito: registo e o bloco a correr */}
          {dados.log.map(b => {
            const a = atividadePorId(dados, b.id);
            return (
              <BlocoNaLinha
                key={b.uid}
                faixa="feito"
                inicio={b.start}
                fim={b.end}
                lo={lo}
                hi={hi}
                titulo={a?.name ?? '(removida)'}
                sub={`${horaMinuto(b.start)}–${horaMinuto(b.end)}`}
                className="bg-[color-mix(in_srgb,var(--c)_85%,transparent)] text-white"
                style={{ '--c': corDe(a) } as CSSProperties}
              />
            );
          })}
          {dados.run && (
            <BlocoNaLinha
              faixa="feito"
              inicio={dados.run.start}
              fim={agora}
              lo={lo}
              hi={hi}
              titulo={atividadePorId(dados, dados.run.id)?.name ?? ''}
              sub="a correr…"
              className="animate-brilho bg-[repeating-linear-gradient(-45deg,var(--c)_0_8px,color-mix(in_srgb,var(--c)_80%,#fff)_8px_16px)] text-white"
              style={{ '--c': corDe(atividadePorId(dados, dados.run.id)) } as CSSProperties}
            />
          )}

          {/* Plano */}
          {blocos.map(b => {
            const a = atividadePorId(dados, b.id);
            if (!a) return null;
            const aMexer = arrasto && arrasto.modo !== 'novo' && arrasto.bloco.uid === b.uid && arrasto.mexeu;
            const inicio = aMexer ? arrasto.inicio : b.start;
            const fim = aMexer ? arrasto.fim : b.end;
            return (
              <BlocoNaLinha
                key={b.uid}
                faixa="plano"
                inicio={inicio}
                fim={fim}
                lo={lo}
                hi={hi}
                titulo={a.name}
                sub={`${horaMinuto(inicio)}–${horaMinuto(fim)} · ${curto(fim - inicio)}`}
                data-uid={b.uid}
                tabIndex={0}
                title={
                  `${a.name} · ${horaMinuto(b.start)}–${horaMinuto(b.end)}` +
                  (editavel
                    ? '\nArrasta para mover · puxa a base para mudar a duração · clica para opções'
                    : '')
                }
                onKeyDown={e => {
                  if (!editavel) return;
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    apagarBloco(dia, b.uid);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const r = e.currentTarget.getBoundingClientRect();
                    setMenu({ tipo: 'bloco', x: r.right, y: r.top + 20, uid: b.uid });
                  }
                }}
                style={{ '--c': corDe(a) } as CSSProperties}
                className={`group z-[1] border-[1.5px] border-dashed border-[var(--c)] bg-[color-mix(in_srgb,var(--c)_9%,var(--surface))] text-[color-mix(in_srgb,var(--c)_75%,var(--ink))] outline-none select-none hover:bg-[color-mix(in_srgb,var(--c)_18%,var(--surface))] focus-visible:bg-[color-mix(in_srgb,var(--c)_18%,var(--surface))] ${
                  editavel ? 'cursor-grab touch-none' : 'cursor-pointer'
                } ${b.end < agora ? 'opacity-45' : ''} ${
                  aMexer ? 'z-[4] cursor-grabbing border-solid shadow-[0_8px_24px_#0003]' : ''
                }`}
              >
                {/* pega na base do bloco para esticar */}
                {editavel && (
                  <i
                    data-esticar
                    className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize after:absolute after:bottom-0.5 after:left-1/2 after:-ml-[9px] after:h-[3px] after:w-[18px] after:rounded-sm after:bg-[var(--c)] after:opacity-0 after:transition-opacity group-hover:after:opacity-60"
                  />
                )}
              </BlocoNaLinha>
            );
          })}

          {/* pré-visualização de um bloco novo */}
          {previa && (
            <BlocoNaLinha
              faixa="plano"
              inicio={previa.inicio}
              fim={previa.fim}
              lo={lo}
              hi={hi}
              titulo={previa.rotulo}
              sub={`${horaMinuto(previa.inicio)}–${horaMinuto(previa.fim)} · ${curto(previa.fim - previa.inicio)}`}
              style={{ '--c': previa.cor ?? 'var(--accent)' } as CSSProperties}
              className="pointer-events-none z-[3] border-[1.5px] border-dashed border-[var(--c)] bg-[color-mix(in_srgb,var(--c)_20%,var(--surface))] text-ink"
            />
          )}

          {/* linha «＋ 14:30» ao passar o rato */}
          {rato != null && !arrasto && (
            <div
              data-linha-rato
              className="pointer-events-none absolute z-[2] border-t-[1.5px] border-dashed border-accent"
              style={{ ...FAIXAS.plano, top: topoDe(rato, lo) }}
            >
              <span className="absolute top-0.5 left-1 rounded bg-surface px-1 text-[11.5px] font-semibold text-accent">
                ＋ {horaMinuto(rato)}
              </span>
            </div>
          )}

          {/* linha do «agora» */}
          {dia === hoje() && (
            <div
              className="absolute right-0 left-[46px] z-[2] border-t-2 border-warn before:absolute before:-top-[5px] before:-left-[5px] before:size-2 before:rounded-full before:bg-warn"
              style={{ top: topoDe(agora, lo) }}
            />
          )}
        </div>
      </div>

      {menu?.tipo === 'novo' && (
        <MenuNovoBloco
          x={menu.x}
          y={menu.y}
          dia={dia}
          inicio={menu.inicio}
          fim={menu.fim}
          aoFechar={fecharMenu}
          aoPrever={setPreviaMenu}
        />
      )}
      {blocoDoMenu && menu && (
        <MenuBloco x={menu.x} y={menu.y} dia={dia} bloco={blocoDoMenu} aoFechar={fecharMenu} />
      )}
    </>
  );
}
