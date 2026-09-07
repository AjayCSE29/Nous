# Nous

A private, Fedora-first Electron desktop client for local Ollama models.

## Prerequisites

- Node.js >= 22.12.0
- Ollama running locally (default: `http://127.0.0.1:11434`)

## Quick start

```bash
npm install
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm start` | Launch the app |
| `npm run dev` | Launch with dev logging |
| `npm test` | Run unit tests |
| `npm run build` | Build AppImage (via electron-builder) |
| `npm run rpm` | Build RPM from the packed app |
| `npm run dist` | Build both the AppImage and the RPM |

## Architecture

Nous uses Electron's process separation to keep the UI unprivileged. The main process owns all Ollama traffic, persistence, and window management. Renderers communicate only through a narrow, validated IPC boundary.

- **Main window** — full chat client with sidebar, model picker, conversation history, and settings
- **Companion** — compact always-on-top window with context attachments for quick questions alongside your work

### Key principles

- Renderer has no Node.js, shell, filesystem, or network access
- All Ollama communication goes through the main process
- Context is explicit — no silent capture
- Local persistence only — no accounts, sync, or telemetry

### Project structure

```
src/
  main/          Electron main process (IPC, Ollama client, stores)
  preload/       Secure bridges for main and companion windows
  renderer/      UI for main and companion windows
  shared/        IPC channel constants
tests/
  unit/          Store and client tests
  integration/   IPC contract tests
```

## License

MIT
