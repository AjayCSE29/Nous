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

## Local models with Ollama

Ollama is a local model runtime that ships models and serves them on
`http://127.0.0.1:11434`. Nous connects to it automatically and lists every
model you have pulled.

### Install Ollama

Fedora ships Ollama in its repositories:

```bash
sudo dnf install -y ollama
sudo systemctl enable --now ollama
```

For the latest version, use the official installer instead (it writes
`/usr/local/bin/ollama`, creates a dedicated `ollama` user, and configures the
same systemd service):

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Verify it is running:

```bash
ollama --version
systemctl status ollama --no-pager | head -8
```

If you installed Ollama after starting Nous, refresh the model list in
Settings. To use a remote server instead of the local one, change the host in
Settings — Nous accepts `http`/`https` endpoints only.

### Pulling and running models

| Command | Purpose |
|---|---|
| `ollama pull <model>` | Download a model |
| `ollama run <model>` | Start an interactive chat in the terminal |
| `ollama run <model> "question"` | Run a one-shot prompt |
| `ollama list` | Show downloaded models |
| `ollama ps` | Show currently loaded models |
| `ollama rm <model>` | Delete a model to free disk space |

Models occupy significant disk space (`~/.ollama/models`, or
`/usr/share/ollama/.ollama/models` with the Fedora package). `Q4_K_M` is
Ollama's default quantization — the best balance of quality and size. Pulling a
model under 2 GB on a typical connection takes a few minutes; after that it is
cached and loads in seconds.

NVIDIA acceleration requires the Nvidia driver and CUDA via
[RPM Fusion](https://rpmfusion.org/) (`akmod-nvidia` + `xorg-x11-drv-nvidia-cuda`).
AMD integrated and discrete GPUs share main memory, and CPU-only inference
works out of the box — just expect slower tokens-per-second on larger models.

### Choosing a model

Sizes are the download size at the given quantization; RAM/VRAM is the usable
free memory you want for a comfortable session at a 4K context (weights plus
KV-cache and overhead). Model names are the exact Ollama tags.

#### Low-end hardware — Intel CPU, CPU only

| # | Model | Parameters | Quantization | Size | RAM/VRAM |
|---|-------|-----------|--------------|------|----------|
| 1 | TinyLlama (`tinyllama`) | 1.1B | Q4_0 | ~0.7 GB | ~2 GB |
| 2 | Llama 3.2 (`llama3.2:1b`) | 1.2B | Q4_K_M | ~1.3 GB | ~2–3 GB |
| 3 | Qwen2.5 (`qwen2.5:1.5b`) | 1.5B | Q4_K_M | ~1.1 GB | ~3 GB |
| 4 | Gemma 3 (`gemma3:1b`) | 1.0B | Q4_K_M | ~0.8 GB | ~2 GB |
| 5 | Llama 3.2 (`llama3.2:3b`) | 3.2B | Q4_K_M | ~2.0 GB | ~5 GB |

#### Mid-end hardware — Ryzen APUs / integrated GPU, entry-level 1–2 GB discrete GPU

| # | Model | Parameters | Quantization | Size | RAM/VRAM |
|---|-------|-----------|--------------|------|----------|
| 1 | Phi-3 Mini (`phi3:mini`) | 3.8B | Q4_K_M | ~2.4 GB | ~4 GB |
| 2 | Phi-4 Mini (`phi4-mini`) | 3.8B | Q4_K_M | ~2.5 GB | ~4 GB |
| 3 | Qwen2.5 (`qwen2.5:3b`) | 3.1B | Q4_K_M | ~2.0 GB | ~5 GB |
| 4 | Gemma 3 (`gemma3:4b`) | 3.9B | Q4_K_M | ~3.3 GB | ~6 GB |
| 5 | Mistral (`mistral:7b`) | 7.2B | Q4_K_M | ~4.4 GB | ~8 GB |

#### Performance hardware — dedicated GPU (>= 8 GB VRAM) or >= 16 GB RAM

| # | Model | Parameters | Quantization | Size | RAM/VRAM |
|---|-------|-----------|--------------|------|----------|
| 1 | Gemma 3 (`gemma3:12b`) | 12.2B | Q4_K_M | ~8.1 GB | ~12 GB |
| 2 | Qwen2.5 (`qwen2.5:14b`) | 14.8B | Q4_K_M | ~9.0 GB | ~16 GB |
| 3 | Phi-4 (`phi4:14b`) | 14.7B | Q4_K_M | ~9.1 GB | ~16 GB |
| 4 | DeepSeek-R1 (`deepseek-r1:14b`, Qwen distill) | 14.8B | Q4_K_M | ~9.0 GB | ~16 GB |
| 5 | Llama 3.3 (`llama3.3:70b`) | 70B | Q4_K_M | ~42 GB | ~64 GB |

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
- **Formatted replies** — assistant output renders as markdown with headlines, lists, code cards, and KaTeX math, all processed locally by vendored libraries

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
  renderer/      UI for main and companion windows (vendored markdown/math libs in renderer/vendor)
  shared/        IPC channel constants
tests/
  unit/          Store and client tests
  integration/   IPC contract tests
```

## License

[MIT](LICENSE)
