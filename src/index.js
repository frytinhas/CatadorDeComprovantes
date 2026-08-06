require('dotenv').config();

const express = require('express');
const path = require('path');
const { initDb, listRecentEvents } = require('./lib/db');
const { loadConfig, saveConfig, publicConfig } = require('./lib/config');
const { createGmailService } = require('./lib/gmail');
const { createDiscordBot } = require('./lib/discordBot');

const app = express();
const port = Number(process.env.PORT || 3000);
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');

const db = initDb(dataDir);
const gmail = createGmailService(db);
const discordBot = createDiscordBot(db, gmail);

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/config', (_req, res) => {
  res.json(publicConfig(loadConfig(db)));
});

app.post('/api/config', async (req, res) => {
  const config = saveConfig(db, req.body || {});
  await discordBot.restart(config);
  res.json(publicConfig(config));
});

app.get('/api/status', async (_req, res) => {
  res.json({
    discord: discordBot.status(),
    gmail: await gmail.status(),
    stats: {
      pendingOrders: db.prepare('select count(*) as count from orders where status = ?').get('pending').count,
      usedReceipts: db.prepare('select count(*) as count from used_receipts').get().count
    }
  });
});

app.get('/api/events', (req, res) => {
  const requestedLimit = Number(req.query.limit || 20);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
  res.json(listRecentEvents(db, limit));
});

app.get('/api/gmail/auth-url', (req, res) => {
  const config = loadConfig(db);
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const result = gmail.getAuthUrl(config, `${baseUrl}/api/gmail/callback`);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

app.get('/api/gmail/callback', async (req, res) => {
  try {
    await gmail.handleCallback(loadConfig(db), req.query.code, `${req.protocol}://${req.get('host')}/api/gmail/callback`);
    res.send('<h1>Gmail conectado</h1><p>Você já pode voltar ao painel do Catador de Comprovantes.</p>');
  } catch (error) {
    res.status(400).send(`<h1>Erro ao conectar Gmail</h1><pre>${escapeHtml(error.message)}</pre>`);
  }
});

app.post('/api/test-regex', (req, res) => {
  const { testRegexExtraction } = require('./lib/orders');
  res.json(testRegexExtraction(req.body || {}));
});

app.post('/api/discord/restart', async (_req, res) => {
  await discordBot.restart(loadConfig(db));
  res.json(discordBot.status());
});

app.listen(port, async () => {
  console.log(`Painel local: http://localhost:${port}`);
  await discordBot.restart(loadConfig(db));
});

process.on('SIGINT', async () => {
  await discordBot.stop();
  process.exit(0);
});

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
