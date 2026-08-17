# AGENTS.md — CatadorDeComprovantes

> **Prioridade de verdade:** Este arquivo é a fonte absoluta de verdade do projeto.
> Em caso de conflito entre código, documentação secundária, plano antigo,
> suposição e este documento, **este documento prevalece**.
> Se uma decisão aprovada alterar qualquer regra aqui, atualizar este arquivo
> **no mesmo commit** em que a mudança é implementada.

---

## 1. Identidade do Projeto

| Campo | Valor |
|---|---|
| Nome | CatadorDeComprovantes |
| Propósito | Automatizar a validação de pagamentos Pix cruzando pedidos do Discord com comprovantes recebidos por e-mail (Nubank) |
| Plataforma alvo | **Windows** (user roda `.bat`) |
| Linguagem | Python 3.10+ |
| Modelo de execução | Local, download-and-run, sem nuvem, sem deploy |
| Autenticação do painel | Senha única (bcrypt + session cookie) |

---

## 2. Regras de Negócio (imutáveis sem atualização deste arquivo)

### 2.1 Formato do Pedido (Canal de Fila — bot Flamingo)

O pedido é publicado como mensagem de texto com **três campos obrigatórios**:

Valor a pagar: R$ 2,25
Nome: luiz henrique
Chave de @ADMI LUIZ HENRIQUE 40K 🦩:
15479477407


Regras de parsing:

- `Valor a pagar:` → regex case-insensitive no prefixo. Extrair número após `R$`.
- `Nome:` → linha seguinte. Extrair até `\n` ou fim.
- `Chave de ...:` → a chave é o **conteúdo da linha seguinte** (ou após os `:` na mesma linha) composto de dígitos.
- O parser **NÃO** depende de:
  - Capitalização de qualquer campo.
  - Nome específico do mediador.
  - Menção `@` no Discord.
  - Emoji ou decoração no nome do mediador.
- Os três campos são **obrigatórios**. Se faltar qualquer um, o pedido **não** é registrado.
- Valor: normalizar `2,25` → `2.25` (virgula decimal → ponto). Remover pontos de milhar.
- Nome: armazenar como veio, `lower().strip()`.

### 2.2 Formato do Comprovante (Gmail — Nubank)

O comprovante é **texto no corpo do e-mail**, não anexo. Formato:
Olá, Luiz.

Você recebeu uma transferência de Ithalyson Santos Frazão e o valor já tá na sua conta do Nubank.

Valor recebido:
R$ 5,25
15 AGO às 23:43


Regras de parsing:

- **Nome do pagador:** regex `recebido uma transferência de (.+?) e o valor`. Fallback: `transferência de (.+)`.
- **Valor:** primeira ocorrência de `R$ <número>` após a menção a "Valor recebido".
- **Data/hora:** `\d{1,2} \w{3} às \d{2}:\d{2}`.
- **Chave Pix:** **NÃO aparece** no e-mail do Nubank. Não validar contra o pedido.
  A chave do pedido é armazenada como referência, mas a validação **não** a exige.

### 2.3 Critério de Validação (aprovar ou rejeitar)

Para um pagamento ser **aprovado**, TODAS as condições abaixo devem ser verdadeiras:

1. **Nome (fuzzy):** nome do pagador no e-mail ≈ nome do pedido.
   - Normalização: `unicodedata NFD` → remover diacríticos → `lower().strip()`.
   - Comparação: `difflib.SequenceMatcher.ratio() >= 0.75`.
   - Se não casa → **rejeitar**.
2. **Valor:** valor do e-mail **>=** valor do pedido.
   - Se menor → **rejeitar**.
3. **Data (sanity):** data do e-mail >= data em que o pedido foi criado.
   - Se anterior → **rejeitar**.

A chave Pix do pedido **não** participa da validação (Nubank não a expõe).

### 2.4 Anti-reuso

- Cada e-mail processado gera um `hash` (Message-ID + corpo) salvo em `comprovantes_usados`.
- Antes de aprovar, checar se o hash já existe. Se existir → **rejeitar** com motivo "comprovante já utilizado".
- Um comprovante **NUNCA** aprova mais de um pedido.

### 2.5 Ações na Aprovação

Na ordem:
1. Marcar pedido como `status = 'pago'`.
2. Inserir comprovante em `comprovantes_usados`.
3. Selfbot envia no canal de resposta o **comando de liberação** (default: `.cs`).
4. Selfbot envia mensagem de confirmação: `"✅ Pagamento de {nome} validado (R$ {valor})."`
5. Dashboard registra evento `validado`.

### 2.6 Ações na Rejeição

- Selfbot envia mensagem com o **motivo** (nome não casa / valor insuficiente / comprovante reusado / não encontrado).
- Dashboard registra evento `rejeitado` com motivo.
- O pedido **permanece pendente** (exceto se o motivo for "comprovante reusado").

### 2.7 Triggers de Pagamento no Discord

- `pg <Nome>` ou `pago <Nome>` (case-insensitive no prefixo).
- O `<Nome>` é o nome do cliente como aparece no pedido.
- Match fuzzy com a mesma regra do item 2.3.1.

### 2.8 Escopo

- **1 servidor Discord, 1 canal de fila, 1 canal de pagamentos, 1 canal de resposta.**
- Sem suporte a múltiplos servidores na v1.
- Volume esperado: 200–300 pedidos/semana (~30–40/dia).

---

## 3. Decisões Técnicas Aprovadas

| Decisão | Escolha | Restrição |
|---|---|---|
| Linguagem | Python 3.10+ | Não migrar para outra linguagem sem update deste arquivo |
| Web server | Flask (porta local, default `5678`) | Sem Django, FastAPI ou outro framework |
| Frontend | HTML + CSS + JS vanilla (sem build step) | Sem React/Vue/Angular/npm |
| Selfbot | Lib Python com user token (ex: `discord-selfbot`) | Não usar bot token. Não usar conta de bot |
| Gmail | IMAP + App Password | Sem OAuth server. Sem REST API |
| Parse de comprovante | Regex sobre texto do corpo do e-mail | Sem OCR, sem PDF parser, sem imagem |
| Estado | SQLite (arquivo local `data/catador.db`) | Sem Postgres, MySQL, MongoDB |
| Auth painel | Senha + bcrypt + session cookie | Sem OAuth social. Sem multi-user |
| Comunicação tempo real | SSE (Server-Sent Events) | Sem WebSocket |
| Threads | `threading.Thread` para selfbot e IMAP | Sem `asyncio` no selfbot (compatibilidade com libs) |
| Log | Arquivo `logs/catador.log` + mirror no dashboard | Sem service external |
| Plataforma | Windows (`.bat`) | Linux/Mac suportado via `.sh` mas não é alvo primário |

---

## 4. Regras para IA / Agentes que trabalharem neste repositório

1. **Ler este arquivo ANTES de escrever qualquer linha de código.**
2. Não inventar campos, endpoints, tabelas ou comportamentos que não estejam documentados aqui.
3. Se um requisito deste arquivo for ambíguo, **perguntar ao operador** antes de decidir.
4. Manter a separação de responsabilidades: `parser_fila`, `parser_comprovante`, `gmail_imap`, `orchestrator`, `selfbot`, `db` — cada um com um único propósito.
5. Não logar tokens (Discord, Gmail) em stdout, logs, ou variáveis de estado visíveis.
6. Não adicionar dependências ao `requirements.txt` sem justificar em comentário no código e atualizar este arquivo se a decisão for permanente.
7. Todo novo endpoint Flask deve autenticar (check session) exceto `/login`.
8. Todo evento que o usuário vê no dashboard deve também ser gravado no SQLite (tabela `eventos`).
9. Não remover o botão "Teste" do painel — é a ferramenta de debug primária do operador.
10. Se o selfbot cair, o dashboard **deve** mostrar o status. Nunca "silenciar" a falha.
11. Manter o parser da fila tolerante a `\r\n`, espaços extras, ausência de quebra de linha.
12. O valor `0` ou vazio em qualquer campo obrigatório do pedido → **não registrar**.
13. Não fazer `SELECT *` sem filtro. Sempre escopar consultas no SQLite.
14. O `run.bat` é a única forma de iniciar o app. Não exigir `python app.py` no README.

---

## 5. Restrições e Proibições

- **NÃO** usar bot token. Somente user token (selfbot).
- **NÃO** enviar mensagens em canais diferentes dos configurados.
- **NÃO** processar o mesmo e-mail duas vezes (anti-reuso é inegociável).
- **NÃO** exibir o token Discord ou app password em texto puro no painel (somente mask).
- **NÃO** assumir que a chave Pix do Nubank está no e-mail.
- **NÃO** aprovar um pagamento sem que **todos** os critérios do item 2.3 sejam satisfeitos.
- **NÃO** permitir que o operador inicie o bot sem ter testado as conexões (Discord + Gmail) com sucesso.

---

## 6. Definições

| Termo | Significado |
|---|---|
| Pedido | Mensagem publicada pelo bot Flamingo no canal de fila |
| Comprovante | E-mail de notificação do Nubank com transferência recebida |
| Aprovação | Pedido marcado como pago + comando de liberação enviado |
| Rejeição | Pedido permanece pendente + motivo enviado no Discord |
| Trigger | Mensagem do cliente no canal de pagamentos (`pg`/`pago` + nome) |
| Fila | Canal Discord onde o Flamingo publica pedidos |
| Canal de resposta | Canal onde o `.cs` e confirmações são enviados |
| Selfbot | Bot que usa user token (não bot token) |
| Orquestrador | Módulo que liga pedido → comprovante → validação → ação |

---

## 7. Atualização

Este arquivo deve ser versionado junto com o código. Qualquer mudança de regra
de negócio, decisão técnica ou restrição deve ser acompanhada de um diff neste
arquivo no mesmo PR/commit.

