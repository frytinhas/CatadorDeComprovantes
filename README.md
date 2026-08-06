# LuizBot

LuizBot e um aplicativo local que confere comprovantes Pix recebidos no Gmail e libera uma fila no Discord. Quando encontra um comprovante compativel, ele envia o comando configurado no canal, por padrao `.cs`.

Ele roda no proprio computador do operador. Nao existe servidor externo: o computador, o processo Node.js e a conexao com a internet precisam permanecer ativos enquanto o bot estiver em uso.

## Como o bot funciona

1. Um bot externo publica uma mensagem no canal de filas do Discord, com nome do cliente, valor esperado e chave Pix do mediador.
2. LuizBot le essa mensagem, extrai os tres dados pelas regexes configuradas e registra o pedido como pendente no banco local.
3. O cliente envia `pg Nome Sobrenome` ou `pago Nome Sobrenome` no mesmo canal.
4. LuizBot procura no Gmail comprovantes recentes, dentro da janela configurada.
5. Para aprovar, o comprovante precisa conter o nome, a chave Pix e um valor maior ou igual ao pedido.
6. O comprovante e marcado como usado, o pedido e consumido e o bot envia `.cs` (ou o texto definido em **Comando enviado ao aprovar**).

O mesmo email ou ID de transacao/E2E nao pode ser usado para dois pedidos. O bot nao envia, move, apaga nem marca emails: o acesso ao Gmail e somente leitura.

## Requisitos

- Node.js 20 ou superior. Confirme com `node --version`.
- Um bot Discord criado no [Discord Developer Portal](https://discord.com/developers/applications).
- `Message Content Intent` ativado para o bot Discord.
- Bot convidado ao servidor com acesso ao canal de filas e permissao para ler, responder e enviar mensagens.
- Um projeto no Google Cloud com Gmail API ativada.
- Credenciais OAuth 2.0 do Google para o Gmail.

Nunca coloque token do Discord, Client Secret do Google ou tokens OAuth neste repositório, em capturas de tela ou em mensagens.

## Instalação

No terminal, entre na pasta do projeto e instale as dependencias uma unica vez:

```bash
npm install
```

Opcionalmente, crie um arquivo `.env` a partir de `.env.example` para mudar a porta ou a pasta de dados:

```env
PORT=3000
DATA_DIR=./data
```

Por padrao, os dados ficam em `data/luizbot.sqlite`. Esse arquivo contem configuracao e tokens locais; faca backup periodicamente e nao o compartilhe.

## Iniciar e parar

Para iniciar:

```bash
npm start
```

Abra [http://localhost:3000](http://localhost:3000) no navegador do mesmo computador. Deixe o terminal aberto enquanto o bot estiver operando.

Para parar com seguranca, volte ao terminal em que o bot esta rodando e pressione `Ctrl+C`. Para iniciar novamente, execute `npm start` outra vez.

Se a porta ja estiver em uso, altere `PORT` no arquivo `.env`, reinicie o processo e abra a nova porta, por exemplo `http://localhost:3001`.

## Primeira configuração

Abra o painel local e preencha os campos abaixo. Ao salvar, o cliente Discord e reiniciado automaticamente.

| Campo | O que informar | Para que serve |
| --- | --- | --- |
| Token do bot Discord | Token da pagina **Bot** no Developer Portal | Autentica LuizBot no Discord. |
| ID do servidor | ID numerico do servidor Discord | Limita o bot a esse servidor. |
| ID do canal de filas | ID numerico do canal monitorado | Canal que recebe os pedidos e comandos `pg`/`pago`. |
| ID do administrador | ID numerico do operador, se desejar registrar | Reservado para uso futuro; hoje nao concede acesso ou permissao extra. |
| ID do bot externo | ID numerico do bot que publica pedidos | Somente as mensagens desse bot sao tratadas como pedidos. |
| Comando enviado ao aprovar | Normalmente `.cs` | Texto que LuizBot envia depois de validar o comprovante. |
| Google Client ID | Client ID da credencial OAuth 2.0 | Identifica o app no Google. |
| Google Client Secret | Client Secret da mesma credencial | Permite concluir a autorizacao OAuth. |
| Janela de comprovantes em horas | De 1 a 24 | Define por quantas horas emails anteriores sao considerados. |

### Como obter IDs do Discord

No Discord, ative **Modo desenvolvedor** em Configuracoes do usuario > Avancado. Depois, clique com o botao direito no servidor, canal ou usuario e escolha **Copiar ID**. Use o ID do bot externo, nao o nome dele.

### Configurar Gmail

1. No Google Cloud, ative a Gmail API no projeto usado pelo operador.
2. Crie uma credencial OAuth 2.0 apropriada para aplicativo local e informe o Client ID e o Client Secret no painel.
3. Quando a credencial exigir URI de redirecionamento, autorize `http://localhost:3000/api/gmail/callback`. Se usar outra porta, ajuste a URI para a mesma porta.
4. Salve a configuracao no painel.
5. Clique em **Conectar Gmail**, entre na conta que recebe os comprovantes e conceda apenas o acesso solicitado.
6. Ao terminar, a pagina exibira a confirmacao. Volte ao painel e confira se o status do Gmail aparece como **Conectado**.

Os tokens ficam somente no SQLite local. Se a autorizacao for revogada, refaca a conexao Gmail; nao apague o banco inteiro sem backup.

## Configurar e testar as regexes

As tres regexes dizem como ler a mensagem publicada pelo bot externo. O formato muda entre servidores, portanto teste uma mensagem real no painel antes de operar.

O padrao inicial espera algo semelhante a:

```text
Nome: Joao da Silva
Valor: R$ 10,50
Pix: mediador@example.com
```

Os valores iniciais sao:

| Campo | Regex padrao |
| --- | --- |
| Nome | `nome[:\s]+(?<name>[^\n\r]+)` |
| Valor | `(?:valor|preço|preco)[:\s]+R?\$?\s*(?<amount>\d+[\.,]\d{2})` |
| Pix | `pix[:\s]+(?<pix>[^\n\r]+)` |

Cada regex deve ter o grupo nomeado mostrado na tabela (`name`, `amount` ou `pix`) ou, como alternativa, um primeiro grupo de captura. Cole uma mensagem real, sem dados sensiveis quando possivel, em **Mensagem de exemplo** e clique em **Testar regex**. O resultado deve mostrar nome, valor em centavos e chave Pix corretamente.

Nao use uma regex que capture a linha de valor ou Pix junto com o nome. Depois de mudar o formato do bot externo, teste novamente antes de aceitar pagamentos.

## Uso diário

1. Inicie o LuizBot e confirme os status de Discord e Gmail no painel.
2. Confirme que o bot externo publicou o pedido no canal de filas.
3. O cliente envia `pg Nome Sobrenome` ou `pago Nome Sobrenome` no mesmo canal.
4. LuizBot responde que esta verificando e, se o comprovante for valido, envia o comando configurado e informa o valor validado.
5. A secao **Eventos recentes** no painel mostra registros de conexao, pedidos salvos, recusas e erros.

O bot busca o pedido pendente mais recente para o nome, dentro do mesmo canal. Se houver clientes com nomes iguais, evite manter pedidos simultaneos para eles ou confirme cuidadosamente a fila antes do comando.

## Diagnóstico

| Situacao | O que verificar |
| --- | --- |
| Discord aparece desconectado | Token, IDs, Message Content Intent, convite do bot e permissoes do canal. |
| Pedido nao foi registrado | A mensagem deve vir do `ID do bot externo`, no canal e servidor configurados, e as tres regexes devem extrair dados. |
| Gmail aparece pendente | Salve Client ID e Client Secret, depois refaca **Conectar Gmail**. |
| Comprovante foi recusado | Confira nome, chave Pix, valor, janela de horas e o formato real do email. |
| `.cs` nao foi enviado | Confira a permissao de enviar mensagens do bot e os eventos recentes. |
| Painel nao abre | Confirme que `npm start` esta em execucao e que a porta configurada esta livre. |

## Limites importantes

- O painel nao possui login. Acesse apenas por `localhost`; nao exponha a porta para a rede.
- `ID do administrador` ainda nao e um controle de acesso.
- LuizBot envia apenas o comando configurado. Ele nao cria canais ou salas de Free Fire.
- A extracao atual escolhe o maior valor monetario encontrado no comprovante. Comprovantes que mostram saldo, tarifa e valor da transferencia precisam ser testados antes do uso em producao.
- Se o envio do comando Discord falhar depois de consumir o comprovante, ele continuara marcado como usado. Consulte os eventos antes de tentar novamente.

## Verificações técnicas

Para conferir a instalacao e executar os testes automatizados:

```bash
npm test
node --check src/index.js
```

Antes de usar em producao, faca um teste completo em um servidor Discord de homologacao com uma mensagem real do bot externo e um comprovante real. Nao use dados confidenciais em exemplos, logs ou commits.
