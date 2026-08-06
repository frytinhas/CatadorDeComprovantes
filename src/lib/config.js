const DEFAULT_CONFIG = {
  discordToken: '',
  guildId: '',
  queueChannelId: '',
  adminUserId: '',
  sourceBotId: '',
  csCommand: '.cs',
  gmailClientId: '',
  gmailClientSecret: '',
  nameRegex: 'nome[:\\s]+(?<name>[^\\n\\r]+)',
  amountRegex: '(?:valor|preço|preco)[:\\s]+R?\\$?\\s*(?<amount>\\d+[\\.,]\\d{2})',
  pixRegex: 'pix[:\\s]+(?<pix>[^\\n\\r]+)',
  receiptWindowHours: 24
};

const SECRET_KEYS = new Set(['discordToken', 'gmailClientSecret']);

function loadConfig(db) {
  const row = db.prepare('select value from settings where key = ?').get('config');
  if (!row) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...JSON.parse(row.value) };
}

function saveConfig(db, input) {
  const current = loadConfig(db);
  const next = { ...current };

  for (const key of Object.keys(DEFAULT_CONFIG)) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value = input[key];
      if (SECRET_KEYS.has(key) && value === '__KEEP__') continue;
      next[key] = typeof DEFAULT_CONFIG[key] === 'number' ? Number(value || DEFAULT_CONFIG[key]) : String(value || '').trim();
    }
  }

  db.prepare(`
    insert into settings (key, value) values (?, ?)
    on conflict(key) do update set value = excluded.value
  `).run('config', JSON.stringify(next));

  return next;
}

function publicConfig(config) {
  return {
    ...config,
    discordToken: config.discordToken ? '__SET__' : '',
    gmailClientSecret: config.gmailClientSecret ? '__SET__' : ''
  };
}

function isDiscordReady(config) {
  return Boolean(config.discordToken && config.guildId && config.queueChannelId && config.sourceBotId);
}

function isGmailConfigReady(config) {
  return Boolean(config.gmailClientId && config.gmailClientSecret);
}

module.exports = {
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  publicConfig,
  isDiscordReady,
  isGmailConfigReady
};
