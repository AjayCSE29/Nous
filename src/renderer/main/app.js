const $ = (s) => document.querySelector(s);
let current;
let models = [];
let streaming = false;

const showMessages = (conversation) => {
  const box = $('#messages');
  box.innerHTML = '';
  const items = conversation?.messages || [];
  $('#empty').hidden = items.length > 0;
  box.hidden = !items.length;
  items.forEach((m) => add(m.role, m.content));
  requestAnimationFrame(() => (box.scrollTop = box.scrollHeight));
};

function formatAssistant(el, content) {
  const parts = String(content).split(/```([\w+-]*)\n?([\s\S]*?)```/g);
  parts.forEach((part, index) => {
    if (index % 3 === 0) {
      if (part) el.append(document.createTextNode(part));
      return;
    }
    if (index % 3 === 1) return;
    const card = document.createElement('section');
    card.className = 'code-card';
    const bar = document.createElement('header');
    const label = document.createElement('span');
    label.textContent = parts[index - 1] || 'code';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy';
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(part);
        copy.textContent = 'Copied';
        setTimeout(() => (copy.textContent = 'Copy'), 1400);
      } catch {
        copy.textContent = 'Unavailable';
      }
    };
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = part.trim();
    pre.append(code);
    bar.append(label, copy);
    card.append(bar, pre);
    el.append(card);
  });
}

const add = (role, content = '') => {
  const el = document.createElement('article');
  el.className = `message ${role}`;
  if (role === 'assistant') formatAssistant(el, content);
  else el.textContent = content;
  $('#messages').append(el);
  $('#messages').hidden = false;
  $('#empty').hidden = true;
  return el;
};

async function refreshList() {
  const items = await window.nous.conversations.list();
  $('#list').innerHTML = '';
  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = `conversation ${item.id === current?.id ? 'active' : ''}`;
    const b = document.createElement('button');
    b.textContent = item.title;
    b.onclick = async () => {
      current = await window.nous.conversations.read(item.id);
      showMessages(current);
      refreshList();
    };
    b.ondblclick = () => {
      const input = document.createElement('input');
      input.className = 'rename-input';
      input.value = item.title;
      input.setAttribute('aria-label', 'Rename conversation');
      b.replaceWith(input);
      input.focus();
      input.select();
      const save = async () => {
        const title = input.value.trim() || item.title;
        await window.nous.conversations.update(item.id, { title });
        refreshList();
      };
      input.onblur = save;
      input.onkeydown = (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') refreshList();
      };
    };
    const remove = document.createElement('button');
    remove.className = 'delete-chat';
    remove.title = 'Delete conversation';
    remove.setAttribute('aria-label', `Delete ${item.title}`);
    remove.textContent = '×';
    remove.onclick = async (event) => {
      event.stopPropagation();
      if (!confirm(`Delete "${item.title}"? This only removes it from this device.`)) return;
      await window.nous.conversations.delete(item.id);
      if (current?.id === item.id) {
        current = undefined;
        showMessages();
      }
      refreshList();
    };
    row.append(b, remove);
    $('#list').append(row);
  });
}

async function newChat() {
  current = await window.nous.conversations.create($('#models').value);
  showMessages(current);
  refreshList();
  $('#prompt').focus();
}

async function connect() {
  try {
    models = await window.nous.models();
    const select = $('#models');
    select.innerHTML = '';
    if (!models.length) throw Error('No local models installed');
    models.forEach((m) => {
      const o = document.createElement('option');
      o.value = o.textContent = m.name;
      select.append(o);
    });
    const settings = await window.nous.settings.read();
    if (settings.lastModel && models.some((m) => m.name === settings.lastModel))
      select.value = settings.lastModel;
    $('#status').textContent = 'Ollama connected';
    $('.sidefoot').classList.add('connected');
    $('#model-info').textContent = '· Local model';
  } catch (error) {
    const select = $('#models');
    select.innerHTML = '';
    const o = document.createElement('option');
    o.textContent = 'Ollama unavailable';
    select.append(o);
    $('#status').textContent = 'Ollama unavailable';
    $('#model-info').textContent = 'Check connection settings';
  }
}

$('#composer').addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = $('#prompt').value.trim();
  if (!prompt || streaming || !$('#models').value) return;
  if (!current) await newChat();
  streaming = true;
  $('#prompt').value = '';
  add('user', prompt);
  const response = add('assistant', '');
  response.classList.add('working');
  try {
    await window.nous.chat.send({
      conversationId: current.id,
      model: $('#models').value,
      prompt,
    });
  } catch {
  } finally {
    streaming = false;
    response.classList.remove('working');
    refreshList();
  }
});

$('#prompt').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    $('#composer').requestSubmit();
  }
});

$('.chips').addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON') {
    $('#prompt').value = e.target.textContent;
    $('#prompt').focus();
  }
});

$('#new').onclick = newChat;
$('#clear').onclick = newChat;
$('#companion').onclick = () => window.nous.companion.open();
$('#settings').onclick = async () => {
  $('#host').value = (await window.nous.settings.read()).ollamaHost;
  $('#dialog').showModal();
};
$('#save').onclick = async () => {
  await window.nous.settings.update({ ollamaHost: $('#host').value.trim() });
  connect();
};
$('#models').onchange = () => window.nous.settings.update({ lastModel: $('#models').value });

window.nous.onChunk(({ content }) => {
  const last = [...document.querySelectorAll('.message.assistant')].at(-1);
  if (last) {
    const text = (last.dataset.raw || '') + content;
    last.dataset.raw = text;
    last.replaceChildren();
    formatAssistant(last, text);
    last.closest('#messages').scrollTop = last.closest('#messages').scrollHeight;
  }
});

window.nous.onError(({ message }) => {
  const last = [...document.querySelectorAll('.message.assistant')].at(-1);
  if (last && !last.textContent) last.textContent = message;
});

connect();
refreshList();
