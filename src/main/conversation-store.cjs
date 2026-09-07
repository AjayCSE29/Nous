const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ConversationStore {
  constructor(dir) {
    this.file = path.join(dir, 'conversations.json');
  }

  all() {
    try {
      return JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      return [];
    }
  }

  _saveAtomic(items) {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  list() {
    return this.all()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(({ messages, ...item }) => item);
  }

  read(id) {
    return this.all().find((item) => item.id === id) || null;
  }

  create(model = '') {
    const now = new Date().toISOString();
    const item = {
      id: crypto.randomUUID(),
      title: 'New conversation',
      model,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    const all = this.all();
    all.push(item);
    this._saveAtomic(all);
    return item;
  }

  update(id, fields) {
    const all = this.all();
    const item = all.find((x) => x.id === id);
    if (!item) throw new Error('Conversation not found.');
    if (fields.title !== undefined) item.title = String(fields.title).slice(0, 120);
    if (fields.model !== undefined) item.model = String(fields.model);
    item.updatedAt = new Date().toISOString();
    this._saveAtomic(all);
    return item;
  }

  append(id, message) {
    const all = this.all();
    const item = all.find((x) => x.id === id);
    if (!item) throw new Error('Conversation not found.');
    item.messages.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...message,
    });
    if (message.role === 'user' && item.title === 'New conversation') {
      item.title = message.content.slice(0, 56);
    }
    item.updatedAt = new Date().toISOString();
    this._saveAtomic(all);
    return item;
  }

  delete(id) {
    this._saveAtomic(this.all().filter((item) => item.id !== id));
  }
}

module.exports = ConversationStore;
