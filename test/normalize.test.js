const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeName, normalizePix, parseMoneyToCents } = require('../src/lib/normalize');

test('normaliza nome removendo acentos e pontuacao', () => {
  assert.equal(normalizeName(' Joao  d\'Avila! '), 'joao d avila');
});

test('normaliza chave Pix preservando caracteres relevantes', () => {
  assert.equal(normalizePix(' Mediador + Pix@Email.Com '), 'mediador+pix@email.com');
});

test('converte valores BRL em centavos', () => {
  assert.equal(parseMoneyToCents('R$ 1.234,56'), 123456);
  assert.equal(parseMoneyToCents('10,50'), 1050);
  assert.equal(parseMoneyToCents('valor inexistente'), null);
});
