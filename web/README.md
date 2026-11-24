# web/ — nova interface (React + TypeScript + Vite + Tailwind)

Em construção (fase 2 do roadmap). Fala com o servidor Python que já existe, sem o mudar.

## Como correr

Nesta pasta:
```
npm install      # só na primeira vez
npm run dev      # abre em http://localhost:5173
```
O `npm run dev` liga também o servidor Python (porta 8765) se ele não estiver a correr,
e mantém-no ligado enquanto o Vite estiver aberto (ver `scripts/dev.mjs`).

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor Python + interface em modo de desenvolvimento (atualiza sozinha a cada alteração) |
| `npm run dev:vite` | Só o Vite (o servidor Python tem de estar ligado à parte) |
| `npm run build` | Verifica os tipos e gera a versão final em `dist/` |
| `npm run lint` | Procura erros comuns (oxlint) |
| `npm run format` | Formata o código (Prettier, regras em `../.prettierrc.json`) |

## Estrutura

```
src/
  main.tsx              ponto de entrada (desenha o App dentro de <div id="root">)
  App.tsx               componente principal: carrega os dados e monta o ecrã
  index.css             Tailwind + cores da app (tema claro/escuro)
  tipos.ts              tipos dos dados (o que o servidor devolve e grava)
  api.ts                funções para falar com o servidor Python
  lib/                  lógica pura (sem React): fácil de ler e de testar
    tempo.ts            datas e formatação de tempos
    consultas.ts        perguntas sobre os dados (cor, tempo feito, duração sugerida…)
    migracoes.ts        arruma dados de versões antigas
    roda.ts             geometria e textos da roda
    tempoEscrito.ts     o campo onde se escreve o tempo (algarismos que entram pela direita)
    sons.ts             os sons dos avisos (sintetizados com Web Audio)
    plano.ts            o plano de cada dia: metas que faltam, onde cabe um bloco, «Preencher o dia»,
                        encher um dia com a semana ativa
    linhaDoTempo.ts     geometria da linha do tempo (faixas, píxeis por minuto, intervalo de horas)
    planos.ts           planos guardados: planos do dia e semanas (resumos, converter para um dia, encaixar)
  estado/               estado partilhado
    loja.ts             a «loja» (Zustand): dados, definições e ações (começar, parar…); grava sozinha
    useAgora.ts         relógio partilhado que atualiza a cada segundo
    useTituloDaJanela.ts  o tempo no título da janela
    avisos.ts           avisar() (mensagens no canto) e confirmar() («Tens a certeza?»)
    notificar.ts        aviso importante: som + aviso laranja + notificação do Windows
    useAlertas.ts       avisos automáticos (fim do tempo, compromissos, blocos do plano)
    useCalendarios.ts   lê os compromissos (hoje e o dia mostrado) no arranque e a cada 5 minutos
    useAtalhos.ts       teclas 1–9 (começar) e Espaço (parar)
    acoesPlano.ts       ações do plano (juntar, mover, apagar, preencher, limpar — com «Desfazer»)
                        e a navegação entre dias (irPara)
    acoesPlanos.ts      planos guardados: aplicar a um dia, semana ativa, criar, mudar, copiar,
                        duplicar e apagar (com «Desfazer»), separador mostrado
  componentes/
    ui/Botao.tsx        botão base (normal, principal, parar, fantasma)
    ui/Avisos.tsx       desenha os avisos e a janela de confirmação
    ui/Cartao.tsx       cartão base (título em maiúsculas + botões à direita)
    ui/MenuFlutuante.tsx  menu que aparece junto ao rato (fecha ao clicar fora / Esc; teclas 1–9)
    topo/               Topo (barra fixa com ‹ Hoje ›), BarraLateral (separadores), BotaoSom (🔊/🔇)
                        e BotaoNotificacoes (🔔)
    linha-do-tempo/     CartaoLinhaDoTempo, LinhaDoTempo (desenho e rato), MenusDoPlano,
                        ListaAtividades, ResumoPlano (chips das metas) e MenuPlanos («📋 Planos»)
    planos/             SeparadorPlanos (listas + editor), EditorPlano (cabeçalho, paleta, dias),
                        GrelhaPlano (a grelha e o rato), MenusGrelha e PontosAtividades
    agenda/             CartaoAgenda («Agenda de hoje»)
    roda/               cartão da roda: Roda, EditorTempo, NomeAtividade, MetaDoDia,
                        OutraACorrer, ASeguir e CartaoRoda (junta tudo)
    atividades/         CartaoAtividades (a grelha e o ✎ Editar), CartaoAtividade (um cartão),
                        LinhaEdicao (uma linha no modo de edição), SeletorMeta ([−] 90 min [+])
scripts/dev.mjs         o que o `npm run dev` corre (servidor Python + Vite)
vite.config.ts          configuração do Vite (reencaminha /api para o servidor Python)
```

**Cuidado com os seletores do Zustand:** `useLoja(s => …)` tem de devolver o mesmo valor
enquanto nada muda. Nunca escrevas `useLoja(s => s.algo ?? [])`: o `[]` é novo a cada chamada
e o React entra num ciclo infinito. Lê `s.algo` e põe o `?? []` fora do seletor.

**Regra de ouro:** a lógica vai para `lib/` (funções puras) ou para as ações da `loja.ts`;
os componentes só mostram dados e chamam ações.
