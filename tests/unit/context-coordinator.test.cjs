const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { attach } = require('../../src/main/context-coordinator.cjs');

describe('context-coordinator', () => {
  it('preserves valid kinds', () => {
    for (const kind of ['selection', 'window', 'file']) {
      assert.equal(attach({ kind }).kind, kind);
    }
  });

  it('defaults an unknown kind to selection', () => {
    assert.equal(attach({ kind: 'tesseract' }).kind, 'selection');
    assert.equal(attach({}).kind, 'selection');
  });

  it('truncates content to 16000 characters', () => {
    const content = 'x'.repeat(16000 + 50);
    assert.equal(attach({ kind: 'selection', content }).content.length, 16000);
  });

  it('truncates labels to 120 characters', () => {
    const label = 'L'.repeat(120 + 10);
    assert.equal(attach({ kind: 'window', label }).label.length, 120);
  });

  it('uses a default label when none is provided', () => {
    assert.equal(attach({ kind: 'window' }).label, 'Current context');
  });

  it('defaults empty content to an empty string', () => {
    assert.equal(attach({ kind: 'window' }).content, '');
    assert.equal(attach({ kind: 'window', content: null }).content, '');
  });

  it('returns a unique id and creation timestamp', () => {
    const a = attach({ kind: 'file', label: 'A' });
    const b = attach({ kind: 'file', label: 'B' });
    assert.notEqual(a.id, b.id);
    assert.match(a.id, /^[0-9a-f-]{36}$/);
    assert.equal(typeof a.createdAt, 'string');
    assert.ok(!Number.isNaN(Date.parse(a.createdAt)));
  });
});