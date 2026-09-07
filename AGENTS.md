# Nous Agent Guide

## Documentation read order

1. `SRS.md` — requested behavior.
2. `ARCHITECTURE-ESSENTIALS.md`, then `ARCHITECTURE.md` — implementation contract and design.
3. This file — working and design constraints.

## Project intent

Build Nous as a private, Fedora-first Electron client for local Ollama models. The product has two surfaces: the primary chat application and a compact Companion window. The approved visual reference is the shared Google Stitch Nous project, especially its quiet monochrome and editorial variants. User-facing copy stays plain, private, and discreet.

## Mandatory engineering rules

- Read `ARCHITECTURE-ESSENTIALS.md` before implementation and follow `ARCHITECTURE.md` for details.
- Do not give renderers direct Node, shell, filesystem, or Ollama access.
- Do not add accounts, analytics, telemetry, cloud AI, remote fonts, remote images, or remote scripts.
- Add new IPC only through a named, validated, allow-listed contract.
- Keep Companion as a separate Electron window with its own renderer and preload entry point.
- Treat context as explicit user-provided data. Do not implement passive capture.
- Preserve secure BrowserWindow defaults and a restrictive CSP.
- Keep dependencies lean; prefer platform/browser APIs where appropriate.

## Design rules

- Light monochrome palette: white, warm off-white, soft gray, charcoal, black.
- Minimal Fedora/Linux-native feel; rounded corners, quiet shadows, thin neutral borders.
- No gradients, color accents, avatars, marketing surfaces, or visual clutter.
- Verify keyboard access, focus state, empty/loading/error states, and reduced-motion behavior.

## Working practices

- Inspect existing work before editing. Preserve unrelated changes.
- Make small, coherent changes and verify them proportionately.
- Test against a mock Ollama endpoint before relying on a local runtime.
- Never store secrets or real user context in fixtures, logs, or commits.
- Update architecture documents when changing process ownership, IPC, storage, or security boundaries.
