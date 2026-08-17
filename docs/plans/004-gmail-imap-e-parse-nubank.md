# Milestone 004 — Gmail IMAP & Parse Nubank

## Objetivo

Conectar ao Gmail via IMAP, buscar e-mails de notificação do Nubank,
extrair **nome do pagador**, **valor** e **data/hora**. Marcar e-mails
processados como lidos. Gerar hash anti-reuso.

## Escopo

- [ ] `src/gmail_imap.py`:
  - `GmailIMAP` class:
    - `__init__(email, app_password)`
    - `connect()` → SSL, login, examine INBOX.
    - `disconnect()` → logout.
    - `search_unread_since(days: int) -> list[bytes]` → busca `UNSEEN FROM "nubank" SINCE <date>`.
    - `fetch_body(msg_id: str) -> str` → corpo texto (sem HTML).
    - `mark_read(msg_id: str)` → `\Seen`.
    - `get_message_id(msg_id: str) -> str` → para hash.
- [ ] `src/parser_comprovante.py`:
  - `parse_nubank(body: str) -> dict | None`
  - Retorna `{'nome_pagador': str, 'valor': float, 'data': str}` ou `None`.
  - Regex:
    - Nome: `recebido uma transferência de (.+?) e o valor`
      - Fallback: `transferência de (.+)` (última linha antes de "e o valor")
    - Valor: `r\$\s*([\d.,]+)` (primeira após "Valor recebido")
    - Data: `(\d{1,2}) (\w{3}) às (\d{2}:\d{2})`
  - Normalizar valor (mesma regra da fila).
- [ ] Hash anti-reuso:
  - `hash = sha256(message_id + body[:500]).hexdigest()`
  - Antes de processar: checar `comprovantes_usados`.
- [ ] `app.py`:
  - `POST /api/test/gmail` já existe (M001) → agora também retorna contagem de Nubank unread.
  - `POST /api/gmail/search` → retorna lista de e-mails Nubank não lidos (para página Teste).

## Comportamento Esperado

1. `test_imap` → conecta, conta Nubank unread.
2. `search_unread_since(2)` → lista de msg_ids.
3. `fetch_body` → texto limpo.
4. `parse_nubank` → `{nome_pagador: 'Ithalyson Santos Frazao', valor: 5.25, data: '15 AGO 23:43'}`.
5. E-mail marcado como lido após processar.
6. Hash gerado e disponível para M005.

## Arquivos Afetados

src/gmail_imap.py
src/parser_comprovante.py
app.py (endpoints /api/gmail/*)
requirements.txt (imapclient ou imaplib nativo)
## Testes / Verificações

- [ ] IMAP conecta com email + app password válidos.
- [ ] IMAP falha com app password errada.
- [ ] Busca retorna e-mails Nubank (não retorna outros remetentes).
- [ ] Parser extrai nome, valor, data de exemplo real.
- [ ] Parser retorna `None` para e-mail que não é notificação de Pix.
- [ ] `mark_read` funciona (e-mail some da busca UNSEED).
- [ ] Hash é determinístico (mesmo e-mail → mesmo hash).
- [ ] Valor "R$ 5,25" → `5.25`.

## Critério de Conclusão

- IMAP conecta, busca, busca, marca lido.
- Parser extrai os 3 campos de e-mail Nubank real.
- Hash anti-reuso gerado corretamente.
- Página Teste (ou API) mostra e-mails disponíveis.

**Se todos passam, milestone 004 = DONE.**

