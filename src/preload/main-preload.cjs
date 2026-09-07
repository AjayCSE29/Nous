const { contextBridge, ipcRenderer } = require('electron');
const C = require('../../shared/channels.cjs');

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

const listeners = { chunk: null, complete: null, error: null };

contextBridge.exposeInMainWorld('nous', {
  models: invoke(C.MODELS_LIST),
  modelsRefresh: invoke(C.MODELS_REFRESH),
  connectionTest: invoke(C.CONNECTION_TEST),
  settings: {
    read: invoke(C.SETTINGS_READ),
    update: invoke(C.SETTINGS_UPDATE),
  },
  conversations: {
    list: invoke(C.CONVERSATIONS_LIST),
    create: invoke(C.CONVERSATIONS_CREATE),
    read: invoke(C.CONVERSATIONS_READ),
    update: invoke(C.CONVERSATIONS_UPDATE),
    delete: invoke(C.CONVERSATIONS_DELETE),
  },
  chat: {
    send: invoke(C.CHAT_SEND),
    cancel: invoke(C.CHAT_CANCEL),
  },
  companion: {
    open: invoke(C.COMPANION_OPEN),
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
