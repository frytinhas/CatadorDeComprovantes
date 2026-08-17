# PLANS.md — Roadmap de Implementação

> Este arquivo é o roadmap principal. Detalhes de implementação ficam nos
> arquivos `docs/plans/NNN-*.md`. Este arquivo não deve conter código nem
> detalhes excessivos.

## Status Geral

| Milestone | Título | Status |
|---|---|---|
| 000 | Skeleton & Infraestrutura | `NOT STARTED` |
| 001 | Painel de Configuração | `NOT STARTED` |
| 002 | Selfbot & Monitoramento | `NOT STARTED` |
| 003 | Parser da Fila & Pedidos | `NOT STARTED` |
| 004 | Gmail IMAP & Parse Nubank | `NOT STARTED` |
| 005 | Orquestrador & Validação | `NOT STARTED` |
| 006 | Dashboard Completo & Reconnect | `NOT STARTED` |
| 007 | Polish & Entrega | `NOT STARTED` |

---

## Milestone 000 — Skeleton & Infraestrutura

- **Objetivo:** Projeto roda, painel abre, auth funciona, SQLite inicializado.
- **Escopo:** Estrutura de pastas, Flask, `run.bat`, login, SQLite, dashboard vazio.
- **Dependências:** Nenhuma (primeira).
- **Critério de conclusão:** `run.bat` → browser abre → login → dashboard vazio com "Bot: desconectado".

## Milestone 001 — Painel de Configuração

- **Objetivo:** Operador configura token Discord, Gmail, canais e comando.
- **Escopo:** Formulário de config, botões "Testar Discord" / "Testar Gmail", salvar em SQLite.
- **Dependências:** 000.
- **Critério de conclusão:** Config salva. "Testar Discord" e "Testar Gmail" retornam OK/erro no painel.

## Milestone 002 — Selfbot & Monitoramento

- **Objetivo:** Selfbot conecta, monitora canais, eventos aparecem no dashboard.
- **Escopo:** Wrapper selfbot em thread, listeners de mensagem, SSE para dashboard, botões Iniciar/Parar.
- **Dependências:** 000, 001.
- **Critério de conclusão:** Bot online no dashboard. Mensagem em canal de teste aparece no log em tempo real.

## Milestone 003 — Parser da Fila & Pedidos

- **Objetivo:** Extrair valor/nome/chave do formato Flamingo e registrar pedido.
- **Escopo:** `parser_fila.py`, regex, registro no SQLite, página Pedidos no painel.
- **Dependências:** 002.
- **Critério de conclusão:** Mensagem de exemplo no canal de fila → pedido aparece na página Pedidos com campos corretos.

## Milestone 004 — Gmail IMAP & Parse Nubank

- **Objetivo:** Conectar IMAP, buscar e-mails Nubank, extrair nome/valor/data.
- **Escopo:** `gmail_imap.py`, `parser_comprovante.py`, marcar lido, anti-reuso (hash).
- **Dependências:** 001.
- **Critério de conclusão:** "Testar Gmail" no painel lista e-mails. Parser extrai os 3 campos de um e-mail real.

## Milestone 005 — Orquestrador & Validação

- **Objetivo:** Ligar trigger → busca → validação → aprovação/rejeição → `.cs`.
- **Escopo:** `orchestrator.py`, fluxo completo, fuzzy match, anti-reuso, envio no Discord.
- **Dependências:** 003, 004.
- **Critério de conclusão:** `pg Nome` → busca e-mail → valida → envia `.cs` + confirmação. Rejeição com motivo. Comprovante marcado como usado.

## Milestone 006 — Dashboard Completo & Reconnect

- **Objetivo:** Páginas Eventos, Teste, notificação de reconnect, status em tempo real.
- **Escopo:** SSE completo, página Eventos, página Teste (parse + IMAP), auto-reconnect do selfbot, notificação no dashboard.
- **Dependências:** 002, 005.
- **Critério de conclusão:** Dashboard mostra todos os eventos. Selfbot cai → dashboard notifica → reconnecta. Página Teste funcional.

## Milestone 007 — Polish & Entrega

- **Objetivo:** Projeto final, pronto para download e uso.
- **Escopo:** README completo, `run.bat` final, `--reset-password`, log rotation, zip, testes manuais finais.
- **Dependências:** 006.
- **Critério de conclusão:** Usuário novo segue README do zero, configura, inicia, e o fluxo completo (pedido → pg → validação → .cs) funciona sem intervenção.
