const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const channels = require('../../src/shared/channels.cjs');

function extractPreloadConstants(file) {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(/const C = \{([\s\S]*?)\};/);
  assert.ok(match, `No channel constant block found in ${file}`);
  const obj = {};
  for (const line of match[1].trim().split('\n')) {
    const m = line.match(/^\s*([A-Z_]+):\s*'([^']+)'/);
    if (m) obj[m[1]] = m[2];
  }
  return obj;
}

describe('preload channel consistency', () => {
  it('main preload channels match channels.cjs', () => {
    const preload = extractPreloadConstants(
      path.join(__dirname, '../../src/preload/main-preload.cjs')
    );
    for (const [key, value] of Object.entries(preload)) {
      assert.equal(
        value,
        channels[key],
        `main preload ${key} (${value}) differs from channels.cjs (${channels[key]})`
      );
    }
  });

  it('companion preload channels match channels.cjs', () => {
    const preload = extractPreloadConstants(
      path.join(__dirname, '../../src/preload/companion-preload.cjs')
    );
    for (const [key, value] of Object.entries(preload)) {
      assert.equal(
        value,
        channels[key],
        `companion preload ${key} (${value}) differs from channels.cjs (${channels[key]})`
      );
    }
  });

  it('every channel constant appears in the ipc.cjs handler registration', () => {
    const ipcSource = fs.readFileSync(
      path.join(__dirname, '../../src/main/ipc.cjs'),
      'utf8'
    );
    const used = new Set(
      [...ipcSource.matchAll(/C\.([A-Z_]+)/g)].map((m) => m[1])
    );
    const registered = [
      'MODELS_LIST',
      'MODELS_REFRESH',
      'CONNECTION_TEST',
      'SETTINGS_READ',
      'SETTINGS_UPDATE',
      'CONVERSATIONS_LIST',
      'CONVERSATIONS_CREATE',
      'CONVERSATIONS_READ',
      'CONVERSATIONS_UPDATE',
      'CONVERSATIONS_DELETE',
      'COMPANION_OPEN',
      'COMPANION_PIN',
      'CONTEXT_ATTACH',
      'CONTEXT_REMOVE',
      'SHELL_OPEN_EXTERNAL',
      'CHAT_CANCEL',
      'CHAT_SEND',
    ];
    for (const name of registered) {
      assert.ok(used.has(name), `IPC handler for ${name} not registered in ipc.cjs`);
    }
  });
});