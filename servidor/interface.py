"""Garante que a interface (React) está gerada antes de abrir a app.

A interface vive em web/ (código TypeScript) e o browser usa a versão «gerada» em web/dist/,
criada com `npm run build`. Esta função gera-a sozinha quando:
  - ainda não existe (primeira vez, ou depois de clonar o projeto do GitHub), ou
  - o código em web/ é mais recente do que a versão gerada (mudaste alguma coisa).

Precisa do Node.js. Se não houver Node mas já existir uma versão gerada, usa essa.
"""
import shutil
import subprocess

from .config import BASE, INTERFACE

WEB = BASE / "web"
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)  # no Windows, sem abrir uma janela de terminal

# ficheiros cuja alteração obriga a gerar outra vez
_FONTES = ["src", "index.html", "package.json", "vite.config.ts", "public"]


def _mais_recente(caminho):
    """Data de modificação mais recente de um ficheiro, ou de tudo o que está dentro de uma pasta."""
    if not caminho.exists():
        return 0
    if caminho.is_file():
        return caminho.stat().st_mtime
    return max((f.stat().st_mtime for f in caminho.rglob("*") if f.is_file()), default=0)


def precisa_de_gerar():
    """True se web/dist não existe ou está mais antigo do que o código em web/."""
    gerado = INTERFACE / "index.html"
    if not gerado.exists():
        return True
    return max(_mais_recente(WEB / f) for f in _FONTES) > gerado.stat().st_mtime


def garantir_interface(log=print):
    """Gera a interface se for preciso. Devolve None se está tudo bem, ou uma mensagem de erro."""
    if not WEB.exists() or not precisa_de_gerar():
        return None
    npm = shutil.which("npm")
    if not npm:
        if (INTERFACE / "index.html").exists():
            return None  # sem Node, mas há uma versão gerada: usa essa
        return ("Falta gerar a interface e não encontrei o Node.js.\n"
                "Instala-o em https://nodejs.org e volta a abrir a app.")
    try:
        if not (WEB / "node_modules").exists():
            log("A instalar as dependências da interface (npm install)…")
            subprocess.run([npm, "install", "--no-fund", "--no-audit"], cwd=WEB, check=True,
                           creationflags=NO_WINDOW)
        log("A gerar a interface (npm run build)…")
        subprocess.run([npm, "run", "build"], cwd=WEB, check=True, creationflags=NO_WINDOW)
    except (OSError, subprocess.CalledProcessError) as e:
        if (INTERFACE / "index.html").exists():
            log(f"Não consegui gerar a interface ({e}); uso a versão anterior.")
            return None
        return f"Não consegui gerar a interface:\n{e}\n\nCorre «npm run build» na pasta web para veres o erro."
    return None
