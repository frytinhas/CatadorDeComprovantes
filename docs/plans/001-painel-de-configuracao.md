# Milestone 001 — Painel de Configuração

## Objetivo

Operador configura **tudo** que o sistema precisa: token Discord, Gmail
(email + app password), IDs de canal, comando de liberação e triggers.
Painel permite **testar** cada conexão antes de salvar.

## Escopo

- [ ] Página `/config` (template `config.html`):
  - Token Discord (user token)
  - Email Gmail
  - App Password Gmail
  - ID Canal Fila (Flamingo)
  - ID Canal Pagamentos (triggers pg/pago)
  - ID Canal Resposta (onde o `.cs` vai)
  - Comando de liberação (default `.cs`)
  - Triggers (default: `pg`, `pago`) — separados por vírgula
  - Janela de busca Gmail em dias (default: 2)
  - Botões:
    - "Testar Discord" → conecta com o token, verifica que o user está em um servidor, retorna guild ID.
    - "Testar Gmail" → IMAP login, `EXAMINE INBOX`, retorna count de mensagens.
    - "Salvar" → persiste em SQLite `config`.
    - "Resetar" → apaga config (volta ao setup).
- [ ] `src/selfbot.py` (esqueleto): função `test_discord(token)` → cria client,
  verifica `client.user`, tenta listar guilds, retorna `{ok: bool, detail: str}`.
- [ ] `src/gmail_imap.py` (esqueleto): função `test_imap(email, app_password)` →
  connect, login, examine, logout. Retorna `{ok: bool, detail: str}`.
- [ ] Endpoints:
  - `POST /api/config` → salva todos os campos.
  - `POST /api/test/discord` → retorna JSON.
  - `POST /api/test/gmail` → retorna JSON.
  - `POST /api/reset` → apaga config.
- [ ] No dashboard: badge de status de config (configurada / faltando campos).
- [ ] Máscara de sensibilidade: no painel, token e app password aparecem
  como `••••••••` (últimos 4 chars visíveis). Nunca em texto pleno.

## Comportamento Esperado

1. Operador preenche todos os campos.
2. Clica "Testar Discord" → feedback: "✅ Conectado como {username} | Guild: {guild}" ou "❌ {erro}".
3. Clica "Testar Gmail" → feedback: "✅ Conectado | {N} mensagens na Inbox" ou "❌ {erro}".
4. Clica "Salvar" → confirmação.
5. Dashboard atualiza badge para "Configurada ✅".

## Arquivos Afetados

web/templates/config.html
web/templates/dashboard.html (badge de status)
web/static/app.js (fetch para test/save)
src/selfbot.py (test_discord)
src/gmail_imap.py (test_imap)
src/db.py (set_config, get_config)
app.py (rotas /api/config, /api/test/*, /config, /api/reset)
## Testes / Verificações

- [ ] Token Discord inválido → "❌ Token inválido ou expirado".
- [ ] Token Discord válido → "✅ Conectado como X".
- [ ] Gmail com email errado → "❌ Autenticação falhou".
- [ ] Gmail com app password errado → "❌ Autenticação falhou".
- [ ] Gmail válido → "✅ Conectado | N mensagens".
- [ ] Salvar → reiniciar app → config persistida.
- [ ] Reset → volta ao estado vazio.
- [ ] Painel não exibe token em texto pleno.

## Critério de Conclusão

Operador consegue:
1. Configurar todos os campos.
2. Testar Discord e Gmail com feedback claro.
3. Salvar e reiniciar o app com config persistida.
4. Dashboard mostra status de config.

**Se todos passam, milestone 001 = DONE.**

