const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ConversationStore = require('../../src/main/conversation-store.cjs');

function waitSync(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

describe('ConversationStore', () => {
  let tmpDir;
  let store;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nous-test-'));
    store = new ConversationStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('create', () => {
    it('creates a conversation with default title', () => {
      const conv = store.create('llama3');
      assert.equal(conv.title, 'New conversation');
      assert.equal(conv.model, 'llama3');
      assert.deepEqual(conv.messages, []);
      assert.ok(conv.id);
      assert.ok(conv.createdAt);
      assert.ok(conv.updatedAt);
    });

    it('creates a conversation with empty model', () => {
      const conv = store.create();
      assert.equal(conv.model, '');
    });
  });

  describe('read', () => {
    it('returns a conversation by id', () => {
      const conv = store.create('llama3');
      const read = store.read(conv.id);
      assert.equal(read.id, conv.id);
      assert.equal(read.model, 'llama3');
    });

    it('returns null for missing id', () => {
      assert.equal(store.read('nonexistent'), null);
    });
  });

  describe('list', () => {
    it('returns conversations sorted by updatedAt descending', () => {
      const a = store.create('model-a');
      waitSync(5);
      const b = store.create('model-b');
      const list = store.list();
      assert.equal(list.length, 2);
      assert.equal(list[0].id, b.id);
      assert.equal(list[1].id, a.id);
    });

    it('strips messages from list items', () => {
      const conv = store.create('llama3');
      store.append(conv.id, { role: 'user', content: 'hello' });
      const list = store.list();
      assert.equal(list.length, 1);
      assert.equal(list[0].messages, undefined);
    });
  });

  describe('append', () => {
    it('appends a message to a conversation', () => {
      const conv = store.create('llama3');
      store.append(conv.id, { role: 'user', content: 'hello' });
      const read = store.read(conv.id);
      assert.equal(read.messages.length, 1);
      assert.equal(read.messages[0].role, 'user');
      assert.equal(read.messages[0].content, 'hello');
      assert.ok(read.messages[0].id);
      assert.ok(read.messages[0].createdAt);
    });

    it('auto-titles from first user message', () => {
      const conv = store.create('llama3');
      store.append(conv.id, { role: 'user', content: 'What is 2+2?' });
      const read = store.read(conv.id);
      assert.equal(read.title, 'What is 2+2?');
    });

    it('truncates auto-title to 56 chars', () => {
      const conv = store.create('llama3');
      const longTitle = 'a'.repeat(100);
      store.append(conv.id, { role: 'user', content: longTitle });
      const read = store.read(conv.id);
      assert.equal(read.title.length, 56);
    });

    it('does not change title on assistant message', () => {
      const conv = store.create('llama3');
      store.append(conv.id, { role: 'assistant', content: 'hello' });
      const read = store.read(conv.id);
      assert.equal(read.title, 'New conversation');
    });

    it('does not change title after first user message', () => {
      const conv = store.create('llama3');
      store.append(conv.id, { role: 'user', content: 'first' });
      store.append(conv.id, { role: 'user', content: 'second' });
      const read = store.read(conv.id);
      assert.equal(read.title, 'first');
    });

    it('throws for missing conversation', () => {
      assert.throws(() => store.append('nonexistent', { role: 'user', content: 'hi' }), /not found/i);
    });
  });

  describe('update', () => {
    it('updates conversation title', () => {
      const conv = store.create('llama3');
      store.update(conv.id, { title: 'My Chat' });
      const read = store.read(conv.id);
      assert.equal(read.title, 'My Chat');
    });

    it('updates conversation model', () => {
      const conv = store.create('llama3');
      store.update(conv.id, { model: 'mistral' });
      const read = store.read(conv.id);
      assert.equal(read.model, 'mistral');
    });

    it('truncates title to 120 chars', () => {
      const conv = store.create('llama3');
      store.update(conv.id, { title: 'a'.repeat(200) });
      const read = store.read(conv.id);
      assert.equal(read.title.length, 120);
    });

    it('throws for missing conversation', () => {
      assert.throws(() => store.update('nonexistent', { title: 'x' }), /not found/i);
    });
  });

  describe('delete', () => {
    it('removes a conversation', () => {
      const conv = store.create('llama3');
      store.delete(conv.id);
      assert.equal(store.read(conv.id), null);
      assert.equal(store.list().length, 0);
    });

    it('does not throw for missing id', () => {
      assert.doesNotThrow(() => store.delete('nonexistent'));
    });
  });
});
