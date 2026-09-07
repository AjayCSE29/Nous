const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { cleanHost } = require('../../src/main/ollama-client.cjs');

describe('cleanHost', () => {
  it('returns a valid http URL unchanged', () => {
    assert.equal(cleanHost('http://127.0.0.1:11434'), 'http://127.0.0.1:11434');
  });

  it('returns a valid https URL unchanged', () => {
    assert.equal(cleanHost('https://ollama.local:11434'), 'https://ollama.local:11434');
  });

  it('strips trailing slash', () => {
    assert.equal(cleanHost('http://127.0.0.1:11434/'), 'http://127.0.0.1:11434');
  });

  it('trims whitespace', () => {
    assert.equal(cleanHost('  http://127.0.0.1:11434  '), 'http://127.0.0.1:11434');
  });

  it('throws on non-http protocol', () => {
    assert.throws(() => cleanHost('ftp://example.com'), /http/);
  });

  it('throws on bare hostname', () => {
    assert.throws(() => cleanHost('localhost:11434'), /http/);
  });

  it('throws on empty string', () => {
    assert.throws(() => cleanHost(''), /http/);
  });

  it('throws on null', () => {
    assert.throws(() => cleanHost(null), /http/);
  });

  it('throws on undefined', () => {
    assert.throws(() => cleanHost(undefined), /http/);
  });
});
