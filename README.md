# ⏱ Cronómetro do Dia

App que corre no teu computador para cronometrares as partes do dia (candidaturas, aprender, jogar, estudar…). Vê o teu calendário para saber o que está marcado e pode escrever no Google Calendar o que fizeste.

## O que faz

- **Roda do cronómetro**: arrastas o botão à volta da roda para escolher quanto tempo queres dar a um bloco (0–120 min). A roda vai enchendo enquanto o tempo corre e avisa-te quando acaba. Com a roda no 0, o cronómetro corre sem limite. Também podes arrastar a roda com o bloco a correr, para dar mais ou menos tempo.
  Para um tempo exato, **clica nos números grandes** e escreve só os algarismos. Eles entram pela direita: 6, 3, 4 dá `06:34`. Depois carrega em Enter.
  As setas ↑ ↓ somam ou tiram 1 minuto e, com Shift, 1 segundo. Com o cronómetro a correr, o que escreves é **quanto falta**. Esc cancela e `00:00` tira o limite.
- **Mudar o nome**: clica no nome da atividade por baixo da roda, escreve e carrega em Enter. O nome muda em todo o lado.
- **Atividades**: um clique escolhe a atividade, e com duplo clique (ou no botão Começar, ou nas teclas 1–9) começas a contar. A anterior para sozinha, e a tecla Espaço para tudo. Em **✎ Editar** mudas o nome, a cor e a meta diária.
- **Metas em minutos**: cada atividade mostra quanto já fizeste hoje e quanto falta.
- **Agenda de hoje**: o que tens marcado, o próximo compromisso e quanto tempo livre tens até lá.
- **Avisos**: uns minutos antes de cada compromisso. Quando ele começa, o cronómetro é pausado.
- **Sons**: em ⚙ Definições → *Sons* escolhes o volume e o som de cada aviso: fim do tempo de uma atividade, compromissos e blocos do plano. Há 6 sons, e o botão ▶ deixa-te ouvir cada um. O botão 🔊 no topo silencia tudo com um clique.
- **Planear na linha do tempo** (hoje ou outro dia, escolhido com as setas ‹ › no topo):
  - **arrasta uma atividade** para a coluna **Plano**;
  - ou **clica** na coluna Plano (ou clica e arrasta para marcar um período) e escolhe a atividade (teclas 1–9).
  - Os blocos do plano **arrastam-se** para mudar a hora e **esticam-se** pela base. Se clicares num, podes mudar a duração ou a atividade, duplicá-lo, apagá-lo ou começá-lo. Com duplo clique, ele começa logo. A tecla Delete apaga o bloco que estiver selecionado.
  - Por cima da linha do tempo vês quanto de cada meta já está feito e planeado.
- **✨ Preencher o dia**: encaixa o que falta de cada meta nos espaços livres. Os blocos que já puseste à mão ficam onde estão. Num dia que ainda não começou, o plano começa à hora definida em Definições → *Início do dia*.
- **Separador Planos** (na barra lateral): aqui preparas o tempo com antecedência, sem mexer no dia de hoje.
  - **Semanas**: uma grelha de segunda a domingo. Arrastas as atividades para cada dia, ou clicas num espaço vazio da grelha (também podes clicar e arrastar) e escolhes a atividade.
    Os blocos movem-se, mudam de dia e esticam-se pela base. O **⋯** de cada dia serve para usar um plano do dia, copiar esse dia para os dias úteis, para todos ou para o fim de semana, guardá-lo como plano do dia ou limpá-lo.
  - **Planos do dia**: um dia-modelo, por exemplo «Dia de estudo», que aplicas a qualquer dia.
  - **Ativar uma semana**: cada dia que ainda não tem plano recebe o programa desse dia da semana. Depois podes mudar o plano desse dia à vontade.
- **📋 Planos na linha do tempo**: aplica um plano do dia (ou o dia da semana ativa) ao dia que estás a ver, ou escolhe qual é a semana ativa. Se o dia já tiver blocos, escolhes entre *Substituir* e *Juntar*.
- **Linha do tempo**, **resumo do dia**, **últimos 7 dias** e o histórico de qualquer dia.
- **Google Calendar**: se quiseres, cada bloco feito vai para um calendário teu chamado «Cronómetro do Dia».

Os dados ficam em `dados.json`, nesta pasta.

## Instalar (só na primeira vez)

1. Instala o **Python 3** a partir de https://www.python.org/downloads/
   No Windows, marca a opção **"Add python.exe to PATH"** durante a instalação.
2. Instala o **Node.js** (versão LTS) a partir de https://nodejs.org. Serve para gerar a interface da app.
3. Faz duplo clique em **`instalar.bat`**. Isto instala o que a app precisa e cria o atalho **Cronómetro do Dia** (com ícone) no Ambiente de Trabalho e no Menu Iniciar.
4. **Para pôr a app na barra de tarefas**: abre o Menu Iniciar, procura «Cronómetro do Dia», clica com o botão direito e escolhe **Afixar na barra de tarefas**.

## Abrir a app

Clica no ícone, seja na barra de tarefas, no Menu Iniciar ou no Ambiente de Trabalho. A app abre numa janela só dela e sem terminal.
Quando fechas a janela, a app desliga-se sozinha uns minutos depois. Se tiveres um cronómetro a correr, ele continua a contar e aparece quando voltares a abrir.

Carrega em **🔔 Ativar avisos** para receberes notificações do Windows mesmo com a janela minimizada.

Para ver erros, usa o `iniciar.bat`, que abre a app com o terminal visível. Os erros da versão sem terminal ficam em `app.log`.

## Ligar calendários para ler

Na app: **⚙ Definições → Calendários para ler**. Cola lá o link do teu calendário:

| Calendário | Onde está o link |
|---|---|
| Google Calendar | No computador: ⚙ Definições → escolhe o calendário (à esquerda) → *Integrar calendário* → **Endereço secreto no formato iCal** |
| Outlook / Microsoft 365 | Definições → Calendário → Calendários partilhados → *Publicar um calendário* → link **ICS** |
| iCloud (Apple) | Partilha o calendário como *Calendário público* e copia o link `webcal://…` |

## Escrever os blocos no Google Calendar

Para escrever no teu Google Calendar, a app precisa de umas credenciais tuas. Só tens de as criar uma vez (~5 min):

1. Abre https://console.cloud.google.com e cria um projeto (ex.: «Cronometro»).
2. Em *APIs e serviços → Biblioteca*, procura **Google Calendar API** e carrega em **Ativar**.
3. Em *Google Auth Platform* (ecrã de consentimento OAuth): tipo **Externo**, nome da app e o teu email.
   Em *Público-alvo*, carrega em **Publicar app**. Se a deixares em «Teste», a ligação expira a cada 7 dias.
4. Em *Clientes* → **Criar cliente** → tipo **App para computador** → transfere o ficheiro JSON.
5. Na app: **⚙ Definições → Escrever no Google Calendar → Carregar credenciais**, escolhe esse ficheiro e carrega em **Ligar conta Google**.
   O Google vai avisar que a app não está verificada: carrega em *Avançadas → Ir para …* (é a tua própria app).

Depois disto:
- Cada bloco que terminas aparece no calendário **«Cronómetro do Dia»**, que a app cria na tua conta, com a cor da atividade e marcado como "livre" para não te bloquear a agenda.
- Se apagares um bloco na app, ele também sai do Google.
- A app só tem acesso aos calendários que ela própria criou. Não consegue ver nem mexer no resto da tua agenda.
- **Não** juntes o calendário «Cronómetro do Dia» à lista de calendários para ler, senão os blocos aparecem em duplicado.

Os ficheiros `credenciais_google.json` e `token_google.json` dão acesso à tua conta. Não os partilhes.

## Abrir sozinha quando ligas o computador (opcional)

Carrega em `Win + R`, escreve `shell:startup` e copia para lá o atalho «Cronómetro do Dia».

## Problemas comuns

- **"Não consegui guardar"**: a app foi fechada. Volta a abri-la pelo ícone.
- **Erro no calendário**: confirma que copiaste o link completo. No Google tem de ser o endereço *secreto*, não o público.
- **⚠ Google no topo**: passa o rato por cima para veres o erro. Se a ligação expirou, vai a Definições e carrega em «Ligar outra vez».
- **«Falta gerar a interface»**: instala o Node.js e volta a abrir a app; ela gera a interface sozinha.
- **Quero mudar a porta**: define a variável `PORT` (por exemplo, `PORT=9000`) antes de abrir a app.

## Estrutura do projeto (para quem quiser mexer no código)

```
app.py                  arranque pela linha de comandos (python app.py)
abrir.pyw               arranque sem terminal, usado pelo atalho do Windows
criar_atalho.py         cria o atalho com ícone · instalar.bat / iniciar.bat / iniciar.command
servidor/               backend em Python (só biblioteca padrão + calendário/Google)
  config.py             caminhos, leitura/escrita de JSON, definições por omissão
  calendario.py         lê calendários iCal (só leitura)
  google_calendar.py    envia os blocos feitos para o Google Calendar
  rotas.py              pedidos HTTP: a interface (web/dist/) e a API /api/…
  interface.py          gera a interface (npm run build) quando ainda não existe ou o código mudou
web/                    interface em React + TypeScript + Vite + Tailwind (ver web/README.md)
  src/lib/              lógica pura (tempos, plano, planos guardados, roda, resumo…)
  src/estado/           estado partilhado (Zustand), ações e relógios
  src/componentes/      o que aparece no ecrã, uma pasta por zona
  dist/                 a versão gerada que o servidor entrega ao browser (não vai para o git)
```

- **Abrir a app pelo atalho trata de tudo:** se mudaste o código em `web/`, a interface é gerada outra vez antes de abrir.
- **Para desenvolver a interface:** `cd web` e `npm run dev`. Abre em http://localhost:5173, liga o servidor Python sozinho e atualiza a cada alteração.
- O `web/README.md` explica cada pasta e ficheiro da interface.
- Para formatar o código: `cd web` e `npm run format`. A configuração está em `.prettierrc.json`.
