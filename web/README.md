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

| Ficheiro | O que é |
|---|---|
| `index.html` | A página; o React desenha tudo dentro de `<div id="root">` |
| `src/main.tsx` | Ponto de entrada |
| `src/App.tsx` | Componente principal |
| `src/tipos.ts` | Tipos dos dados (o que o servidor devolve e grava) |
| `src/api.ts` | Funções para falar com o servidor |
| `src/index.css` | Tailwind e as cores da app (tema claro/escuro) |
| `scripts/dev.mjs` | O que o `npm run dev` corre: liga o servidor Python e o Vite |
| `vite.config.ts` | Configuração do Vite (inclui o reencaminhamento de `/api` para o servidor Python) |
