function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s@.+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeName(value) {
  return normalizeText(value).replace(/[^a-z0-9\s]/g, '').trim();
}

function normalizePix(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

function parseMoneyToCents(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/(\d{1,3}(?:[.\s]\d{3})*|\d+)([,.]\d{2})?/);
  if (!match) return null;
  const integer = match[1].replace(/[.\s]/g, '');
  const decimal = match[2] ? match[2].slice(1) : '00';
  return Number(integer) * 100 + Number(decimal.padEnd(2, '0').slice(0, 2));
}

function formatMoney(cents) {
  return (Number(cents || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

module.exports = {
  normalizeText,
  normalizeName,
  normalizePix,
  parseMoneyToCents,
  formatMoney
};
