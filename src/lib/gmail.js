const { google } = require('googleapis');
const { isGmailConfigReady } = require('./config');
const { normalizeName, normalizePix, normalizeText, parseMoneyToCents } = require('./normalize');

const TOKEN_KEY = 'gmail_tokens';
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

function createGmailService(db) {
  function makeClient(config, redirectUri) {
    return new google.auth.OAuth2(config.gmailClientId, config.gmailClientSecret, redirectUri);
  }

  function getStoredTokens() {
    const row = db.prepare('select value from settings where key = ?').get(TOKEN_KEY);
    return row ? JSON.parse(row.value) : null;
  }

  function saveTokens(tokens) {
    db.prepare(`
      insert into settings (key, value) values (?, ?)
      on conflict(key) do update set value = excluded.value
    `).run(TOKEN_KEY, JSON.stringify(tokens));
  }

  function getAuthUrl(config, redirectUri) {
    if (!isGmailConfigReady(config)) {
      return { ok: false, error: 'Configure Client ID e Client Secret do Google primeiro.' };
    }

    const client = makeClient(config, redirectUri);
    return {
      ok: true,
      url: client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES
      })
    };
  }

  async function handleCallback(config, code, redirectUri) {
    if (!code) throw new Error('Código OAuth ausente.');
    const client = makeClient(config, redirectUri);
    const { tokens } = await client.getToken(code);
    saveTokens(tokens);
  }

  async function status() {
    return {
      configured: Boolean(getStoredTokens()),
      hasRefreshToken: Boolean(getStoredTokens()?.refresh_token)
    };
  }

  async function findReceipt(config, order) {
    const tokens = getStoredTokens();
    if (!tokens) {
      return { ok: false, reason: 'Gmail não conectado.' };
    }

    const client = makeClient(config, 'http://localhost');
    client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: client });

    const afterSeconds = Math.floor((Date.now() - Number(config.receiptWindowHours || 24) * 60 * 60 * 1000) / 1000);
    const terms = buildSearchTerms(order);
    const query = `after:${afterSeconds} (${terms.join(' OR ')})`;
    const list = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 10
    });

    const messages = list.data.messages || [];
    const candidates = [];

    for (const message of messages) {
      if (isReceiptUsed(db, message.id, null)) continue;
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full'
      });
      const parsed = parseMessage(full.data);
      const evaluation = evaluateReceipt(db, parsed, order);
      if (evaluation.ok) {
        candidates.push({ ...evaluation, gmailMessageId: message.id, internalDate: Number(full.data.internalDate || 0) });
      }
    }

    candidates.sort((a, b) => b.internalDate - a.internalDate);
    if (!candidates.length) {
      return {
        ok: false,
        reason: `Nenhum comprovante válido encontrado nas últimas ${config.receiptWindowHours || 24} horas.`
      };
    }

    return { ok: true, receipt: candidates[0] };
  }

  function markReceiptUsed(receipt, orderId) {
    db.prepare(`
      insert into used_receipts (
        gmail_message_id, transaction_id, normalized_name, amount_cents, used_for_order_id, used_at
      ) values (?, ?, ?, ?, ?, ?)
    `).run(
      receipt.gmailMessageId,
      receipt.transactionId || null,
      receipt.normalizedName,
      receipt.amountCents,
      orderId,
      Date.now()
    );
  }

  return {
    getAuthUrl,
    handleCallback,
    status,
    findReceipt,
    markReceiptUsed
  };
}

function buildSearchTerms(order) {
  const parts = [
    `"${order.requester_name || order.requesterName}"`,
    `"${order.pix_key || order.pixKey}"`,
    'pix',
    'comprovante',
    'transferência',
    'transferencia'
  ];
  return parts.filter(Boolean);
}

function parseMessage(message) {
  const headers = Object.fromEntries((message.payload?.headers || []).map((header) => [header.name.toLowerCase(), header.value]));
  const text = `${headers.subject || ''}\n${extractBody(message.payload)}`;
  return {
    id: message.id,
    internalDate: Number(message.internalDate || 0),
    text,
    normalizedText: normalizeText(text)
  };
}

function extractBody(payload) {
  if (!payload) return '';
  const chunks = [];
  walkParts(payload, chunks);
  return chunks.join('\n');
}

function walkParts(part, chunks) {
  if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
    const data = part.body?.data;
    if (data) {
      chunks.push(Buffer.from(data, 'base64url').toString('utf8').replace(/<[^>]+>/g, ' '));
    }
  }

  for (const child of part.parts || []) {
    walkParts(child, chunks);
  }
}

function evaluateReceipt(db, parsed, order) {
  const text = parsed.text;
  const normalizedText = parsed.normalizedText;
  const expectedName = normalizeName(order.requester_name || order.requesterName);
  const expectedPix = normalizePix(order.pix_key || order.pixKey);

  if (!includesAllNameParts(normalizedText, expectedName)) {
    return { ok: false, reason: 'Nome não encontrado no comprovante.' };
  }

  if (expectedPix && !normalizedText.includes(expectedPix)) {
    return { ok: false, reason: 'Pix do mediador não encontrado no comprovante.' };
  }

  const amountCents = extractBestAmount(text);
  const expectedAmount = Number(order.expected_amount_cents || order.expectedAmountCents);
  if (!amountCents || amountCents < expectedAmount) {
    return { ok: false, reason: 'Valor pago menor que o esperado.' };
  }

  const transactionId = extractTransactionId(text);
  if (isReceiptUsed(db, parsed.id, transactionId)) {
    return { ok: false, reason: 'Comprovante já utilizado.' };
  }

  return {
    ok: true,
    normalizedName: expectedName,
    amountCents,
    transactionId
  };
}

function includesAllNameParts(normalizedText, normalizedName) {
  const parts = normalizedName.split(/\s+/).filter((part) => part.length > 1);
  return parts.length > 0 && parts.every((part) => normalizedText.includes(part));
}

function extractBestAmount(text) {
  const matches = [...String(text || '').matchAll(/(?:R\$\s*)?(\d{1,3}(?:[.\s]\d{3})*|\d+)[,.](\d{2})/g)];
  const amounts = matches.map((match) => parseMoneyToCents(match[0])).filter(Boolean);
  if (!amounts.length) return null;
  return Math.max(...amounts);
}

function extractTransactionId(text) {
  const patterns = [
    /(?:e2e|endtoendid|id\s+da\s+transa[cç][aã]o|transa[cç][aã]o)[:\s-]+([A-Z0-9]{12,})/i,
    /\b(E\d{20,})\b/i
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text || '');
    if (match) return match[1].trim();
  }
  return null;
}

function isReceiptUsed(db, gmailMessageId, transactionId) {
  if (gmailMessageId) {
    const byEmail = db.prepare('select id from used_receipts where gmail_message_id = ?').get(gmailMessageId);
    if (byEmail) return true;
  }
  if (transactionId) {
    const byTransaction = db.prepare('select id from used_receipts where transaction_id = ?').get(transactionId);
    if (byTransaction) return true;
  }
  return false;
}

module.exports = {
  createGmailService,
  _testing: {
    buildSearchTerms,
    parseMessage,
    evaluateReceipt,
    includesAllNameParts,
    extractBestAmount,
    extractTransactionId
  }
};
