const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const handlers = {};
let sent = [];
const fakeElectron = {
  ipcMain: {
    handle(channel, fn) {
      handlers[channel] = fn;
    },
  },
  dialog: {
    async showOpenDialog() {
      return { canceled: true };
    },
  },
  BrowserWindow: {
    fromWebContents() {
      return null;
    },
  },
};

const origLoad = Module._load;
Module._load = function interceptor(request, parent, isMain) {
  if (request === 'electron') return fakeElectron;
  return origLoad.call(this, request, parent, isMain);
};
const C = require('../../src/shared/channels.cjs');
const { register } = require('../../src/main/ipc.cjs');
Module._load = origLoad;

const SettingsStore = require('../../src/main/settings-store.cjs');
const ConversationStore = require('../../src/main/conversation-store.cjs');

const requests = [];
const serverBodies = [];
const waitFor = async (fn, timeout = 3000) => {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeout) throw new Error('timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 5));
  }
};

describe('IPC handlers against a mock Ollama server', () => {
  let server;
  let port;
  let dir;

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nous-ipc-test-'));
    serverBodies.length = 0;

    server = http.createServer((req, res) => {
      if (req.url === '/api/tags') {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ models: [{ name: 'test-model', size: 123 }] }));
        return;
      }
      if (req.url === '/api/chat') {
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', () => serverBodies.push(raw));
        res.writeHead(200, { 'content-type': 'application/x-ndjson' });
        res.write(JSON.stringify({ message: { content: 'Hel' }, done: false }) + '\n');
        setTimeout(() => {
          res.write(JSON.stringify({ message: { content: 'lo' }, done: false }) + '\n');
          res.write(JSON.stringify({ message: {}, done: true }) + '\n');
          res.end();
        }, 30);
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;

    const settings = new SettingsStore(dir);
    const conversations = new ConversationStore(dir);
    settings.update({ ollamaHost: `http://127.0.0.1:${port}` });
    register({ settings, conversations, windows: { openCompanion: async () => ({}), setPinned: () => {} } });
    requests.push({ conversations });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const store = () => requests[0].conversations;
  const event = (id = 1) => ({
    sender: { id, send: (channel, payload) => sent.push({ channel, payload }) },
  });
  const invoke = (channel, ev = event(), ...args) => handlers[channel](ev, ...args);

  it('lists models from the Ollama endpoint', async () => {
    const models = await invoke(C.MODELS_LIST);
    assert.deepEqual(models, [{ name: 'test-model', size: 123, details: {} }]);
  });

  it('streams a chat, persists messages, and completes', async () => {
    sent = [];
    serverBodies.length = 0;
    const conv = await store().create('test-model');
    const result = await invoke(C.CHAT_SEND, event(2), {
      conversationId: conv.id,
      model: 'test-model',
      prompt: 'hello',
    });
    assert.equal(result.conversationId, conv.id);

    const chunks = sent.filter((s) => s.channel === C.CHAT_CHUNK);
    assert.deepEqual(chunks.map((c) => c.payload.content), ['Hel', 'lo', '']);
    assert.ok(sent.some((s) => s.channel === C.CHAT_COMPLETE));

    const latest = store().read(conv.id);
    assert.equal(latest.messages[0].content, 'hello');
    assert.equal(latest.messages[1].content, 'Hello');
    assert.deepEqual(JSON.parse(serverBodies[0]).messages.map((m) => m.role), ['user']);
  });

  it('sends explicit context as a system message in the same request', async () => {
    sent = [];
    serverBodies.length = 0;
    const conv = await store().create('test-model');
    const context = { kind: 'selection', label: 'Clipboard', content: 'Tax notes' };
    await invoke(C.CHAT_SEND, event(3), {
      conversationId: conv.id,
      model: 'test-model',
      prompt: 'summarise',
      context,
    });
    const body = JSON.parse(serverBodies[0]);
    assert.deepEqual(body.messages.map((m) => m.role), ['system', 'user']);
    assert.match(body.messages[0].content, /Tax notes/);
    const saved = store().read(conv.id);
    assert.deepEqual(saved.messages[0].contextRefs, [context]);
  });

  it('cancelling mid-stream reports "Generation stopped."', async () => {
    sent = [];
    const ev = event(4);
    const conv = await store().create('test-model');
    const pending = invoke(C.CHAT_SEND, ev, {
      conversationId: conv.id,
      model: 'test-model',
      prompt: 'slow',
    });
    await waitFor(() => sent.some((s) => s.channel === C.CHAT_CHUNK && s.payload.content === 'Hel'));
    await invoke(C.CHAT_CANCEL, ev);
    await assert.rejects(pending, (err) => err.name === 'AbortError');
    assert.ok(
      sent.some((s) => s.channel === C.CHAT_ERROR && s.payload.message === 'Generation stopped.')
    );
  });

  it('rejects invalid chat payloads', async () => {
    await assert.rejects(invoke(C.CHAT_SEND, event(), {}), /prompt and model/);
    await assert.rejects(
      invoke(C.CHAT_SEND, event(), { model: 'm', prompt: 'x'.repeat(24001) }),
      /prompt and model/
    );
  });

  it('validates settings updates', async () => {
    await assert.rejects(async () => invoke(C.SETTINGS_UPDATE, event(), null), /Invalid settings/);
    await assert.rejects(
      async () => invoke(C.SETTINGS_UPDATE, event(), { ollamaHost: 'ftp://x' }),
      /http/
    );
    await assert.rejects(
      async () => invoke(C.SETTINGS_UPDATE, event(), { companionAlwaysOnTop: 'yes' }),
      /Invalid companionAlwaysOnTop/
    );
    const next = await invoke(C.SETTINGS_UPDATE, event(), {
      ollamaHost: `http://127.0.0.1:${port}/`,
      lastModel: 't',
    });
    assert.equal(next.ollamaHost, `http://127.0.0.1:${port}`);
    assert.equal(next.lastModel, 't');
  });

  it('normalizes context attachments', async () => {
    assert.equal(await invoke(C.CONTEXT_ATTACH, event(), { kind: 'file' }), null);
    const weird = await invoke(C.CONTEXT_ATTACH, event(), { kind: 'weird', content: 'abc' });
    assert.equal(weird.kind, 'selection');
    assert.equal(weird.content, 'abc');
    const long = await invoke(C.CONTEXT_ATTACH, event(), {
      kind: 'window',
      label: 'L'.repeat(200),
    });
    assert.equal(long.label.length, 120);
  });

  it('supports conversation create, update, and delete via IPC', async () => {
    const created = await invoke(C.CONVERSATIONS_CREATE, event(), 'test-model');
    assert.ok(store().read(created.id));
    const updated = await invoke(C.CONVERSATIONS_UPDATE, event(), created.id, { title: 'T' });
    assert.equal(updated.title, 'T');
    await invoke(C.CONVERSATIONS_DELETE, event(), created.id);
    assert.equal(store().read(created.id), null);
  });
});