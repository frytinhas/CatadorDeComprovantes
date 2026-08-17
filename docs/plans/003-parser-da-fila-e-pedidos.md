# Milestone 003 — Parser da Fila & Pedidos

## Objetivo

Quando o selfbot detecta mensagem no canal de fila, o parser extrai
**valor**, **nome** e **chave Pix** do formato Flamingo e registra o
pedido no SQLite. Página "Pedidos" no painel lista os pedidos.

## Escopo

- [ ] `src/parser_fila.py`:
  - `parse_fila(content: str) -> dict | None`
  - Retorna `{'valor': float, 'nome': str, 'chave_pix': str}` ou `None` se falhar.
  - Regex:
    - Valor: `(?i)valor a pagar:\s*r\$\s*([\d.,]+)`
    - Nome: `(?i)^nome:\s*(.+)$` (multiline)
    - Chave: `(?i)chave de [^\n:]+:\s*\n?\s*(\d+)`
  - Normalizar valor: remover pontos de milhar, virgula→ponto, `float()`.
  - Nome: `lower().strip()`.
  - Tolerar `\r\n`, espaços extras, ausência de quebra de linha entre `:` e número.
- [ ] `app.py` / orquestrador (chamado pelo selfbot):
  - No evento `nova_mensagem_fila` → chamar `parse_fila(content)`.
  - Se `None` → logar evento "pedido_invalido" no dashboard.
  - Se OK → `INSERT INTO pedidos (...)`.
  - Logar evento "novo_pedido" no dashboard.
- [ ] Página `/pedidos` (template `pedidos.html`):
  - Tabela: # | Nome | Valor | Chave | Status | Criado em
  - Filtro: status (todos / pendentes / pagos)
  - Paginação (20 por página).
- [ ] Endpoints:
  - `GET /api/pedidos?status=pendente&pagina=1`
  - `GET /pedidos` (template)

## Comportamento Esperado

1. Flamingo publica mensagem no canal de fila.
2. Selfbot captura → parser extrai `{valor: 2.25, nome: 'luiz henrique', chave_pix: '15479477407'}`.
3. Pedido registrado com `status = 'pendente'`.
4. Dashboard: evento "Novo pedido: luiz henrique (R$ 2,25)".
5. Página Pedidos: linha aparece.

## Arquivos Afetados

src/parser_fila.py
app.py (integração no evento da fila, endpoints /api/pedidos, /pedidos)
web/templates/pedidos.html
web/static/app.js (fetch para página pedidos)
src/db.py (INSERT pedido, query por status)
## Testes / Verificações

- [ ] Mensagem no formato exato do exemplo → campos extraídos corretos.
- [ ] Mensagem com `\r\n` (Windows) → funciona.
- [ ] Mensagem com "valor a pagar:" (minúsculo) → funciona.
- [ ] Mensagem sem "Nome:" → `None` → evento "pedido_invalido".
- [ ] Valor "R$ 1.234,56" → `1234.56` (ponto de milhar).
- [ ] Chave na mesma linha após `:` → funciona.
- [ ] Chave na linha seguinte → funciona.
- [ ] Página Pedidos lista o pedido com status pendente.
- [ ] Pedido com valor 0 → **não** registrar.

## Critério de Conclusão

- Parser extrai os 3 campos de variações do formato Flamingo.
- Pedido registrado no SQLite.
- Página Pedidos funcional.
- Eventos no dashboard corretos.

**Se todos passam, milestone 003 = DONE.**

