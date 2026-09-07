const crypto = require('crypto');

const MAX_CONTEXT = 16000;

function attach(input) {
  const kind = ['selection', 'window', 'file'].includes(input.kind)
    ? input.kind
    : 'selection';
  const content = String(input.content || '').slice(0, MAX_CONTEXT);
  return {
    id: crypto.randomUUID(),
    kind,
    label: String(input.label || 'Current context').slice(0, 120),
    content,
    createdAt: new Date().toISOString(),
  };
}

module.exports = { attach };
