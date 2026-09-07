const { contextBridge, ipcRenderer } = require('electron');

// Channel names are duplicated here because sandboxed preloads can only
// require Electron's built-in modules. Keep this in sync with
// src/shared/channels.cjs. A test (tests/unit/preload-channels.test.cjs)
// verifies they match.
const C = {
  MODELS_LIST: 'models:list',
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  CONVERSATIONS_LIST: 'conversations:list',
  CONVERSATIONS_CREATE: 'conversations:create',
  CONVERSATIONS_READ: 'conversations:read',
  CHAT_SEND: 'chat:send',
  CHAT_CANCEL: 'chat:cancel',
  CHAT_CHUNK: 'chat:chunk',
  CHAT_COMPLETE: 'chat:complete',
  CHAT_ERROR: 'chat:error',
  COMPANION_PIN: 'companion:set-always-on-top',
  CONTEXT_ATTACH: 'context:attach',
  CONTEXT_REMOVE: 'context:remove',
};

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

const listeners = { chunk: null, complete: null, error: null };

contextBridge.exposeInMainWorld('nous', {
  models: invoke(C.MODELS_LIST),
  settings: {
    read: invoke(C.SETTINGS_READ),
    update: invoke(C.SETTINGS_UPDATE),
  },
  conversations: {
    list: invoke(C.CONVERSATIONS_LIST),
    create: invoke(C.CONVERSATIONS_CREATE),
    read: invoke(C.CONVERSATIONS_READ),
  },
  chat: {
    send: invoke(C.CHAT_SEND),
    cancel: invoke(C.CHAT_CANCEL),
  },
  companion: {
    pin: invoke(C.COMPANION_PIN),
  },
  context: {
    attach: invoke(C.CONTEXT_ATTACH),
    remove: invoke(C.CONTEXT_REMOVE),
  },
  onChunk(fn) {
    if (listeners.chunk) ipcRenderer.removeListener(C.CHAT_CHUNK, listeners.chunk);
    listeners.chunk = (_e, data) => fn(data);
    ipcRenderer.on(C.CHAT_CHUNK, listeners.chunk);
    return () => {
      if (listeners.chunk) {
        ipcRenderer.removeListener(C.CHAT_CHUNK, listeners.chunk);
        listeners.chunk = null;
      }
    };
  },
  onComplete(fn) {
    if (listeners.complete) ipcRenderer.removeListener(C.CHAT_COMPLETE, listeners.complete);
    listeners.complete = (_e, data) => fn(data);
    ipcRenderer.on(C.CHAT_COMPLETE, listeners.complete);
    return () => {
      if (listeners.complete) {
        ipcRenderer.removeListener(C.CHAT_COMPLETE, listeners.complete);
        listeners.complete = null;
      }
    };
  },
  onError(fn) {
    if (listeners.error) ipcRenderer.removeListener(C.CHAT_ERROR, listeners.error);
    listeners.error = (_e, data) => fn(data);
    ipcRenderer.on(C.CHAT_ERROR, listeners.error);
    return () => {
      if (listeners.error) {
        ipcRenderer.removeListener(C.CHAT_ERROR, listeners.error);
        listeners.error = null;
      }
    };
  },
});