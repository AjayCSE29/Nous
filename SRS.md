# Nous — Software Requirements Specification

## 1. Purpose

Nous is a Fedora-first Electron desktop application for private conversations with locally installed Ollama models. It provides a polished main chat client and a compact Companion window without accounts, cloud AI, or renderer access to Node.js or the shell.

## 2. Scope

### In scope

- Discover models from a configurable local Ollama server (default `http://127.0.0.1:11434`).
- Stream responses from Ollama's `/api/chat` endpoint.
- Create, browse, rename, and delete locally persisted conversations.
- Main window with sidebar, model picker, chat view, empty state, composer, and connection settings.
- Companion window: narrow, optionally always-on-top surface with local context attachments (selection, window, or file), composer, and streaming state.
- Light, monochrome, Fedora-native visual system.
- Clear unavailable-server and error states.

### Out of scope for the first release

- Accounts, sync, analytics, telemetry, cloud inference, collaboration, extensions, and web search.
- Direct renderer access to the filesystem, shell, Node.js, or Ollama network endpoint.
- Automatic system-wide capture of application content. Context capture must be explicit and permission-aware.

## 3. Users and core journeys

1. **Start a private chat:** choose an installed model, write a prompt, receive a streamed answer, and resume the conversation later.
2. **Recover from unavailable Ollama:** see a calm connection state, update the endpoint in Settings, reconnect, and select a model.
3. **Ask alongside work:** open Companion, explicitly attach a selection/window/file, verify its context card and local indicator, then ask a question.
4. **Manage local history:** create a chat, switch among recent chats, rename one, or delete it locally.

## 4. Functional requirements

| ID | Requirement |
| --- | --- |
| FR-1 | On launch, Nous shall attempt model discovery from the configured Ollama endpoint. |
| FR-2 | Nous shall display installed model names and prevent sending when no model is available. |
| FR-3 | Nous shall stream assistant content as it arrives and provide an in-progress indicator. |
| FR-4 | Nous shall store conversations, titles, messages, and UI preferences only on the local device. |
| FR-5 | Nous shall expose configuration and Ollama operations solely through a narrow Electron IPC API. |
| FR-6 | The main window shall support new chat, recent-chat selection, clear/delete, model selection, and connection settings. |
| FR-7 | Companion shall support a dedicated compact window, always-on-top toggle, model selection, context attachment/removal, and chat. |
| FR-8 | Context supplied to Companion shall be visible before submission and included only in that request unless the user explicitly retains it. |
| FR-9 | Nous shall communicate connection, streaming, and failure states accessibly. |

## 5. Non-functional requirements

- **Privacy:** no data leaves the configured Ollama endpoint; no analytics or remote assets are required at runtime.
- **Security:** context isolation enabled, sandbox enabled, Node integration disabled, strict IPC validation, endpoint protocol validation.
- **Performance:** responsive input while streaming; messages should render incrementally without blocking the interface.
- **Reliability:** network and malformed-stream errors must leave a usable conversation and understandable retry path.
- **Accessibility:** keyboard-operable controls, visible focus states, semantic labels, readable contrast, and reduced-motion support.
- **Platform:** Fedora/Linux is the primary target; app behavior must not rely on macOS or Windows-only APIs.

## 6. Acceptance criteria

- A Fedora user with Ollama running locally can select an installed model and complete a streamed chat without an account or internet connection.
- The renderer cannot invoke arbitrary shell commands, read arbitrary files, or call Ollama directly.
- Closing/reopening Nous preserves local conversations and the configured endpoint.
- Companion can remain above other windows when enabled, accepts/removes explicit context, and never implies hidden capture.
- Both windows match the approved Nous light, monochrome interface direction.
