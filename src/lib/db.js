const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function initDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, 'luizbot.sqlite'));
  db.pragma('journal_mode = WAL');

  db.exec(`
    create table if not exists settings (
      key text primary key,
      value text not null
    );

    create table if not exists orders (
      id integer primary key autoincrement,
      discord_message_id text not null unique,
      channel_id text not null,
      requester_name text not null,
      normalized_name text not null,
      expected_amount_cents integer not null,
      pix_key text not null,
      raw_message text not null,
      status text not null default 'pending',
      created_at integer not null,
      consumed_at integer
    );

    create index if not exists idx_orders_match
      on orders (normalized_name, channel_id, status, created_at);

    create table if not exists used_receipts (
      id integer primary key autoincrement,
      gmail_message_id text not null unique,
      transaction_id text,
      normalized_name text not null,
      amount_cents integer not null,
      used_for_order_id integer not null,
      used_at integer not null
    );

    create unique index if not exists idx_used_receipts_transaction
      on used_receipts (transaction_id)
      where transaction_id is not null and transaction_id != '';

    create table if not exists events (
      id integer primary key autoincrement,
      level text not null,
      message text not null,
      meta text,
      created_at integer not null
    );
  `);

  return db;
}

function logEvent(db, level, message, meta = null) {
  db.prepare('insert into events (level, message, meta, created_at) values (?, ?, ?, ?)')
    .run(level, message, meta ? JSON.stringify(meta) : null, Date.now());
}

function listRecentEvents(db, limit = 20) {
  return db.prepare(`
    select id, level, message, meta, created_at
    from events
    order by created_at desc, id desc
    limit ?
  `).all(limit);
}

module.exports = { initDb, logEvent, listRecentEvents };
