const { ipcMain, dialog, BrowserWindow } = require('electron');
const C = require('../shared/channels.cjs');
const ollama = require('./ollama-client.cjs');
const { attach } = require('./context-coordinator.cjs');

function validText(value, max = 24000) {
  return typeof value === 'string' && value.trim() && value.length <= max;
}

function register({ settings, conversations, windows }) {
  const aborters = new Map();

  ipcMain.handle(C.MODELS_LIST, async () => {
    return ollama.models(settings.read().ollamaHost);
  });

  ipcMain.handle(C.MODELS_REFRESH, async () => {
    return ollama.models(settings.read().ollamaHost);
  });

  ipcMain.handle(C.CONNECTION_TEST, async () => {
    try {
      await ollama.models(settings.read().ollamaHost);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  });

  ipcMain.handle(C.SETTINGS_READ, () => {
    return settings.read();
  });

  ipcMain.handle(C.SETTINGS_UPDATE, (_e, next) => {
    if (!next || typeof next !== 'object') throw new Error('Invalid settings.');
    const allowed = {};
    if (next.ollamaHost !== undefined) {
      if (typeof next.ollamaHost !== 'string') throw new Error('Invalid ollamaHost.');
      allowed.ollamaHost = ollama.cleanHost(next.ollamaHost);
    }
    if (next.lastModel !== undefined) {
      if (typeof next.lastModel !== 'string') throw new Error('Invalid lastModel.');
      allowed.lastModel = next.lastModel;
    }
    if (next.companionAlwaysOnTop !== undefined) {
      if (typeof next.companionAlwaysOnTop !== 'boolean') {
        throw new Error('Invalid companionAlwaysOnTop.');
      }
      allowed.companionAlwaysOnTop = next.companionAlwaysOnTop;
    }
    if (next.theme !== undefined) {
      if (typeof next.theme !== 'string') throw new Error('Invalid theme.');
      allowed.theme = next.theme;
    }
    return settings.update(allowed);
  });

  ipcMain.handle(C.CONVERSATIONS_LIST, () => {
    return conversations.list();
  });

  ipcMain.handle(C.CONVERSATIONS_CREATE, (_e, model) => {
    return conversations.create(String(model || ''));
  });

  ipcMain.handle(C.CONVERSATIONS_READ, (_e, id) => {
    return conversations.read(String(id));
  });

  ipcMain.handle(C.CONVERSATIONS_UPDATE, (_e, id, fields) => {
    if (!id || !fields || typeof fields !== 'object') {
      throw new Error('Invalid conversation update.');
    }
    return conversations.update(String(id), fields);
  });

  ipcMain.handle(C.CONVERSATIONS_DELETE, (_e, id) => {
    return conversations.delete(String(id));
  });

  ipcMain.handle(C.COMPANION_OPEN, () => {
    return windows.openCompanion(settings.read().companionAlwaysOnTop);
  });

  ipcMain.handle(C.COMPANION_PIN, (_e, value) => {
    const next = settings.update({ companionAlwaysOnTop: Boolean(value) });
    windows.setPinned(next.companionAlwaysOnTop);
    return next.companionAlwaysOnTop;
  });

  ipcMain.handle(C.CONTEXT_ATTACH, async (event, input) => {
    if (input?.kind === 'file') {
      const selected = await dialog.showOpenDialog(
        BrowserWindow.fromWebContents(event.sender),
        { properties: ['openFile'] }
      );
      if (selected.canceled) return null;
      return attach({
        kind: 'file',
        label: selected.filePaths[0].split('/').pop(),
        content: 'A local file was selected. Its contents are not automatically read.',
      });
    }
    return attach(input || {});
  });

  ipcMain.handle(C.CONTEXT_REMOVE, () => {
    return true;
  });

  ipcMain.handle(C.CHAT_CANCEL, (event) => {
    aborters.get(event.sender.id)?.abort();
    return true;
  });

  ipcMain.handle(C.CHAT_SEND, async (event, payload) => {
    if (!payload || !validText(payload.prompt) || !validText(payload.model, 180)) {
      throw new Error('A prompt and model are required.');
    }

    const conversation =
      conversations.read(String(payload.conversationId)) ||
      conversations.create(payload.model);

    conversations.append(conversation.id, {
      role: 'user',
      content: payload.prompt,
      contextRefs: payload.context ? [payload.context] : [],
    });

    const controller = new AbortController();
    aborters.set(event.sender.id, controller);
    let answer = '';

    try {
      const latest = conversations.read(conversation.id);
      const messages = latest.messages.map(({ role, content }) => ({ role, content }));

      if (payload.context?.content) {
        messages.splice(-1, 0, {
          role: 'system',
          content: `User explicitly shared this ${payload.context.kind} context (${payload.context.label}):\n${payload.context.content}`,
        });
      }

      await ollama.chat(
        settings.read().ollamaHost,
        { model: payload.model, messages },
        (content, done) => {
          answer += content;
          event.sender.send(C.CHAT_CHUNK, {
            conversationId: conversation.id,
            content,
            done,
          });
        },
        controller.signal
      );

      conversations.append(conversation.id, { role: 'assistant', content: answer });
      event.sender.send(C.CHAT_COMPLETE, { conversationId: conversation.id });
      return { conversationId: conversation.id };
    } catch (error) {
      event.sender.send(C.CHAT_ERROR, {
        conversationId: conversation.id,
        message: error.name === 'AbortError' ? 'Generation stopped.' : error.message,
      });
      throw error;
    } finally {
      aborters.delete(event.sender.id);
    }
  });
}

module.exports = { register };
