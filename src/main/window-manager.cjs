const { BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;
let companionWindow;

const secure = (preload) => ({
  preload: path.join(__dirname, '..', 'preload', preload),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
});

function createMain() {
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 820,
    minWidth: 960,
    minHeight: 620,
    backgroundColor: '#f8f8f6',
    title: 'Nous',
    titleBarStyle: 'hiddenInset',
    webPreferences: secure('main-preload.cjs'),
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'main', 'index.html'));
  return mainWindow;
}

function openCompanion(pinned = false) {
  if (companionWindow && !companionWindow.isDestroyed()) {
    companionWindow.focus();
    return companionWindow;
  }
  companionWindow = new BrowserWindow({
    width: 430,
    height: 700,
    minWidth: 380,
    minHeight: 540,
    backgroundColor: '#f8f8f6',
    title: 'Nous Companion',
    alwaysOnTop: pinned,
    webPreferences: secure('companion-preload.cjs'),
  });
  companionWindow.loadFile(path.join(__dirname, '..', 'renderer', 'companion', 'index.html'));
  companionWindow.on('closed', () => {
    companionWindow = undefined;
  });
  return companionWindow;
}

function setPinned(value) {
  if (companionWindow && !companionWindow.isDestroyed()) {
    companionWindow.setAlwaysOnTop(Boolean(value));
  }
}

module.exports = { createMain, openCompanion, setPinned };
