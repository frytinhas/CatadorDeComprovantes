const { normalizeName, parseMoneyToCents } = require('./normalize');

function extractOrderFromMessage(config, content) {
  const name = extractNamedOrFirst(config.nameRegex, content, 'name');
  const amount = extractNamedOrFirst(config.amountRegex, content, 'amount');
  const pix = extractNamedOrFirst(config.pixRegex, content, 'pix');
  const amountCents = parseMoneyToCents(amount);

  if (!name || !amountCents || !pix) {
    return {
      ok: false,
      error: 'Mensagem do bot externo não contém nome, valor e Pix compatíveis com as regex.'
    };
  }

  return {
    ok: true,
    order: {
      requesterName: cleanName(name),
      normalizedName: normalizeName(name),
      expectedAmountCents: amountCents,
      pixKey: String(pix).trim()
    }
  };
}

function saveOrder(db, message, order) {
  db.prepare(`
    insert into orders (
      discord_message_id, channel_id, requester_name, normalized_name,
      expected_amount_cents, pix_key, raw_message, status, created_at
    ) values (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    on conflict(discord_message_id) do update set
      requester_name = excluded.requester_name,
      normalized_name = excluded.normalized_name,
      expected_amount_cents = excluded.expected_amount_cents,
      pix_key = excluded.pix_key,
      raw_message = excluded.raw_message
  `).run(
    message.id,
    message.channelId,
    order.requesterName,
    order.normalizedName,
    order.expectedAmountCents,
    order.pixKey,
    message.content,
    message.createdTimestamp || Date.now()
  );
}

function findLatestPendingOrder(db, channelId, name) {
  return db.prepare(`
    select * from orders
    where channel_id = ? and normalized_name = ? and status = 'pending'
    order by created_at desc
    limit 1
  `).get(channelId, normalizeName(name));
}

function consumeOrder(db, orderId) {
  db.prepare('update orders set status = ?, consumed_at = ? where id = ?').run('consumed', Date.now(), orderId);
}

function extractPaymentName(content) {
  const match = String(content || '').trim().match(/^(?:pg|pago)\s+(.+)$/i);
  if (!match) return null;
  return cleanName(match[1]);
}

function testRegexExtraction(input) {
  try {
    const result = extractOrderFromMessage(input, input.sampleMessage || '');
    return result;
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function extractNamedOrFirst(pattern, content, groupName) {
  if (!pattern) return null;
  const regex = new RegExp(pattern, 'i');
  const match = regex.exec(content || '');
  if (!match) return null;
  return match.groups?.[groupName] || match[1] || null;
}

function cleanName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s'-]/gu, '')
    .trim();
}

module.exports = {
  extractOrderFromMessage,
  saveOrder,
  findLatestPendingOrder,
  consumeOrder,
  extractPaymentName,
  testRegexExtraction
};
