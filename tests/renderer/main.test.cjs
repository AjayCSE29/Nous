const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(
  path.join(__dirname, '../../src/renderer/main/index.html'),
  'utf8'
);
const app = fs.readFileSync(
  path.join(__dirname, '../../src/renderer/main/app.js'),
  'utf8'
);

describe('main renderer', () => {
  it('renders the brand and empty-state logos from the packaged assets path', () => {
    const refs = [...html.matchAll(/src="([^"]*logo\.svg)"/g)].map((m) => m[1]);
    assert.equal(refs.length, 2);
    for (const ref of refs) {
      assert.equal(ref, '../../../assets/icons/logo.svg');
    }
  });

  it('provides a hidden stop button and wires chat cancellation', () => {
    assert.match(html, /id="stop"[^>]*hidden/);
    assert.match(app, /chat\.cancel\(\)/);
  });

  it('wires Ctrl+N / Cmd+N to start a new chat', () => {
    assert.match(app, /keydown/);
    assert.match(app, /newChat\(\)/);
  });

  it('surfaces generation errors with a retry action', () => {
    assert.match(app, /error-note/);
    assert.match(app, /retry/);
  });

  it('loads the renderer vendor stack before app.js', () => {
    const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
    const expected = [
      '../vendor/marked.umd.js',
      '../vendor/purify.min.js',
      '../vendor/katex/katex.min.js',
      '../vendor/katex/auto-render.min.js',
      '../shared/markdown.js',
      'app.js',
    ];
    assert.deepEqual(scripts, expected);
    assert.match(html, /vendor\/katex\/katex\.min\.css/);
    assert.match(html, /style-src 'self' 'unsafe-inline'/);
    assert.match(app, /renderMarkdown\(/);
  });
});