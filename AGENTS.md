# AGENTS.md

## Visao geral

Este repositorio contem o LuizBot, uma aplicacao local em Node.js para integrar Discord e Gmail. O processo principal e:

1. Um bot externo publica no canal de filas um pedido com nome, valor esperado e chave Pix do mediador.
2. O LuizBot captura essa mensagem e grava o pedido como pendente em SQLite.
3. O cliente envia `pg Nome Sobrenome` ou `pago Nome Sobrenome` no mesmo canal.
4. O LuizBot procura no Gmail um comprovante recente.
5. Se nome, Pix e valor forem compatíveis, o comprovante e marcado como usado e o bot envia `.cs` no canal.

O projeto foi desenhado para rodar no computador do cliente, com um painel web local em `http://localhost:3000`. Nao existe backend remoto, banco externo ou hospedagem obrigatoria.

## Estado atual da implementacao

Ja implementado:

- Servidor Express local.
- Painel administrativo em `public/`.
- Configuracao persistida no SQLite.
- Integracao Discord usando `discord.js`.
- Integracao Gmail usando OAuth 2.0 e Gmail API somente leitura.
- Captura de pedidos do bot externo por regex configuravel.
- Reconhecimento dos comandos `pg` e `pago`.
- Busca de comprovantes dentro de uma janela de horas configuravel.
- Comparacao de nome, chave Pix e valor pago.
- Bloqueio de reutilizacao por ID da mensagem Gmail e, quando disponivel, ID da transacao/E2E.
- Registro de eventos de sucesso, aviso e erro.
- Endpoint de teste das regexes.
- Reinicio do cliente Discord depois de salvar a configuracao.
- Regex padrao de nome limitada a uma linha, para nao capturar valor ou Pix em mensagens separadas por newline.
- Testes unitarios nativos do Node para normalizacao, parsing de pedidos e validacao/anti-reuso de comprovantes (`npm test`).
- Listagem dos 20 eventos mais recentes no painel, via `GET /api/events`.

Ainda precisa ser validado antes de uso em producao:

- Teste com uma mensagem real do bot externo para ajustar as regexes.
- Teste com comprovantes reais do banco utilizado pelo cliente.
- Validacao do formato exato da chave Pix que aparece no Gmail.
- Validacao do ID da transacao/E2E nos emails reais.
- Teste do fluxo OAuth com o Client ID configurado no Google Cloud.
- Teste do bot em um servidor Discord de homologacao.
- Testes de integracao das rotas HTTP sem iniciar um login real no Discord.
- Revisao das heuristicas do Gmail para evitar falsos positivos.

## Decisoes de produto

### Aplicacao local

Foi escolhido `npm start` com painel local porque o cliente vai executar o sistema no proprio computador. Isso reduz infraestrutura e deixa tokens, configuracoes e historico localmente no diretorio `data/`.

Essa escolha implica que:

- O computador precisa permanecer ligado para o bot funcionar.
- O processo Node precisa permanecer em execucao.
- O Gmail OAuth e feito no navegador daquele computador.
- Backup do arquivo SQLite e responsabilidade do operador.
- Nao ha sincronizacao entre computadores.

### Discord

O bot observa somente:

- O `guildId` configurado.
- O `queueChannelId` configurado.
- Mensagens do bot cujo ID seja igual a `sourceBotId`.
- Mensagens de usuarios no mesmo canal que comecem por `pg` ou `pago`.

Mensagens de outros bots sao ignoradas. O bot exige os intents `Guilds`, `GuildMessages` e `MessageContent`; o Message Content Intent tambem precisa estar habilitado no Developer Portal do Discord.

O campo `adminUserId` esta presente no modelo de configuracao e no painel, mas ainda nao e usado para autorizacao de comandos, notificacoes ou controle de acesso. O painel e local e nao possui login. Nao adicionar uma falsa garantia de seguranca sem implementar autenticao de fato.

### Resultado da validacao

O comportamento implementado envia a string configurada em `csCommand`, por padrao `.cs`, no canal de filas. Ele nao cria salas/canais de Discord.

Essa e uma decisao deliberada do escopo atual: o fluxo original foi interpretado como validacao que libera a fila via `.cs`. Se o requisito real for criar uma sala de Free Fire, sera necessario implementar uma etapa separada usando `guild.channels.create`, permissao de gerenciamento de canais, categoria configurada e regras de permissao para o usuario. Nao misturar essa mudanca com o parser de pagamentos sem confirmar o comportamento esperado.

### Gmail

O acesso usa OAuth 2.0 com escopo `gmail.readonly`. O LuizBot nao envia, apaga, move nem modifica emails.

A busca considera somente emails dentro de `receiptWindowHours`, padrao de 24 horas. Um comprovante valido precisa:

- Conter todas as partes relevantes do nome.
- Conter a chave Pix normalizada do mediador.
- Conter um valor identificavel maior ou igual ao valor esperado.
- Ainda nao ter sido usado por outro pedido.

O melhor candidato e o email valido mais recente. A extracao de valor atualmente escolhe o maior valor monetario encontrado no texto; isso e uma heuristica e precisa ser revista se o layout dos comprovantes tiver varios valores, como saldo, tarifa e valor transferido.

## Arquitetura

### Entrada principal

`src/index.js` inicializa dotenv, Express, SQLite, o servico Gmail e o cliente Discord. Tambem registra as rotas HTTP e inicia/reinicia o bot com a configuracao salva.

### Persistencia

`src/lib/db.js` cria `data/luizbot.sqlite` e habilita WAL. As tabelas sao:

- `settings`: configuracao JSON e tokens OAuth.
- `orders`: pedidos extraidos do bot externo.
- `used_receipts`: comprovantes ja consumidos.
- `events`: log operacional persistido.

O diretorio pode ser alterado por `DATA_DIR`. O arquivo de banco nao deve ser versionado.

### Configuracao

`src/lib/config.js` define defaults, salva configuracao e oculta segredos na resposta publica da API. Os segredos tratados sao:

- `discordToken`.
- `gmailClientSecret`.

Quando um segredo ja existe, o painel recebe `__SET__`; ao salvar, `__KEEP__` preserva o valor atual. Nunca imprimir tokens, client secret ou tokens OAuth no terminal, logs, respostas de API ou commits.

Campos principais:

| Campo | Uso |
| --- | --- |
| `discordToken` | Token do bot Discord |
| `guildId` | ID do servidor Discord |
| `queueChannelId` | ID do canal monitorado |
| `adminUserId` | ID reservado do administrador; ainda sem efeito operacional |
| `sourceBotId` | ID do bot que publica os pedidos |
| `csCommand` | Texto enviado apos validacao, normalmente `.cs` |
| `gmailClientId` | Client ID OAuth do Google |
| `gmailClientSecret` | Client Secret OAuth do Google |
| `nameRegex` | Regex para o nome do pedido |
| `amountRegex` | Regex para o valor esperado |
| `pixRegex` | Regex para a chave Pix |
| `receiptWindowHours` | Janela de busca no Gmail |

### Parsing de pedidos

`src/lib/orders.js` aplica as tres regexes ao conteudo da mensagem do bot externo. Cada regex pode usar grupo nomeado (`name`, `amount`, `pix`) ou o primeiro grupo de captura.

O pedido e normalizado e salvo com:

- ID unico da mensagem Discord.
- Canal de origem.
- Nome original e nome normalizado.
- Valor em centavos.
- Chave Pix.
- Texto bruto.
- Status `pending` ou `consumed`.

Ao receber `pg`/`pago`, o sistema busca o pedido pendente mais recente para o mesmo canal e nome normalizado.

As regexes padrao sao apenas um ponto de partida. O formato real do bot externo deve ser testado no painel antes de operar.

### Normalizacao

`src/lib/normalize.js`:

- Remove acentos e converte texto para minusculas.
- Normaliza nomes para comparacao.
- Remove espacos da chave Pix para comparacao.
- Converte valores BRL em centavos.

Ao alterar parsing monetario, preservar a representacao inteira em centavos para evitar erros de ponto flutuante.

### Validacao e anti-reuso

`src/lib/gmail.js` cria o cliente OAuth, pesquisa mensagens, extrai texto de partes `text/plain` e `text/html`, avalia os candidatos e registra o comprovante escolhido.

O consumo final ocorre dentro de uma transacao SQLite:

1. Insere o Gmail message ID em `used_receipts`.
2. Insere o transaction ID/E2E quando encontrado.
3. Marca o pedido como `consumed`.
4. Depois disso, envia `.cs` no Discord.

Existem indices unicos para impedir reutilizacao por email e por transaction ID. Caso o envio ao Discord falhe depois do commit, o pagamento continuara consumido; esse caso deve ser tratado com log e eventual comando administrativo de reprocessamento, se essa necessidade surgir.

### Cliente Discord

`src/lib/discordBot.js` controla login, reconexao por reinicio de configuracao, estado exibido no painel e eventos de mensagens. Erros sao persistidos em `events` e respondidos no canal quando possivel.

### Painel

`public/index.html`, `public/styles.css` e `public/app.js` fornecem:

- Formulario de configuracao Discord.
- Formulario de credenciais Google.
- Campos de regex.
- Campo de mensagem de exemplo e teste de extracao.
- Botao para iniciar OAuth do Gmail.
- Status de Discord e Gmail.
- Quantidade de pedidos pendentes e comprovantes usados.
- Listagem dos eventos operacionais recentes.

O painel nao implementa autenticacao. Deve ser acessado apenas localmente; nao expor a porta para a rede sem adicionar autenticacao e protecao contra CSRF.

## Rotas HTTP

- `GET /api/config`: retorna configuracao publica, sem segredos.
- `POST /api/config`: salva configuracao e reinicia o Discord.
- `GET /api/status`: retorna estados do Discord, Gmail e contadores.
- `GET /api/events`: retorna eventos recentes, com limite entre 1 e 100.
- `GET /api/gmail/auth-url`: gera a URL OAuth.
- `GET /api/gmail/callback`: recebe o callback OAuth local.
- `POST /api/test-regex`: testa a extracao da mensagem de exemplo.
- `POST /api/discord/restart`: reinicia manualmente o cliente Discord.

## Como executar

Requisitos:

- Node.js 20 ou superior.
- Bot Discord criado no Developer Portal.
- Message Content Intent habilitado.
- Bot convidado ao servidor com acesso ao canal de filas e permissao de enviar mensagens/responder.
- Projeto Google Cloud com Gmail API habilitada.
- OAuth Client ID do tipo Desktop App ou aplicacao local equivalente.

Comandos:

```bash
npm install
npm start
```

Depois, abrir:

```text
http://localhost:3000
```

O arquivo `.env.example` documenta `PORT` e `DATA_DIR`. O `.env` e opcional para os defaults atuais e nao deve ser commitado.

## Configuracao OAuth do Google

O callback usado pelo painel e:

```text
http://localhost:3000/api/gmail/callback
```

Esse endereco precisa estar autorizado no OAuth Client quando o tipo de credencial exigir URIs cadastradas. Se a porta for alterada, o callback muda e deve ser atualizado no Google Cloud.

O token recebido e salvo em `settings` no SQLite. O acesso e somente leitura. Se a autorizacao for revogada, apagar apenas a configuracao/token OAuth correspondente e refazer a conexao; nao apagar o banco inteiro sem backup.

## Regras para futuras alteracoes

- Manter o projeto local e simples, salvo decisao explicita de mudar a implantacao.
- Preferir os modulos existentes a criar outra camada de abstracao.
- Manter valores monetarios em centavos.
- Nao relaxar o anti-reuso.
- Nao aceitar comprovante apenas por nome: validar Pix e valor.
- Nao confiar no nome do remetente do email como unico criterio de autenticidade.
- Nao registrar segredos ou corpo completo de emails em logs.
- Nao colocar tokens em `README.md`, `AGENTS.md`, `.env.example`, commits ou screenshots.
- Ao mudar o formato de mensagem externo, atualizar as regexes pelo painel e adicionar um exemplo de teste.
- Ao mudar o fluxo de canais/salas, revisar permissoes Discord e testar em servidor separado.
- Preservar mudancas existentes do usuario em arquivos que nao pertencem a esta tarefa.

## Pendencias tecnicas recomendadas

1. Adicionar testes de integracao das rotas Express sem iniciar um login real no Discord.
2. Adicionar uma tela ou acao administrativa para pedidos pendentes e comprovantes consumidos.
3. Revisar a query do Gmail com exemplos reais; os termos gerados devem continuar validos para o Gmail Search.
4. Melhorar a extracao de valor para identificar explicitamente o valor da transacao, em vez de assumir o maior valor do email.
5. Decidir formalmente se o produto final envia `.cs` ou cria uma sala de Free Fire. Se criar sala, adicionar `categoryId` e regras de permissao, pois isso ainda nao existe na implementacao atual.
6. Executar `npm audit` com acesso de rede e avaliar as vulnerabilidades reportadas pelas dependencias.
7. Fazer um teste manual completo com Discord e Gmail autorizados antes de entregar ao cliente.

## Acompanhamento

### O que foi feito

- Corrigida a regex padrao de nome para usar somente o conteudo ate a quebra de linha.
- Criado `npm test` com cobertura de normalizacao, extracao de pedidos, validacao de nome/Pix/valor e bloqueio por transaction ID/E2E ja usado.
- Adicionada a rota `GET /api/events` e a exibicao dos eventos recentes no painel.
- Reescrito o `README.md` como guia operacional: instalacao, inicio/parada, configuracao, OAuth, regexes, uso diario e diagnostico.
- Executadas com sucesso as checagens de sintaxe dos arquivos principais e a suite `npm test`.

### O que falta fazer

- Cobrir as rotas Express com testes de integracao isolados.
- Implementar a consulta administrativa de pedidos pendentes e comprovantes consumidos.
- Substituir a heuristica do maior valor no email pela identificacao explicita do valor da transacao.

### O que precisa de acao externa

- Fornecer uma mensagem real e sem dados sensiveis do bot externo para confirmar as regexes no painel.
- Autorizar e testar uma conta Gmail com comprovantes reais, para validar chave Pix, ID E2E e a busca Gmail.
- Testar em um servidor Discord de homologacao com as intents e permissoes configuradas.
- Definir se a aprovacao final deve enviar `.cs` ou criar uma sala de Free Fire.
- Executar `npm audit` em ambiente com acesso a rede e avaliar o resultado.

## Verificacao minima antes de entrega

Executar:

```bash
node --check src/index.js
node --check src/lib/config.js
node --check src/lib/db.js
node --check src/lib/discordBot.js
node --check src/lib/gmail.js
node --check src/lib/normalize.js
node --check src/lib/orders.js
node --check public/app.js
npm test
npm start
```

Com o servidor rodando, verificar `GET /api/status`, abrir o painel, salvar uma configuracao incompleta e confirmar que o sistema nao tenta login no Discord sem os campos obrigatorios. Depois, testar OAuth, uma mensagem do bot externo, um `pg Nome Sobrenome`, um comprovante valido, um comprovante invalido e a tentativa de reutilizacao do mesmo comprovante.

## Diagnostico rapido

- Discord desconectado: conferir token, `guildId`, `queueChannelId`, `sourceBotId`, intents e permissoes do bot.
- Pedido nao encontrado: conferir se a mensagem veio do `sourceBotId`, se o canal esta correto e se as regexes extraem os tres campos.
- Gmail nao conectado: refazer OAuth pelo painel e conferir `gmailClientId`/`gmailClientSecret`.
- Comprovante recusado por nome/Pix/valor: abrir o email real e ajustar as regras/heuristicas em `src/lib/gmail.js` sem remover as validacoes.
- `.cs` nao enviado: conferir permissao de enviar mensagens no canal e os eventos persistidos no SQLite.
- Painel indisponivel: conferir se `npm start` esta em execucao e se a porta `PORT` esta livre.

## Arquivos relevantes

- `package.json`: dependencias e comandos.
- `README.md`: resumo rapido para o operador.
- `.env.example`: variaveis de ambiente.
- `src/index.js`: servidor e composicao da aplicacao.
- `src/lib/config.js`: defaults e persistencia da configuracao.
- `src/lib/db.js`: schema e eventos SQLite.
- `src/lib/discordBot.js`: eventos e fluxo Discord.
- `src/lib/gmail.js`: OAuth, busca, parsing e validacao Gmail.
- `src/lib/orders.js`: regexes, pedidos e comandos `pg`/`pago`.
- `src/lib/normalize.js`: normalizacao e dinheiro.
- `public/`: painel administrativo local.
- `data/luizbot.sqlite`: dados locais gerados em runtime; nao versionar.
