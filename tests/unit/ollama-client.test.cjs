const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { cleanHost, chat } = require('../../src/main/ollama-client.cjs');

function chunkedBody(chunks) {
  const encoder = new TextEncoder();
  const bytes = chunks.map((c) => encoder.encode(c));
  return new ReadableStream({
    start(controller) {
      for (const b of bytes) controller.enqueue(b);
      controller.close();
    },
  });
}

function withFetch(impl, run) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = impl;
  try {
    return run();
  } finally {
    globalThis.fetch = realFetch;
  }
}

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

describe('chat stream parsing', () => {
  const HOST = 'http://127.0.0.1:11434';

  it('emits content chunks and the done flag from NDJSON', async () => {
    const lines = [
      JSON.stringify({ message: { content: 'Hel' }, done: false }),
      JSON.stringify({ message: { content: 'lo' }, done: false }),
      JSON.stringify({ message: {}, done: true }),
    ];
    const out = [];
    const flags = [];
    await withFetch(async () => ({ ok: true, status: 200, body: chunkedBody(lines.map((l) => `${l}\n`)) }), async () => {
      await chat(HOST, { model: 'm' }, (c, done) => {
        out.push(c);
        flags.push(done);
      });
    });
    assert.deepEqual(out, ['Hel', 'lo', '']);
    assert.deepEqual(flags, [false, false, true]);
  });

  it('buffers NDJSON split across stream reads', async () => {
    const out = [];
    const body = chunkedBody([
      '{"message":{"content":"a"},',
      ' "done":true}\n{"message":{"content":"b"},"done":false}\n',
    ]);
    await withFetch(async () => ({ ok: true, status: 200, body }), async () => {
      await chat(HOST, { model: 'm' }, (c) => out.push(c));
    });
    assert.deepEqual(out, ['a', 'b']);
  });

  it('skips malformed NDJSON lines', async () => {
    const out = [];
    const lines = ['not-json{', JSON.stringify({ message: { content: 'ok' }, done: false }), '##!#'];
    await withFetch(async () => ({ ok: true, status: 200, body: chunkedBody(lines.map((l) => `${l}\n`)) }), async () => {
      await chat(HOST, { model: 'm' }, (c) => out.push(c));
    });
    assert.deepEqual(out, ['ok']);
  });

  it('throws a clear error on a non-ok response', async () => {
    await withFetch(async () => ({ ok: false, status: 503, body: null }), async () => {
      await assert.rejects(chat(HOST, { model: 'm' }, () => {}), /Ollama returned 503/);
    });
  });

  it('throws a clear error on a network failure', async () => {
    await withFetch(async () => {
      throw new Error('ECONNREFUSED');
    }, async () => {
      await assert.rejects(chat(HOST, { model: 'm' }, () => {}), /Cannot connect/);
    });
  });

  it('rethrows AbortError on cancellation', async () => {
    await withFetch(async () => {
      const err = new Error('aborter');
      err.name = 'AbortError';
      throw err;
    }, async () => {
      await assert.rejects(chat(HOST, { model: 'm' }, () => {}, new AbortController().signal), (err) => err.name === 'AbortError');
    });
  });
});
