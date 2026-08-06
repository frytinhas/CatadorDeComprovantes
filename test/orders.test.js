const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_CONFIG } = require('../src/lib/config');
const { extractOrderFromMessage, extractPaymentName } = require('../src/lib/orders');

test('extrai pedido sem incluir a linha seguinte no nome', () => {
  const result = extractOrderFromMessage(DEFAULT_CONFIG, [
    'Nome: Joao da Silva',
    'Valor: R$ 10,50',
    'Pix: mediador@example.com'
  ].join('\n'));

  assert.equal(result.ok, true);
  assert.deepEqual(result.order, {
    requesterName: 'Joao da Silva',
    normalizedName: 'joao da silva',
    expectedAmountCents: 1050,
    pixKey: 'mediador@example.com'
  });
});

test('aceita pg e pago, mas exige um nome', () => {
  assert.equal(extractPaymentName('pg Joao da Silva'), 'Joao da Silva');
  assert.equal(extractPaymentName('PAGO Joao da Silva'), 'Joao da Silva');
  assert.equal(extractPaymentName('pg'), null);
});
