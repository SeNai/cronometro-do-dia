/*
 * Secção «Escrever no Google Calendar» das Definições:
 * estado da ligação, carregar as credenciais, ligar e desligar a conta.
 *
 * O interruptor «Enviar cada bloco feito…» faz parte do rascunho das Definições
 * (só fica gravado ao carregar em Guardar), por isso vem de fora (`escrever`).
 */
import { useEffect, useRef, type ChangeEvent, type ReactNode } from 'react';
import { ErroApi, desligarGoogle, enviarCredenciaisGoogle, ligarGoogle } from '../../api';
import { avisar, confirmar } from '../../estado/avisos';
import { useLoja } from '../../estado/loja';
import { horaMinuto } from '../../lib/tempo';
import { Botao } from '../ui/Botao';

interface Props {
  escrever: boolean;
  aoMudarEscrever: (v: boolean) => void;
}

const mensagemDeErro = (e: unknown) => (e instanceof ErroApi || e instanceof Error ? e.message : String(e));

export function SeccaoGoogle({ escrever, aoMudarEscrever }: Props) {
  const g = useLoja(s => s.google);
  const ficheiro = useRef<HTMLInputElement>(null);

  // enquanto a autorização decorre no browser, pergunta o estado a cada 2 s
  const aLigar = !!g?.a_ligar;
  useEffect(() => {
    if (!aLigar) return;
    const id = setInterval(async () => {
      await useLoja.getState().carregarGoogle();
      const novo = useLoja.getState().google;
      if (!novo?.a_ligar && novo?.ligado) {
        aoMudarEscrever(true);
        avisar('Conta Google ligada ✓');
      }
    }, 2000);
    return () => clearInterval(id);
  }, [aLigar, aoMudarEscrever]);

  async function carregarCredenciais(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      useLoja.setState({ google: await enviarCredenciaisGoogle(JSON.parse(await f.text())) });
      avisar('Credenciais guardadas. Agora carrega em «Ligar conta Google».');
    } catch (err) {
      const msg = err instanceof SyntaxError ? 'Esse ficheiro não é um JSON válido.' : mensagemDeErro(err);
      avisar(msg, { tipo: 'alerta', duracao: 10_000 });
    }
  }

  async function ligar() {
    try {
      useLoja.setState({ google: await ligarGoogle() });
    } catch (err) {
      avisar(mensagemDeErro(err), { tipo: 'alerta' });
    }
  }

  async function desligar() {
    if (!(await confirmar('Desligar a conta Google? Os blocos já enviados ficam lá.'))) return;
    try {
      useLoja.setState({ google: await desligarGoogle() });
      aoMudarEscrever(false);
    } catch (err) {
      avisar(mensagemDeErro(err), { tipo: 'alerta' });
    }
  }

  let estado: ReactNode;
  if (!g) estado = 'Não consegui falar com a app.';
  else if (!g.disponivel)
    estado = (
      <>
        ⚠ Faltam bibliotecas. Fecha a app e volta a abri-la pelo atalho (instala sozinha), ou corre{' '}
        <code>pip install -r servidor/requirements.txt</code>.
      </>
    );
  else if (g.a_ligar) estado = '⏳ À espera que autorizes no browser…';
  else if (!g.credenciais)
    estado = (
      <>
        <b>Passo 1:</b> carrega o ficheiro de credenciais (vê as instruções em baixo).
      </>
    );
  else if (!g.ligado)
    estado = (
      <>
        <b>Passo 2:</b> carrega em «Ligar conta Google».
      </>
    );
  else
    estado = (
      <>
        ✓ Conta ligada.
        {g.escrever
          ? ' Os blocos vão para o calendário «Cronómetro do Dia».'
          : ' Ativa a opção abaixo para enviar os blocos.'}
        {g.ultimo > 0 && <span className="text-mute"> Último envio às {horaMinuto(g.ultimo)}.</span>}
      </>
    );

  return (
    <div className="rounded-[14px] border border-line bg-surface2 px-3.5 py-3">
      <div className="text-[13px]">
        {estado}
        {g?.erro && <div className="mt-1 text-warn">⚠ {g.erro}</div>}
      </div>
      <label className="my-2 flex items-center gap-2.5">
        <span className="flex-1 text-sm">Enviar cada bloco feito para o calendário «Cronómetro do Dia»</span>
        <input
          type="checkbox"
          checked={escrever}
          disabled={!g?.ligado}
          onChange={e => aoMudarEscrever(e.target.checked)}
          className="size-[18px] accent-[var(--accent)]"
        />
      </label>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <Botao pequeno onClick={() => ficheiro.current?.click()}>
          📄 Carregar credenciais (.json)
        </Botao>
        <input
          ref={ficheiro}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={carregarCredenciais}
        />
        {g?.disponivel && g.credenciais && !g.a_ligar && (
          <Botao variante="principal" pequeno onClick={ligar}>
            {g.ligado ? 'Ligar outra vez' : 'Ligar conta Google'}
          </Botao>
        )}
        {g?.ligado && (
          <Botao variante="fantasma" pequeno onClick={desligar}>
            Desligar
          </Botao>
        )}
      </div>
      <details className="my-2.5 text-[13px] text-mute">
        <summary className="cursor-pointer text-ink">Como obter as credenciais (só uma vez, ~5 min)</summary>
        <ol className="my-2 list-decimal pl-5 [&>li]:my-1">
          <li>
            Abre <b>console.cloud.google.com</b> e cria um projeto (ex.: «Cronometro»).
          </li>
          <li>
            Em <i>APIs e serviços → Biblioteca</i>, procura <b>Google Calendar API</b> e carrega em{' '}
            <i>Ativar</i>.
          </li>
          <li>
            Em <i>Google Auth Platform</i> (ecrã de consentimento OAuth): tipo <b>Externo</b>, nome da app e o
            teu email. Em <i>Público-alvo</i> carrega em <b>Publicar app</b> (se a deixares em «Teste», a
            ligação expira a cada 7 dias).
          </li>
          <li>
            Em <i>Clientes</i> → <b>Criar cliente</b> → tipo <b>App para computador</b> → transfere o ficheiro
            JSON.
          </li>
          <li>
            Aqui: <b>Carregar credenciais</b> → escolhe esse ficheiro → <b>Ligar conta Google</b>. O Google
            avisa que a app não está verificada: carrega em <i>Avançadas → Ir para …</i> (é a tua própria
            app).
          </li>
        </ol>
        A app só pede acesso aos calendários que ela própria cria: não consegue ver nem alterar o resto da tua
        agenda. Não juntes o calendário «Cronómetro do Dia» à lista de cima, senão os blocos aparecem em
        duplicado.
      </details>
    </div>
  );
}
