# Nous

A private, Fedora-first Electron desktop client for local Ollama models.

## Install

Download the latest `Nous-*.AppImage` or `nous-*.rpm` from the
[releases](https://github.com/AjayCSE29/Nous/releases) page.

```bash
sudo dnf install ./nous-*.rpm   # Fedora (recommended)
chmod +x ./Nous-*.AppImage      # any distro
sudo dnf install -y fuse2       # required on Fedora to run AppImages
./Nous-*.AppImage
```

## Privacy

Nous is fully local: no accounts, no analytics, no telemetry, no cloud AI. All
traffic stays between the app and the Ollama server you configure (default
`http://127.0.0.1:11434`). Conversations, titles, and settings are stored only
on your device, and Context attachments in the Companion window are used only
for the single request you explicitly submit them with.

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

[MIT](LICENSE)
