const $ = (s) => document.querySelector(s);
let model = '',
  current,
  context,
  streaming = false,
  cancelling = false,
  lastPrompt = '';

const add = (r, t = '') => {
  const e = document.createElement('article');
  e.className = `msg ${r}`;
  r === 'assistant' ? renderMarkdown(e, t) : e.append(t);
  $('#chat').append(e);
  $('#chat').hidden = false;
  $('#welcome').hidden = true;
  return e;
};

installLinkHandling($('#chat'), (url) => window.nous.shell.openExternal(url));

async function init() {
  try {
    const m = await window.nous.models();
    const select = $('#models');
    select.innerHTML = '';
    m.forEach((item) => {
      const o = document.createElement('option');
      o.value = o.textContent = item.name;
      select.append(o);
    });
    model = select.value;
  } catch {
    const select = $('#models');
    select.innerHTML = '';
    const o = document.createElement('option');
    o.textContent = 'Ollama unavailable';
    select.append(o);
  }
  const s = await window.nous.settings.read();
  $('#pin').classList.toggle('pinned', s.companionAlwaysOnTop);
  const latest = (await window.nous.conversations.list())[0];
  current =
    (latest && (await window.nous.conversations.read(latest.id))) ||
    (await window.nous.conversations.create(model));
  if (current.messages?.length) {
    current.messages.forEach((m) => add(m.role, m.content));
  }
}

$('#models').onchange = () => (model = $('#models').value);

$('#pin').onclick = async () => {
  try {
    const result = await window.nous.companion.pin(
      !$('#pin').classList.contains('pinned')
    );
    $('#pin').classList.toggle('pinned', result);
  } catch {
    // Pin state unchanged on error
  }
};

const kinds = {
  selection: 'Pasted selection',
  window: 'Current window',
  file: 'Selected file',
};

async function attachContext(input) {
  context = await window.nous.context.attach(input);
  if (context) {
    $('#context-label').textContent = context.label;
    $('#using').textContent = context.label;
    $('#context').hidden = false;
  }
}

$('#add').onclick = () => {
  $('#context-menu').hidden = !$('#context-menu').hidden;
};

document.addEventListener('click', (e) => {
  if (!$('#context-menu').contains(e.target) && e.target !== $('#add')) {
    $('#context-menu').hidden = true;
  }
});

$('#context-menu').onclick = (e) => {
  const kind = e.target.dataset?.kind;
  if (!kind) return;
  $('#context-menu').hidden = true;
  if (kind === 'selection') {
    $('#select-text').value = '';
    $('#select-dialog').showModal();
    $('#select-text').focus();
    return;
  }
  attachContext({ kind, label: kinds[kind] });
};

$('#select-confirm').onclick = async () => {
  const content = $('#select-text').value.trim();
  if (!content) return;
  await attachContext({ kind: 'selection', label: 'Pasted selection', content });
};

$('#remove').onclick = async () => {
  await window.nous.context.remove();
  context = null;
  $('#using').textContent = 'No context';
  $('#context').hidden = true;
};

$('#welcome').onclick = (e) => {
  if (e.target.tagName === 'BUTTON') {
    $('#prompt').value = e.target.textContent;
    $('#prompt').focus();
  }
};

$('#composer').onsubmit = async (e) => {
  e.preventDefault();
  const p = $('#prompt').value.trim();
  if (!p || streaming) return;
  lastPrompt = p;
  streaming = true;
  $('#stop').hidden = false;
  $('#prompt').value = '';
  add('user', p);
  const a = add('assistant', 'Working…');
  a.classList.add('working');
  try {
    await window.nous.chat.send({
      conversationId: current.id,
      model,
      prompt: p,
      context,
    });
  } catch {
  } finally {
    streaming = false;
    const last = [...document.querySelectorAll('.msg.assistant')].at(-1);
    if (last) last.classList.remove('working');
    $('#stop').hidden = true;
  }
};

$('#stop').addEventListener('click', () => {
  cancelling = true;
  window.nous.chat.cancel();
});

$('#prompt').onkeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    $('#composer').requestSubmit();
  }
  if (e.key === 'Escape' && streaming) {
    e.preventDefault();
    cancelling = true;
    window.nous.chat.cancel();
  }
};

window.nous.onChunk(({ content }) => {
  const a = [...document.querySelectorAll('.msg.assistant')].at(-1);
  if (a) {
    const t = (a.dataset.raw || '') + content;
    a.dataset.raw = t;
    a.replaceChildren();
    renderMarkdown(a, t);
    $('#chat').scrollTop = $('#chat').scrollHeight;
  }
});

window.nous.onError(({ message }) => {
  cancelling = false;
  const a = [...document.querySelectorAll('.msg.assistant')].at(-1);
  if (!a) return;
  if (message === 'Generation stopped.') {
    if (a.textContent === 'Working…') a.textContent = 'Stopped.';
    return;
  }
  if (a.textContent === 'Working…') a.textContent = '';
  const note = document.createElement('div');
  note.className = 'error-note';
  note.textContent = message || 'Something went wrong while generating.';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'retry';
  retry.textContent = 'Retry';
  retry.onclick = () => {
    $('#prompt').value = lastPrompt;
    $('#prompt').focus();
  };
  note.append(retry);
  a.append(note);
  a.classList.add('failed');
});

init();
