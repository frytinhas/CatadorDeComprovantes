# Milestone 000 — Skeleton & Infraestrutura

## Objetivo

Entregar um projeto que **roda** (`run.bat`), abre o painel local com login
por senha, inicializa o SQLite e mostra um dashboard mínimo com status
"Bot: desconectado" e "Gmail: desconectado".

## Escopo

- [ ] Criar estrutura de pastas conforme `AGENTS.md` §12 (seção de arquivos).
- [ ] `requirements.txt` com: `flask`, `bcrypt`, (demais libs nas milestones seguintes).
- [ ] `app.py`:
  - Sobes Flask na porta `5678` (configurável via env var, default 5678).
  - Cria `data/` e `logs/` se não existirem.
  - Inicializa SQLite em `data/catador.db` com schema mínimo:
    - `config(key TEXT PK, value TEXT)`
    - `pedidos(id, nome, valor, chave_pix, canal_id, msg_id, status, criado_em)`
    - `comprovantes_usados(hash TEXT PK, message_id, pedido_id, usado_em)`
    - `eventos(id, timestamp, tipo, mensagem, pedido_id)`
- [ ] Auth:
  - Se `config` não tem chave `panel_password` → primeira visita redireciona para `/setup` (definir senha).
  - `/login` → bcrypt check → session cookie `HttpOnly`, `SameSite=Strict`.
  - Middleware: rotas (exceto `/login`, `/setup`) exigem session válida.
- [ ] Dashboard (`/`):
  - Mostra: status bot (🔴 desconectado), status Gmail (🔴 desconectado),
    contadores (0 pedidos abertos, 0 pagos), log vazio.
  - Botões: "Iniciar" / "Parar" (disabled nesta milestone, funcionam a partir da 002).
- [ ] `run.bat`:
@echo off
cd /d "%~dp0"
if not exist venv (
python -m venv venv
call venv\Scripts\pip install -r requirements.txt
)
call venv\Scripts\python app.py
pause
- [ ] `run.sh` (Linux/Mac, secundário).
- [ ] `src/db.py` — helpers: `init_db()`, `get_config()`, `set_config()`, `log_event()`.
- [ ] `src/config.py` — default values, load/save.
- [ ] `src/auth.py` — hash, verify, session.
- [ ] `src/events_bus.py` — `queue.Queue`-based pub/sub para SSE (nada de evento real ainda, só a estrutura).

## Comportamento Esperado

1. Usuário extrai zip → roda `run.bat`.
2. Cria venv, instala deps, sobe Flask.
3. Browser abre em `http://localhost:5678`.
4. Como é primeira vez → tela de setup → define senha.
5. Dashboard aparece com status "desconectado" e contadores zerados.
6. `Ctrl+C` ou fechar janela → processo termina limpo (fecha SQLite, encerra threads).

## Arquivos Afetados

app.py
run.bat
run.sh
requirements.txt
src/init.py
src/db.py
src/config.py
src/auth.py
src/events_bus.py
web/templates/setup.html
web/templates/login.html
web/templates/dashboard.html
web/static/style.css
web/static/app.js


## Testes / Verificações

- [ ] `run.bat` sobe sem erro em Windows limpo (sem Python pré-instalado? → README avisa).
- [ ] Primeira execução → tela de setup → salva senha → redireciona.
- [ ] Segunda execução → login com senha → dashboard.
- [ ] Login com senha errada → recusa.
- [ ] SQLite criado com as 4 tabelas.
- [ ] Dashboard renderiza com status correto (desconectado).
- [ ] Rotas protegidas: acessar `/dashboard` sem login → redirect para `/login`.

## Critério de Conclusão

O operador consegue:
1. Rodar `run.bat` em uma máquina Windows com Python 3.10+.
2. Definir senha e acessar o dashboard.
3. Ver o dashboard com status "desconectado" e contadores zerados.
4. Parar o processo e reiniciar → sessão pede login de novo.

**Se todos os itens acima passam, milestone 000 = DONE.**

