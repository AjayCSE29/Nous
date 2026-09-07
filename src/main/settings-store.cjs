const fs = require('fs');
const path = require('path');

const defaults = {
  ollamaHost: 'http://127.0.0.1:11434',
  lastModel: '',
  companionAlwaysOnTop: false,
  theme: 'light',
};

class SettingsStore {
  constructor(dir) {
    this.file = path.join(dir, 'settings.json');
  }

  read() {
    try {
      return { ...defaults, ...JSON.parse(fs.readFileSync(this.file, 'utf8')) };
    } catch {
      return { ...defaults };
    }
  }

  update(next) {
    const value = { ...this.read(), ...next };
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
    return value;
  }
}

module.exports = SettingsStore;
