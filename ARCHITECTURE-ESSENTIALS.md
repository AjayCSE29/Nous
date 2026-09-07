# Nous — Architecture Essentials

This is the short implementation contract. Read it before changing Nous.

1. **The renderer is untrusted.** It gets no Node.js, shell, filesystem, or direct network access.
2. **Ollama lives in the main process.** Every endpoint call, stream parse, and cancellation path belongs there.
3. **IPC is a product API.** Keep it small, named, validated, and documented in `src/shared/channels.cjs`.
4. **Persistence is local and replaceable.** Renderers use repositories through IPC; they never read storage directly.
5. **Companion is a separate window, not a responsive mode.** It has its own renderer/preload but uses the same main-process services.
6. **Context is explicit.** The user sees the source card before sending. No silent window, clipboard, or file capture.
7. **Secure Electron defaults are mandatory.** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and CSP stay on.
8. **Visual language stays quiet.** Light monochrome surfaces, thin neutral borders, clean sans-serif type, no remote visual dependencies, no gradients or bright accents.

## Intended scaffold

```text
src/
  main/        Electron lifecycle, windows, IPC, Ollama, storage, context
  preload/     Narrow main and Companion bridges
  renderer/    Separate main and Companion UI bundles
  shared/      Channel names and shared data constants
assets/        Local icons and packaging assets
tests/         Unit, integration, and renderer tests
```

Before adding a feature, identify its main-process owner, IPC contract, stored data, UI state, and error path.
