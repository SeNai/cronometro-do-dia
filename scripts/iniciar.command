#!/usr/bin/env bash
# macOS e Linux: faz duplo clique (macOS) ou corre ./scripts/iniciar.command
cd "$(dirname "$0")/.."
if ! command -v python3 >/dev/null; then
  echo "Não encontrei o Python 3. Instala-o em https://www.python.org/downloads/"; read -r; exit 1
fi
if ! command -v npm >/dev/null && [ ! -f web/dist/index.html ]; then
  echo "Não encontrei o Node.js (precisa dele para gerar a interface). Instala-o em https://nodejs.org"; read -r; exit 1
fi
if [ ! -d .venv ]; then
  echo "A preparar a app pela primeira vez..."
  python3 -m venv .venv
fi
./.venv/bin/python -m pip install --quiet --disable-pip-version-check -r servidor/requirements.txt
./.venv/bin/python -m servidor
