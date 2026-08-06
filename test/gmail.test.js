const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { _testing } = require('../src/lib/gmail');

function makeDb() {
  const db = new Database(':memory:');
  db.exec(`
    create table used_receipts (
      id integer primary key,
      gmail_message_id text not null unique,
      transaction_id text,
      normalized_name text not null,
      amount_cents integer not null,
      used_for_order_id integer not null,
      used_at integer not null
    );
  `);
  return db;
}

const order = {
  requester_name: 'Joao da Silva',
  pix_key: 'mediador@example.com',
  expected_amount_cents: 1050
};

test('valida comprovante com nome, Pix e valor suficiente', () => {
  const db = makeDb();
  const result = _testing.evaluateReceipt(db, {
    id: 'gmail-1',
    text: 'Pix para mediador@example.com\nJoao da Silva\nValor R$ 10,50\nE2E: E12345678901234567890',
    normalizedText: 'pix para mediador@example.com joao da silva valor r 10 50 e2e e12345678901234567890'
  }, order);

  assert.equal(result.ok, true);
  assert.equal(result.amountCents, 1050);
  assert.equal(result.transactionId, 'E12345678901234567890');
  db.close();
});

test('recusa comprovante reutilizado pelo ID da transacao', () => {
  const db = makeDb();
  db.prepare(`insert into used_receipts values (1, 'gmail-anterior', 'E12345678901234567890', 'joao da silva', 1050, 1, 0)`).run();
  const result = _testing.evaluateReceipt(db, {
    id: 'gmail-2',
    text: 'Pix para mediador@example.com Joao da Silva R$ 10,50 E2E: E12345678901234567890',
    normalizedText: 'pix para mediador@example.com joao da silva r 10 50 e2e e12345678901234567890'
  }, order);

  assert.deepEqual(result, { ok: false, reason: 'Comprovante já utilizado.' });
  db.close();
});
