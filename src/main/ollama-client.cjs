function cleanHost(host) {
  const value = String(host || '').trim().replace(/\/$/, '');
  if (!/^https?:\/\//.test(value)) {
    throw new Error('Use an http:// or https:// Ollama address.');
  }
  return value;
}

async function models(host) {
  let response;
  try {
    response = await fetch(`${cleanHost(host)}/api/tags`);
  } catch (err) {
    throw new Error(`Cannot connect to Ollama at ${host}. Is it running?`);
  }
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const body = await response.json();
  return (body.models || []).map((item) => ({
    name: item.name,
    size: item.size,
    details: item.details || {},
  }));
}

async function chat(host, payload, onChunk, signal) {
  let response;
  try {
    response = await fetch(`${cleanHost(host)}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ ...payload, stream: true }),
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error(`Cannot connect to Ollama at ${host}. Is it running?`);
  }
  if (!response.ok || !response.body) {
    throw new Error(`Ollama returned ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split('\n');
      pending = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const item = JSON.parse(line);
          onChunk(item.message?.content || '', Boolean(item.done));
        } catch {
          // Skip malformed NDJSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

module.exports = { cleanHost, models, chat };
