const { app, session } = require('electron');
const SettingsStore = require('./settings-store.cjs');
const ConversationStore = require('./conversation-store.cjs');
const windows = require('./window-manager.cjs');
const { register } = require('./ipc.cjs');

const CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self';";

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP],
      },
    });
  });

  const dir = app.getPath('userData');
  register({
    settings: new SettingsStore(dir),
    conversations: new ConversationStore(dir),
    windows,
  });
  windows.createMain();

  app.on('activate', () => {
    if (!require('electron').BrowserWindow.getAllWindows().length) windows.createMain();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
