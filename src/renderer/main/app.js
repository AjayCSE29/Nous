const $ = (s) => document.querySelector(s);
let current;
let models = [];
let streaming = false;
let cancelling = false;
let lastPrompt = '';

const showMessages = (conversation) => {
  const box = $('#messages');
  box.innerHTML = '';
  const items = conversation?.messages || [];
  $('#empty').hidden = items.length > 0;
  box.hidden = !items.length;
  items.forEach((m) => add(m.role, m.content));
  requestAnimationFrame(() => (box.scrollTop = box.scrollHeight));
};

const add = (role, content = '') => {
  const el = document.createElement('article');
  el.className = `message ${role}`;
  if (role === 'assistant') renderMarkdown(el, content);
  else el.textContent = content;
  $('#messages').append(el);
  $('#messages').hidden = false;
  $('#empty').hidden = true;
  return el;
};

installLinkHandling($('#messages'), (url) => window.nous.shell.openExternal(url));

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
  lastPrompt = prompt;
  streaming = true;
  $('#stop').hidden = false;
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
    $('#stop').hidden = true;
    response.classList.remove('working');
    refreshList();
  }
});

$('#stop').addEventListener('click', () => {
  cancelling = true;
  window.nous.chat.cancel();
});

$('#prompt').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    $('#composer').requestSubmit();
  }
  if (e.key === 'Escape' && streaming) {
    e.preventDefault();
    cancelling = true;
    window.nous.chat.cancel();
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

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    newChat();
  }
});

window.nous.onChunk(({ content }) => {
  const last = [...document.querySelectorAll('.message.assistant')].at(-1);
  if (last) {
    const text = (last.dataset.raw || '') + content;
    last.dataset.raw = text;
    last.replaceChildren();
    renderMarkdown(last, text);
    last.closest('#messages').scrollTop = last.closest('#messages').scrollHeight;
  }
});

window.nous.onError(({ message }) => {
  cancelling = false;
  const last = [...document.querySelectorAll('.message.assistant')].at(-1);
  if (!last) return;
  if (message === 'Generation stopped.') {
    if (!last.textContent) last.textContent = 'Stopped.';
    return;
  }
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
  last.append(note);
  last.classList.add('failed');
});

connect();
refreshList();
