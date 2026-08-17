# Milestone 006 — Dashboard Completo & Reconnect

## Objetivo

Dashboard funcional com todas as páginas, log em tempo real, notificação
de reconnect do selfbot, página de Teste, página de Eventos.

## Escopo

- [ ] **Página Eventos** (`/eventos`, `eventos.html`):
  - Tabela: timestamp | tipo | mensagem | pedido_id
  - Filtros: tipo (todos / validado / rejeitado / erro / info), data.
  - Paginação (50 por página).
  - Endpoint: `GET /api/eventos?tipo=&pagina=1`

- [ ] **Página Teste** (`/teste`, `teste.html`):
  - **Teste Parser Fila:** textarea → cola mensagem → "Extrair" → mostra campos.
  - **Teste Parser Nubank:** textarea → cola corpo de e-mail → "Extrair" → mostra campos.
  - **Teste IMAP:** botão → mostra contagem de Nubank unread + últimos 5 (assunto, data).
  - **Teste Trigger:** input nome → "Simular" → mostra passo a passo (pedido encontrado? e-mail achado? validação? resultado?).
  - Endpoints: `POST /api/test/parser_fila`, `POST /api/test/parser_nubank`, `POST /api/test/trigger`

- [ ] **Reconnect do Selfbot:**
  - No selfbot: se cair → log evento "reconnecting" → retry 5s → após 5 falhas → "offline".
  - Dashboard: badge muda para 🟡 (reconnecting) → 🔴 (offline).
  - Log no dashboard: "⚠️ Selfbot caiu: {erro}. Tentativa 1/5..."
  - Após sucesso de reconexão: "✅ Selfbot reconectado."

- [ ] **Status em tempo real:**
  - `GET /api/status` → poll a cada 5s pelo frontend (ou SSE).
  - Dashboard atualiza badges sem refresh.

- [ ] **Polish do Dashboard:**
  - Contadores: pedidos abertos, pagos hoje, rejeitados hoje.
  - Último evento visível no dashboard (linha única, atualiza via SSE).
  - Botão "Limpar logs" (apaga eventos do log em memória, mantém no SQLite).

## Arquivos Afetados

web/templates/eventos.html
web/templates/teste.html
web/templates/dashboard.html (status, contadores, badges)
web/static/app.js (poll status, EventSource, páginas)
app.py (novas rotas, SSE, reconnect handler)
src/selfbot.py (reconnect loop, eventos de status)
src/events_bus.py (mensagens de status)
## Testes / Verificações

- [ ] Página Eventos lista e filtra corretamente.
- [ ] Página Teste: cada teste funciona isoladamente.
- [ ] Selfbot cai → dashboard 🟡 → 🔴 após 5 tentativas.
- [ ] Selfbot reconecta → dashboard 🟢 + evento no log.
- [ ] Contadores atualizam após novo pedido / aprovação.
- [ ] Poll de status a cada 5s funciona.

## Critério de Conclusão

- Todas as páginas funcionais.
- Reconnect visível e notificado.
- Testes isolados funcionam.
- Dashboard reflete estado real do sistema em tempo real.

**Se todos passam, milestone 006 = DONE.**

