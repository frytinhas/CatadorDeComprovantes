# Milestone 005 — Orquestrador & Validação

## Objetivo

Ligar o fluxo completo: trigger no Discord → busca pedido → busca
comprovante no Gmail → valida → aprova/rejeita → envia `.cs` + mensagem.

## Escopo

- [ ] `src/orchestrator.py`:
  - `process_trigger(nome_trigger: str, pedido_context: dict)`:
    1. **Localizar pedido:** buscar em `pedidos` onde `status='pendente'` e `nome` fuzzy ≈ `nome_trigger` (ratio ≥ 0.75).
       - Se não achar → enviar "❌ Pedido não encontrado para '{nome_trigger}'" no canal de resposta.
    2. **Buscar comprovante:**
       - `GmailIMAP.search_unread_since(janela_dias)`.
       - Para cada e-mail: `fetch_body` → `parse_nubank`.
       - Se hash já em `comprovantes_usados` → pular.
    3. **Validar** (todos devem passar):
       - `fuzzy_match(nome_pagador, nome_pedido) >= 0.75`
       - `valor_comprovante >= valor_pedido`
       - `data_comprovante >= data_pedido`
    4. **Aprovar:**
       - `UPDATE pedidos SET status='pago' WHERE id=?`
       - `INSERT INTO comprovantes_usados (hash, message_id, pedido_id, usado_em)`
       - Selfbot envia no canal de resposta: **comando de liberação** (`.cs` por default, configurável)
       - Selfbot envia: `"✅ Pagamento de {nome} validado (R$ {valor})."`
       - Evento no dashboard: `validado`.
    5. **Rejeitar** (se algum critério falhar):
       - Selfbot envia: `"❌ {motivo}"`
         - Motivos: "Nome não corresponde", "Valor insuficiente", "Comprovante já utilizado", "Comprovante não encontrado (tente em alguns minutos)"
       - Evento no dashboard: `rejeitado` + motivo.
       - Pedido **permanece pendente** (exceto "já utilizado" → marca como `rejeitado`).
- [ ] Integração com selfbot:
  - No evento `nova_mensagem_pagamentos` → extrair trigger:
    - Regex: `(?i)^(pg|pago)\s+(.+)$` (ou os triggers configurados).
    - Se match → chamar `orchestrator.process_trigger(nome, ...)`.
- [ ] `app.py`:
  - `POST /api/orchestrator/test` → para página Teste: simula um trigger com um nome e mostra o passo a passo.

## Comportamento Esperado

1. Pedido pendente: `luiz henrique`, `R$ 2.25`, chave `15479477407`.
2. Cliente manda `pg luiz henrique` no canal de pagamentos.
3. Orquestrador acha o pedido.
4. Busca Gmail → acha e-mail Nubank com `Ithalyson Santos Frazão`, `R$ 5.25`.
5. Validar:
   - Nome: "luiz henrique" vs "ithalyson santos fração" → **NÃO casa** → rejeitar?
   
   **Espera:** neste exemplo, os nomes são diferentes. Na prática, o nome
   no e-mail é o **nome de quem enviou** (cliente), e o nome do pedido é o
   **nome do cliente**. Se o cliente se chama "Luiz Henrique" e o Nubank
   mostra "Luiz Henrique" → casa.
   
   Se o Nubank mostrar nome completo com sobrenome e o pedido tem só
   primeiro nome → fuzzy deve cobrir (ratio de "luiz henrique" vs "luiz henrique silva" ≈ 0.85).

6. Se casa e valor OK → `.cs` + confirmação.
7. Dashboard: evento "validado".

## Arquivos Afetados

src/orchestrator.py
src/selfbot.py (integração do trigger → orquestrador)
src/gmail_imap.py (checagem de hash anti-reuso)
src/parser_comprovante.py (fuzzy match helper)
app.py (/api/orchestrator/test)
web/templates/teste.html (início — página Teste)
## Testes / Verificações

- [ ] `pg luiz henrique` com pedido pendente "luiz henrique" → aprova.
- [ ] `pg pessoa inexistente` → "não encontrado".
- [ ] E-mail com valor menor que o pedido → rejeita.
- [ ] E-mail com nome diferente → rejeita.
- [ ] Mesmo e-mail para 2 pedidos → segundo é rejeitado (anti-reuso).
- [ ] `.cs` aparece no canal de resposta.
- [ ] Confirmação aparece no canal de resposta.
- [ ] Dashboard: eventos corretos.
- [ ] Pedido muda para `pago` no SQLite.

## Critério de Conclusão

Fluxo completo (pedido → trigger → busca → validação → `.cs`) funciona
de ponta a ponta. Rejeições com motivo claro. Anti-reuso funciona.

**Se todos passam, milestone 005 = DONE.**

