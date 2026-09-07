const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const channels = require('../../src/shared/channels.cjs');

describe('channels', () => {
  it('exports all required channel constants', () => {
    assert.equal(channels.MODELS_LIST, 'models:list');
    assert.equal(channels.MODELS_REFRESH, 'models:refresh');
    assert.equal(channels.SETTINGS_READ, 'settings:read');
    assert.equal(channels.SETTINGS_UPDATE, 'settings:update');
    assert.equal(channels.CONNECTION_TEST, 'connection:test');
    assert.equal(channels.CONVERSATIONS_LIST, 'conversations:list');
    assert.equal(channels.CONVERSATIONS_CREATE, 'conversations:create');
    assert.equal(channels.CONVERSATIONS_READ, 'conversations:read');
    assert.equal(channels.CONVERSATIONS_UPDATE, 'conversations:update');
    assert.equal(channels.CONVERSATIONS_DELETE, 'conversations:delete');
    assert.equal(channels.CHAT_SEND, 'chat:send');
    assert.equal(channels.CHAT_CANCEL, 'chat:cancel');
    assert.equal(channels.CHAT_CHUNK, 'chat:chunk');
    assert.equal(channels.CHAT_COMPLETE, 'chat:complete');
    assert.equal(channels.CHAT_ERROR, 'chat:error');
    assert.equal(channels.COMPANION_OPEN, 'companion:open');
    assert.equal(channels.COMPANION_PIN, 'companion:set-always-on-top');
    assert.equal(channels.CONTEXT_ATTACH, 'context:attach');
    assert.equal(channels.CONTEXT_REMOVE, 'context:remove');
  });

  it('has no duplicate values', () => {
    const values = Object.values(channels);
    const unique = new Set(values);
    assert.equal(values.length, unique.size, 'Duplicate channel values found');
  });

  it('all values follow domain:action pattern', () => {
    const values = Object.values(channels);
    for (const v of values) {
      assert.match(v, /^[a-z]+:[a-z-]+$/, `Invalid channel format: ${v}`);
    }
  });
});
