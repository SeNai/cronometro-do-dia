#!/usr/bin/env bash
# macOS e Linux: faz duplo clique (macOS) ou corre ./iniciar.command
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null; then
  echo "Não encontrei o Python 3. Instala-o em https://www.python.org/downloads/"; read -r; exit 1
fi
if [ ! -d .venv ]; then
  echo "A preparar a app pela primeira vez..."
  python3 -m venv .venv
fi
./.venv/bin/python -m pip install --quiet --disable-pip-version-check -r requirements.txt
./.venv/bin/python app.py
