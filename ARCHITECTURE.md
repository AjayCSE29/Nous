# Nous — Architecture

## Overview

Nous uses Electron's process separation to keep the user interface unprivileged. The **main process** owns windows, persistence, and all Ollama traffic. Each **renderer** is an isolated presentation layer. A small, typed IPC boundary is the only route between them.

```text
 Main renderer                 Preload bridge                 Main process
 ┌───────────────────┐        ┌─────────────────┐            ┌────────────────────────┐
 │ main UI + state   │ ─IPC─> │ allow-listed API │ ─IPC─>     │ window manager         │
 │ no Node / shell   │ <────  │ input validation │ <────      │ Ollama client          │
 └───────────────────┘        └─────────────────┘            │ conversation store     │
                                                               │ settings store         │
 Companion renderer            Companion preload              │ context coordinator    │
 ┌───────────────────┐        ┌─────────────────┐            └───────────┬────────────┘
 │ companion UI       │ ─IPC─> │ narrow API      │                        │
 └───────────────────┘        └─────────────────┘                  Local Ollama
                                                                     127.0.0.1:11434
```

## Runtime components

| Component | Responsibility | Must not do |
| --- | --- | --- |
| Main process | Create windows; register IPC; invoke Ollama; manage streaming cancellation; persist settings/history; own Companion state | Render UI or expose generic process/file APIs |
| Ollama client | Normalize endpoint; list models; make streamed chat requests; turn NDJSON into events | Accept arbitrary URLs or leak raw errors into UI |
| Conversation store | Persist conversation metadata/messages locally; perform migrations; provide scoped CRUD | Sync remotely |
| Context coordinator | Normalize explicit selection/window/file context; enforce size/type limits; redact unsupported payloads | Capture anything silently |
| Preload scripts | Publish the exact API consumed by their renderer and relay subscribed events | Export `ipcRenderer`, Node modules, or generic `invoke` |
| Renderers | Present state and request allowed actions; sanitise displayed text | Access network, filesystem, shell, or Electron internals |

## Process and window model

- `main` creates the primary desktop window and, on demand, a separate narrow Companion `BrowserWindow`.
- Companion uses a dedicated preload and renderer bundle. It shares persisted conversations through the main-process store, never through renderer storage synchronization.
- Always-on-top is controlled only by a specific `companion:set-always-on-top` IPC action and is reflected back to the UI.
- Browser windows use `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and a restrictive content security policy.
- CSP is enforced at two levels: an HTTP response header added via `session.defaultSession.webRequest.onHeadersReceived` (defense in depth) and a `<meta>` tag in each renderer HTML document. Both allow only same-origin scripts and images; `style-src` adds `'unsafe-inline'` because KaTeX emits inline styles. Scripts stay `'self'` — there is no `unsafe-eval`, no remote font, style, image, or script.
- Markdown, KaTeX, and DOMPurify are vendored into `src/renderer/vendor/` and shipped with the app, so rendering never depends on a network or a CDN.
- Stores persist via write-to-temp-then-rename so a crash never leaves a truncated JSON file.

## IPC boundary

IPC channels are named in `src/shared/channels.cjs`. Payload schemas live beside their owners and every `ipcMain.handle` validates input before work begins.

| Domain | Example actions |
| --- | --- |
| Models | `models:list`, `models:refresh` |
| Chat | `chat:send`, `chat:cancel`, streamed `chat:chunk`, `chat:complete`, `chat:error` |
| Conversations | `conversations:list`, `conversations:create`, `conversations:read`, `conversations:update`, `conversations:delete` |
| Settings | `settings:read`, `settings:update`, `connection:test` |
| Companion | `companion:open`, `companion:set-always-on-top`, `context:attach`, `context:remove` |
| External navigation | `shell:open-external` — opens only validated `http`/`https` URLs in the system browser |

## Rendering assistant content

- Cleaned markdown, GFM, and KaTeX math are rendered from vendored libraries (`marked`, `DOMPurify`, `KaTeX`) executed entirely in the renderer; `src/renderer/shared/markdown.js` owns the pipeline (markdown → sanitize → math → code cards → link handling).
- `pre` blocks become copyable code cards. Links only ever go through the allow-listed `shell:open-external` IPC; the renderer never navigates, and non-http(s) links are inert.

## Data model

The initial persistence adapter stores JSON under Electron's `userData` directory. It is wrapped behind repositories so the format can later migrate to SQLite without renderer changes.

```text
Settings { ollamaHost, lastModel, companionAlwaysOnTop, theme }
Conversation { id, title, model, createdAt, updatedAt, messages[] }
Message { id, role, content, createdAt, contextRefs? }
ContextRef { id, kind: selection|window|file, label, content?, createdAt }
```

## Chat streaming sequence

1. Renderer submits validated prompt, chosen model, conversation ID, and explicit context IDs.
2. Main process resolves persisted context and creates the Ollama `/api/chat` request.
3. Ollama client parses streamed NDJSON and emits scoped chunks to only the calling web contents.
4. Renderer appends chunks to its in-memory active message and updates the local store only on completion (or a recoverable partial record on interruption).
5. Cancellation, connection error, or malformed chunks emit an error event and restore composer availability.

## Security and privacy controls

- Accept only `http`/`https` endpoints; the settings default is loopback and non-loopback endpoints require explicit user configuration.
- Validate message, model, host, conversation ID, and context payload size/type at IPC entry.
- `settings:update` accepts only allow-listed fields (`ollamaHost`, `lastModel`, `companionAlwaysOnTop`, `theme`) and rejects invalid types before persisting.
- Never expose filesystem paths or full context content in logs.
- Use a restrictive CSP with no remote scripts, fonts, or images.
- Persist only the data necessary for local history; provide deletion at the conversation level.

## Testing strategy

- Unit tests: host normalization, stream parser, payload validation, context limits, and store CRUD.
- Main-process integration: IPC contracts with a mocked Ollama server and persistence adapter.
- Renderer tests: empty, connected, disconnected, streaming, and context-attached states.
- Manual Fedora QA: window controls, keyboard paths, always-on-top, Ollama unavailable/reconnect, and visual comparison against Stitch.
