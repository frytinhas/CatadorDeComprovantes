const form = document.querySelector('#configForm');
const message = document.querySelector('#message');
const saveButton = document.querySelector('#saveButton');
const testRegexButton = document.querySelector('#testRegexButton');
const gmailButton = document.querySelector('#gmailButton');
const regexResult = document.querySelector('#regexResult');
const eventList = document.querySelector('#eventList');

const secretFields = new Set(['discordToken', 'gmailClientSecret']);

async function loadConfig() {
  const config = await fetchJson('/api/config');
  for (const [key, value] of Object.entries(config)) {
    const field = form.elements[key];
    if (!field) continue;
    field.value = value === '__SET__' ? '' : value;
    if (value === '__SET__') {
      field.placeholder = 'Configurado. Preencha apenas se quiser trocar.';
      field.dataset.isSet = 'true';
    }
  }
}

async function loadStatus() {
  const status = await fetchJson('/api/status');
  document.querySelector('#discordStatus').textContent = status.discord.ready
    ? status.discord.userTag
    : status.discord.error || 'Desconectado';
  document.querySelector('#gmailStatus').textContent = status.gmail.configured ? 'Conectado' : 'Pendente';
  document.querySelector('#statsText').textContent =
    `${status.stats.pendingOrders} pedidos pendentes, ${status.stats.usedReceipts} comprovantes usados.`;
}

async function loadEvents() {
  const events = await fetchJson('/api/events?limit=20');
  eventList.replaceChildren();

  if (!events.length) {
    const item = document.createElement('li');
    item.textContent = 'Nenhum evento registrado.';
    eventList.append(item);
    return;
  }

  for (const event of events) {
    const item = document.createElement('li');
    const timestamp = new Date(event.created_at).toLocaleString('pt-BR');
    item.textContent = `${timestamp} - ${event.level.toUpperCase()}: ${event.message}`;
    eventList.append(item);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  setMessage('Salvando configuração...');

  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    for (const fieldName of secretFields) {
      const field = form.elements[fieldName];
      if (field?.dataset.isSet === 'true' && !payload[fieldName]) {
        payload[fieldName] = '__KEEP__';
      }
    }
    await fetchJson('/api/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setMessage('Configuração salva.');
    await loadConfig();
    await loadStatus();
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    saveButton.disabled = false;
  }
});

testRegexButton.addEventListener('click', async () => {
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.sampleMessage = document.querySelector('#sampleMessage').value;

  try {
    const result = await fetchJson('/api/test-regex', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    regexResult.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    regexResult.textContent = error.message;
  }
});

gmailButton.addEventListener('click', async () => {
  try {
    const result = await fetchJson('/api/gmail/auth-url');
    window.open(result.url, '_blank', 'noopener,noreferrer');
  } catch (error) {
    setMessage(error.message, true);
  }
});

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(body.error || response.statusText);
  return body;
}

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

loadConfig()
  .then(async () => {
    await Promise.all([loadStatus(), loadEvents()]);
  })
  .catch((error) => setMessage(error.message, true));
setInterval(() => {
  loadStatus().catch(() => {});
  loadEvents().catch(() => {});
}, 8000);
