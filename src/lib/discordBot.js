const {
  Client,
  GatewayIntentBits,
  Partials,
  Events
} = require('discord.js');
const { isDiscordReady } = require('./config');
const { logEvent } = require('./db');
const {
  extractOrderFromMessage,
  saveOrder,
  findLatestPendingOrder,
  consumeOrder,
  extractPaymentName
} = require('./orders');
const { formatMoney } = require('./normalize');

function createDiscordBot(db, gmail) {
  let client = null;
  let currentStatus = {
    connected: false,
    ready: false,
    userTag: null,
    error: null
  };

  async function restart(config) {
    await stop();

    if (!isDiscordReady(config)) {
      currentStatus = {
        connected: false,
        ready: false,
        userTag: null,
        error: 'Configuração do Discord incompleta.'
      };
      return currentStatus;
    }

    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ],
      partials: [Partials.Channel]
    });

    client.once(Events.ClientReady, (readyClient) => {
      currentStatus = {
        connected: true,
        ready: true,
        userTag: readyClient.user.tag,
        error: null
      };
      logEvent(db, 'info', 'Bot Discord conectado.', { userTag: readyClient.user.tag });
    });

    client.on(Events.MessageCreate, async (message) => {
      try {
        await handleMessage(config, message);
      } catch (error) {
        logEvent(db, 'error', 'Erro ao processar mensagem Discord.', { error: error.message });
        if (message.channelId === config.queueChannelId) {
          await safeReply(message, `Falha ao validar pagamento: ${error.message}`);
        }
      }
    });

    client.on(Events.Error, (error) => {
      currentStatus.error = error.message;
      logEvent(db, 'error', 'Erro do cliente Discord.', { error: error.message });
    });

    try {
      await client.login(config.discordToken);
      currentStatus.connected = true;
      currentStatus.error = null;
    } catch (error) {
      currentStatus = {
        connected: false,
        ready: false,
        userTag: null,
        error: error.message
      };
      logEvent(db, 'error', 'Falha ao conectar Discord.', { error: error.message });
      await stop();
    }

    return currentStatus;
  }

  async function stop() {
    if (client) {
      await client.destroy();
      client = null;
    }
    currentStatus = {
      ...currentStatus,
      connected: false,
      ready: false,
      userTag: null
    };
  }

  function status() {
    return currentStatus;
  }

  async function handleMessage(config, message) {
    if (message.author.bot && message.author.id !== config.sourceBotId) return;
    if (message.channelId !== config.queueChannelId) return;
    if (config.guildId && message.guildId !== config.guildId) return;

    if (message.author.id === config.sourceBotId) {
      const result = extractOrderFromMessage(config, message.content);
      if (result.ok) {
        saveOrder(db, message, result.order);
        logEvent(db, 'info', 'Pedido pendente registrado.', {
          messageId: message.id,
          name: result.order.requesterName,
          amount: result.order.expectedAmountCents
        });
      } else {
        logEvent(db, 'warn', 'Mensagem do bot externo ignorada.', { reason: result.error, messageId: message.id });
      }
      return;
    }

    const paymentName = extractPaymentName(message.content);
    if (!paymentName) return;

    const order = findLatestPendingOrder(db, message.channelId, paymentName);
    if (!order) {
      await safeReply(message, `Não encontrei pedido pendente para ${paymentName}.`);
      return;
    }

    await safeReply(message, `Verificando comprovante de ${paymentName}...`);
    const receiptResult = await gmail.findReceipt(config, order);
    if (!receiptResult.ok) {
      await safeReply(message, receiptResult.reason);
      logEvent(db, 'warn', 'Comprovante recusado.', { orderId: order.id, reason: receiptResult.reason });
      return;
    }

    const tx = db.transaction(() => {
      gmail.markReceiptUsed(receiptResult.receipt, order.id);
      consumeOrder(db, order.id);
    });
    tx();

    await message.channel.send(config.csCommand || '.cs');
    await safeReply(
      message,
      `Comprovante validado: ${formatMoney(receiptResult.receipt.amountCents)} para ${order.requester_name}.`
    );
    logEvent(db, 'info', 'Comprovante validado e comando enviado.', {
      orderId: order.id,
      gmailMessageId: receiptResult.receipt.gmailMessageId
    });
  }

  return {
    restart,
    stop,
    status
  };
}

async function safeReply(message, content) {
  try {
    await message.reply({ content, allowedMentions: { repliedUser: false } });
  } catch (_error) {
    await message.channel.send(content);
  }
}

module.exports = { createDiscordBot };
