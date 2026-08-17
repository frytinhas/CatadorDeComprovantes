# Milestone 007 — Polish & Entrega

## Objetivo

Projeto final, pronto para download, uso e manutenção pelo operador.

## Escopo

- [ ] **README.md** completo:
  - O que é, como funciona (fluxo em 5 passos).
  - Requisitos (Python 3.10+, Windows 10/11).
  - Setup: extrair zip → `run.bat` → configurar → iniciar.
  - Como criar App Password no Gmail (passo a passo).
  - Como pegar token Discord (modo desenvolvedor → Settings → Token).
  - Como pegar IDs de canal (modo desenvolvedor → clique direito no canal → Copiar ID).
  - Solução de problemas comuns (token expirado, IMAP falha, etc).
  - Aviso de ToS (selfbot = risco de ban).
  - Limitações (1 servidor, formato Nubank, etc).

- [ ] **`run.bat` final:**
  - Verifica Python.
  - Cria venv se não existir.
  - Instala deps.
  - Sobe app.
  - Abre browser automaticamente (`start http://localhost:5678`).
  - Mensagem de erro amigável se Python não encontrado.

- [ ] **`python app.py --reset-password`** (CLI):
  - Apaga `panel_password` do SQLite.
  - Próxima execução → setup de novo.

- [ ] **Log rotation:**
  - `logs/catador.log` → se > 5MB → renomeia para `catador.log.old`, cria novo.
  - `logging.handlers.RotatingFileHandler`.

- [ ] **`run.sh`** (Linux/Mac, secundário).

- [ ] **Teste final (checklist manual):**
  - Máquina limpa (sem venv, sem data/).
  - `run.bat` → setup → config → testar Discord → testar Gmail → salvar.
  - Iniciar.
  - Bot publica pedido no canal de fila.
  - Pedido aparece no painel.
  - Operador envia `pg Nome` no canal de pagamentos.
  - Orquestrador valida → `.cs` no canal.
  - Dashboard: evento "validado".
  - Pedido marcado como pago.
  - Mesmo comprovante para outro pedido → rejeitado.

- [ ] **Zip final:**
  - Sem `venv/`, `data/`, `logs/`, `__pycache__/`, `.git/`.
  - Estrutura limpa conforme AGENTS.md.

- [ ] **Revisão de AGENTS.md:**
  - Confirmar que todas as decisões implementadas estão documentadas.
  - Atualizar se algo mudou durante o desenvolvimento.

## Arquivos Afetados

README.md
run.bat (versão final)
run.sh
app.py (--reset-password, log rotation, abrir browser)
src/db.py (log rotation)
AGENTS.md (revisão final)
## Testes / Verificações

- [ ] README permite setup em máquina limpa sem ajuda.
- [ ] `run.bat` abre browser automaticamente.
- [ ] `--reset-password` funciona.
- [ ] Log não cresce infinitamente.
- [ ] Zip contém apenas arquivos necessários.
- [ ] Fluxo de ponta a ponta (pedido → pg → validação → .cs) sem erros.
- [ ] AGENTS.md reflete o código implementado.

## Critério de Conclusão

Usuário novo, seguindo **apenas o README**, consegue:
1. Instalar.
2. Configurar.
3. Iniciar.
4. Ver um pagamento validado de ponta a ponta.

Sem intervenção do desenvolvedor. Sem erros no console.

**Se todos passam, milestone 007 = DONE. Projeto entregue.**

