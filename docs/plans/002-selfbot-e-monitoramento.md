# Milestone 002 — Selfbot & Monitoramento

## Objetivo

Selfbot conecta com user token, monitora os 3 canais configurados
(fila, pagamentos, resposta), e eventos de mensagem aparecem em tempo real
no dashboard via SSE. Botões Iniciar/Parar funcionam.

## Escopo

- [ ] `src/selfbot.py` — classe `CatadorSelfbot`:
  - `start(token, canal_fila, canal_pagamentos, canal_resposta)`
  - `stop()`
  - Listener `on_message`:
    - Se `message.channel_id == canal_fila` → emitir evento `{tipo: 'nova_mensagem_fila', content, author, msg_id, timestamp}`
    - Se `channel_id == canal_pagamentos` → emitir evento `{tipo: 'nova_mensagem_pagamentos', content, author, msg_id, timestamp}`
  - Emitir eventos via `events_bus.publish(event_dict)`.
  - Thread: `threading.Thread(target=self._run, daemon=True)`.
  - Reconnect básico: se `on_disconnected` → log + retry após 5s (loop com max 5 tentativas antes de marcar offline).
- [ ] `app.py`:
  - `POST /api/bot/start` → lê config do SQLite → `CatadorSelfbot.start(...)`.
  - `POST /api/bot/stop` → `CatadorSelfbot.stop()`.
  - `GET /api/stream` → SSE: `text/event-stream`. Consume do `events_bus`.
  - `GET /api/status` → `{bot: 'online'|'offline'|'reconnecting', gmail: 'ok'|'err', config: 'complete'|'incomplete'}`.
- [ ] Dashboard:
  - Botões Iniciar/Parar → chamam API.
  - Log em tempo real: div que renderiza eventos via SSE.
  - Status bot: 🟢/🔴/🟡 (reconnecting).
- [ ] `requirements.txt`: adicionar `discord-selfbot` (ou lib equivalente).

## Compostamento Esperado

1. Operador clica "Iniciar".
2. Dashboard: status muda para 🟢.
3. Alguém manda mensagem no canal de fila → evento aparece no log do dashboard.
4. Alguém manda mensagem no canal de pagamentos → evento aparece.
5. Operador clica "Parar" → status 🔴. Threads encerradas.
6. Se o selfbot cair (ex: token expirado) → status 🟡 → após 5 falhas → 🔴 + evento "Selfbot offline".

## Arquivos Afetados

src/selfbot.py (implementação real, não só test_discord)
src/events_bus.py (publicar/assinar)
app.py (rotas /api/bot/start, /api/bot/stop, /api/stream, /api/status)
web/templates/dashboard.html
web/static/app.js (EventSource para SSE, fetch para start/stop)
requirements.txt
## Testes / Verificações

- [ ] Iniciar com token válido → 🟢.
- [ ] Iniciar com token inválido → 🔴 + mensagem de erro no dashboard.
- [ ] Mensagem no canal de fila → evento no log SSE.
- [ ] Mensagem no canal de pagamentos → evento no log SSE.
- [ ] Mensagem em canal NÃO configurado → ignorada (não aparece).
- [ ] Parar → threads encerradas, status 🔴.
- [ ] Forçar crash (token expirado) → reconnect → após 5 falhas → offline.

## Critério de Conclusão

- Bot conecta e monitora canais.
- Eventos aparecem em tempo real no dashboard.
- Iniciar/Parar funcionam.
- Reconnect básico funciona.

**Se todos passam, milestone 002 = DONE.**

