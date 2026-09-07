const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const SettingsStore = require('../../src/main/settings-store.cjs');

describe('SettingsStore', () => {
  let tmpDir;
  let store;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nous-test-'));
    store = new SettingsStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('read', () => {
    it('returns defaults when no file exists', () => {
      const settings = store.read();
      assert.equal(settings.ollamaHost, 'http://127.0.0.1:11434');
      assert.equal(settings.lastModel, '');
      assert.equal(settings.companionAlwaysOnTop, false);
      assert.equal(settings.theme, 'light');
    });

    it('reads saved settings', () => {
      store.update({ ollamaHost: 'http://custom:1234' });
      const settings = store.read();
      assert.equal(settings.ollamaHost, 'http://custom:1234');
    });

    it('merges defaults with saved settings', () => {
      store.update({ ollamaHost: 'http://custom:1234' });
      const settings = store.read();
      assert.equal(settings.theme, 'light');
      assert.equal(settings.lastModel, '');
    });
  });

  describe('update', () => {
    it('updates a single field', () => {
      const result = store.update({ lastModel: 'llama3' });
      assert.equal(result.lastModel, 'llama3');
      assert.equal(result.ollamaHost, 'http://127.0.0.1:11434');
    });

    it('updates multiple fields', () => {
      const result = store.update({
        ollamaHost: 'http://custom:1234',
        companionAlwaysOnTop: true,
      });
      assert.equal(result.ollamaHost, 'http://custom:1234');
      assert.equal(result.companionAlwaysOnTop, true);
    });

    it('persists to disk', () => {
      store.update({ lastModel: 'mistral' });
      const reloaded = new SettingsStore(tmpDir);
      assert.equal(reloaded.read().lastModel, 'mistral');
    });

    it('returns full settings after update', () => {
      const result = store.update({ theme: 'dark' });
      assert.equal(result.theme, 'dark');
      assert.equal(result.ollamaHost, 'http://127.0.0.1:11434');
    });
  });
});
