const $ = (s) => document.querySelector(s);
let model = '',
  current,
  context,
  streaming = false;

function render(el, text) {
  const p = String(text).split(/```([\w+-]*)\n?([\s\S]*?)```/g);
  p.forEach((x, i) => {
    if (i % 3 === 0) {
      if (x) el.append(x);
      return;
    }
    if (i % 3 === 1) return;
    const c = document.createElement('section');
    const h = document.createElement('header');
    const l = document.createElement('span');
    const b = document.createElement('button');
    const pre = document.createElement('pre');
    const co = document.createElement('code');
    c.className = 'code-card';
    l.textContent = p[i - 1] || 'code';
    b.textContent = 'Copy';
    b.onclick = async () => {
      try {
        await navigator.clipboard.writeText(x);
        b.textContent = 'Copied';
        setTimeout(() => (b.textContent = 'Copy'), 1200);
      } catch {
        b.textContent = 'Unavailable';
      }
    };
    co.textContent = x.trim();
    pre.append(co);
    h.append(l, b);
    c.append(h, pre);
    el.append(c);
  });
}

const add = (r, t = '') => {
  const e = document.createElement('article');
  e.className = `msg ${r}`;
  r === 'assistant' ? render(e, t) : e.append(t);
  $('#chat').append(e);
  $('#chat').hidden = false;
  $('#welcome').hidden = true;
  return e;
};

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
  current = await window.nous.conversations.create(model);
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

$('#add').onclick = async () => {
  context = await window.nous.context.attach({
    kind: 'window',
    label: 'Current window',
  });
  if (context) {
    $('#context-label').textContent = context.label;
    $('#context').hidden = false;
  }
};

$('#remove').onclick = async () => {
  await window.nous.context.remove();
  context = null;
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
  streaming = true;
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
    a.classList.remove('working');
  }
};

$('#prompt').onkeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    $('#composer').requestSubmit();
  }
};

window.nous.onChunk(({ content }) => {
  const a = [...document.querySelectorAll('.msg.assistant')].at(-1);
  if (a) {
    const t = (a.dataset.raw || '') + content;
    a.dataset.raw = t;
    a.replaceChildren();
    render(a, t);
    $('#chat').scrollTop = $('#chat').scrollHeight;
  }
});

window.nous.onError(({ message }) => {
  const a = [...document.querySelectorAll('.msg.assistant')].at(-1);
  if (a && a.textContent === 'Working…') a.textContent = message;
});

init();
