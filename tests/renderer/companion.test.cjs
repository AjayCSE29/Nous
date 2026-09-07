const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '../../src/renderer/companion/index.html'),
  'utf8'
);
const app = fs.readFileSync(
  path.join(__dirname, '../../src/renderer/companion/app.js'),
  'utf8'
);

describe('companion renderer', () => {
  it('renders the brand logo from the packaged assets path', () => {
    const refs = [...html.matchAll(/src="([^"]*logo\.svg)"/g)].map((m) => m[1]);
    assert.equal(refs.length, 1);
    assert.equal(refs[0], '../../../assets/icons/logo.svg');
  });

  it('provides a stop button and wires chat cancellation', () => {
    assert.match(html, /id="stop"[^>]*hidden/);
    assert.match(app, /chat\.cancel\(\)/);
  });

  it('offers explicit context types (selection, window, file)', () => {
    assert.match(html, /data-kind="selection"/);
    assert.match(html, /data-kind="window"/);
    assert.match(html, /data-kind="file"/);
    assert.match(app, /attachContext/);
  });

  it('resumes the latest conversation instead of creating an orphan', () => {
    assert.match(app, /conversations\.list/);
    assert.match(app, /conversations\.read\(/);
  });
});