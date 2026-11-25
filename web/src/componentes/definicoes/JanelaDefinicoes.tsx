/*
 * Janela das Definições: calendários, Google, comportamento, planos e sons.
 *
 * As mudanças ficam num «rascunho» (estado local) e só são gravadas ao carregar em Guardar;
 * Cancelar (ou Esc) deita o rascunho fora.
 */
import { useCallback, useState, type ReactNode } from 'react';
import { mudarVista } from '../../estado/acoesPlanos';
import { avisar } from '../../estado/avisos';
import { useLoja } from '../../estado/loja';
import { SONS, tocarSom, type TipoSom } from '../../lib/sons';
import { hoje } from '../../lib/tempo';
import type { CalendarioConfig, Config, NomeSom } from '../../tipos';
import { Botao } from '../ui/Botao';
import { Janela } from '../ui/Janela';
import { SeccaoGoogle } from './SeccaoGoogle';

const Titulo = ({ children }: { children: ReactNode }) => (
  <h3 className="mt-5 mb-2 text-[13px] tracking-[0.04em] text-mute uppercase">{children}</h3>
);

/** Uma linha «texto à esquerda, controlo à direita». */
const Campo = ({ rotulo, children }: { rotulo: ReactNode; children: ReactNode }) => (
  <label className="my-[9px] flex items-center gap-2.5">
    <span className="flex-1 text-sm">{rotulo}</span>
    {children}
  </label>
);

const estiloEntrada = 'rounded-[9px] border border-line bg-surface2 px-[9px] py-1.5 text-ink';
const estiloTexto = 'min-w-0 rounded-[10px] border border-line bg-surface2 px-[11px] py-2 text-ink';

export function JanelaDefinicoes() {
  const config = useLoja(s => s.config);
  const alterarConfig = useLoja(s => s.alterarConfig);
  const fechar = () => useLoja.setState({ definicoesAbertas: false });

  // rascunho: começa com as definições atuais (e pelo menos uma linha de calendário vazia)
  const [r, setR] = useState<Config>(() => ({
    ...config,
    calendarios: config.calendarios.length ? config.calendarios.map(c => ({ ...c })) : [{ nome: '', url: '' }]
  }));
  const mudar = <K extends keyof Config>(k: K, v: Config[K]) => setR(x => ({ ...x, [k]: v }));
  const mudarEscrever = useCallback((v: boolean) => setR(x => ({ ...x, google_escrever: v })), []);
  const mudarCalendario = (i: number, campos: Partial<CalendarioConfig>) =>
    mudar(
      'calendarios',
      r.calendarios.map((c, j) => (j === i ? { ...c, ...campos } : c))
    );

  /** Pré-ouvir um som com o volume do rascunho. */
  const ouvir = (tipo: TipoSom, som?: NomeSom) =>
    tocarSom(tipo, r, { mudo: false, volume: r.som_volume, som: som ?? r[`som_${tipo}`] });

  async function guardar() {
    const novas: Config = {
      ...r,
      calendarios: r.calendarios
        .map(c => ({ nome: c.nome.trim(), url: c.url.trim(), cor: c.cor }))
        .filter(c => c.url),
      aviso_minutos: Math.max(0, r.aviso_minutos || 0),
      inicio_do_dia: r.inicio_do_dia || '08:00',
      fim_do_dia: r.fim_do_dia || '23:00',
      bloco_max_min: Math.max(10, r.bloco_max_min || 45)
    };
    if (!(await alterarConfig(novas))) return;
    fechar();
    avisar('Definições guardadas.');
    // os calendários podem ter mudado: volta a lê-los (sem cache)
    const { dia, carregarEventos, carregarGoogle } = useLoja.getState();
    carregarEventos(hoje(), true);
    if (dia !== hoje()) carregarEventos(dia, true);
    carregarGoogle();
  }

  const somDesligado = r.som_mudo || !r.som_volume;

  return (
    <Janela aoFechar={fechar} rotulo="Definições">
      <h2 className="mb-1 text-xl font-semibold">Definições</h2>

      <Titulo>Calendários para ler</Titulo>
      {r.calendarios.map((c, i) => (
        <div key={i} className="my-1.5 flex items-center gap-1.5">
          <input
            type="color"
            title="Cor"
            value={c.cor ?? '#3b6ea8'}
            onChange={e => mudarCalendario(i, { cor: e.target.value })}
            className="size-8 flex-none cursor-pointer border-none bg-transparent p-0"
          />
          <input
            placeholder="Nome (ex.: Pessoal)"
            aria-label="Nome do calendário"
            value={c.nome}
            onChange={e => mudarCalendario(i, { nome: e.target.value })}
            className={`${estiloTexto} w-[130px] flex-none`}
          />
          <input
            placeholder="Link .ics / webcal://…"
            aria-label="Link do calendário"
            value={c.url}
            onChange={e => mudarCalendario(i, { url: e.target.value })}
            className={`${estiloTexto} flex-1`}
          />
          <button
            type="button"
            title="Remover"
            onClick={() =>
              mudar(
                'calendarios',
                r.calendarios.filter((_, j) => j !== i)
              )
            }
            className="cursor-pointer rounded-md px-1.5 py-0.5 text-faint hover:bg-surface2 hover:text-warn"
          >
            ✕
          </button>
        </div>
      ))}
      <Botao pequeno onClick={() => mudar('calendarios', [...r.calendarios, { nome: '', url: '' }])}>
        + Adicionar calendário
      </Botao>
      <details className="my-2.5 text-[13px] text-mute">
        <summary className="cursor-pointer text-ink">Onde encontro o link do meu calendário?</summary>
        <ul className="my-2 list-disc pl-5 [&>li]:my-1">
          <li>
            <b>Google Calendar</b> (no computador): ⚙ Definições → escolhe o calendário à esquerda →{' '}
            <i>Integrar calendário</i> → copia o <i>Endereço secreto no formato iCal</i>.
          </li>
          <li>
            <b>Outlook / Microsoft 365</b>: Definições → Calendário → Calendários partilhados →{' '}
            <i>Publicar um calendário</i> → copia o link <i>ICS</i>.
          </li>
          <li>
            <b>iCloud (Apple)</b>: partilha o calendário como <i>Calendário público</i> e copia o link (começa
            por webcal://).
          </li>
          <li>
            Também podes pôr ficheiros <b>.ics</b> na pasta <code>dados/calendarios</code> da app.
          </li>
        </ul>
        O link é secreto: quem o tiver consegue ver a tua agenda. Fica guardado só no teu computador.
      </details>

      <Titulo>Escrever no Google Calendar</Titulo>
      <SeccaoGoogle escrever={r.google_escrever} aoMudarEscrever={mudarEscrever} />

      <Titulo>Comportamento</Titulo>
      <Campo rotulo="Pausar quando começa um compromisso">
        <input
          type="checkbox"
          checked={r.pausar_em_eventos}
          onChange={e => mudar('pausar_em_eventos', e.target.checked)}
          className="size-[18px] accent-[var(--accent)]"
        />
      </Campo>
      <Campo rotulo="Parar sozinho quando o tempo da roda acaba">
        <input
          type="checkbox"
          checked={r.parar_no_fim}
          onChange={e => mudar('parar_no_fim', e.target.checked)}
          className="size-[18px] accent-[var(--accent)]"
        />
      </Campo>
      <Campo rotulo="Avisar antes de compromissos (minutos)">
        <input
          type="number"
          min={0}
          max={120}
          value={r.aviso_minutos}
          onChange={e => mudar('aviso_minutos', +e.target.value)}
          className={`${estiloEntrada} w-[110px]`}
        />
      </Campo>
      <Campo rotulo="Início do dia para o plano (dias que ainda não começaram)">
        <input
          type="time"
          value={r.inicio_do_dia}
          onChange={e => mudar('inicio_do_dia', e.target.value)}
          className={`${estiloEntrada} w-[110px]`}
        />
      </Campo>
      <Campo rotulo="Fim do dia para o plano">
        <input
          type="time"
          value={r.fim_do_dia}
          onChange={e => mudar('fim_do_dia', e.target.value)}
          className={`${estiloEntrada} w-[110px]`}
        />
      </Campo>
      <Campo rotulo="Bloco máximo no plano (min)">
        <input
          type="number"
          min={10}
          max={240}
          step={5}
          value={r.bloco_max_min}
          onChange={e => mudar('bloco_max_min', +e.target.value)}
          className={`${estiloEntrada} w-[110px]`}
        />
      </Campo>

      <Titulo>Planos e semanas</Titulo>
      <div className="my-[9px] flex items-center gap-2.5">
        <span className="flex-1 text-sm">
          Prepara planos para um dia e programas para a semana inteira no separador <b>Planos</b>.
        </span>
        <Botao
          pequeno
          onClick={() => {
            fechar();
            mudarVista('planos');
          }}
        >
          Abrir Planos
        </Botao>
      </div>

      <Titulo>Sons</Titulo>
      <div className="my-[9px] flex items-center gap-2.5">
        <span className="flex-1 text-sm">Volume</span>
        <Botao
          variante="fantasma"
          pequeno
          className="min-w-[34px]"
          title={r.som_mudo ? 'Voltar a ligar os sons' : 'Silenciar'}
          onClick={() => {
            const ligar = r.som_mudo;
            const volume = ligar && !r.som_volume ? 50 : r.som_volume;
            setR(x => ({ ...x, som_mudo: !ligar, som_volume: volume }));
            if (ligar) tocarSom('fim', r, { mudo: false, volume });
          }}
        >
          {somDesligado ? '🔇' : r.som_volume < 40 ? '🔈' : '🔊'}
        </Botao>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          aria-label="Volume"
          value={r.som_volume}
          onChange={e => setR(x => ({ ...x, som_volume: +e.target.value, som_mudo: false }))}
          onPointerUp={() => ouvir('fim')}
          className={`w-[150px] accent-[var(--accent)] ${r.som_mudo ? 'opacity-40' : ''}`}
        />
        <span
          className={`w-10 text-right font-num text-[13px] text-mute tabular-nums ${r.som_mudo ? 'opacity-40' : ''}`}
        >
          {r.som_mudo ? 'mudo' : r.som_volume + '%'}
        </span>
      </div>
      {(
        [
          ['fim', 'Quando acaba o tempo de uma atividade'],
          ['aviso', 'Avisos de compromissos da agenda'],
          ['plano', 'Hora de começar um bloco do plano']
        ] as const
      ).map(([tipo, rotulo]) => (
        <div key={tipo} className="my-[9px] flex items-center gap-2.5">
          <span className="flex-1 text-sm">{rotulo}</span>
          <select
            aria-label={rotulo}
            value={r[`som_${tipo}`]}
            onChange={e => {
              const som = e.target.value as NomeSom;
              mudar(`som_${tipo}`, som);
              ouvir(tipo, som);
            }}
            className={`${estiloEntrada} w-[170px]`}
          >
            {Object.entries(SONS).map(([k, nome]) => (
              <option key={k} value={k}>
                {nome}
              </option>
            ))}
          </select>
          <Botao
            variante="fantasma"
            pequeno
            title="Ouvir"
            className="min-w-[34px]"
            onClick={() => ouvir(tipo)}
          >
            ▶
          </Botao>
        </div>
      ))}

      <div className="mt-[18px] flex justify-end gap-2">
        <Botao onClick={fechar}>Cancelar</Botao>
        <Botao variante="principal" onClick={guardar}>
          Guardar
        </Botao>
      </div>
    </Janela>
  );
}
