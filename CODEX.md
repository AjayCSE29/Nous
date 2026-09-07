# Nous — Codex Instructions

## Start here

1. Read `SRS.md` for the requested behavior.
2. Read `ARCHITECTURE-ESSENTIALS.md`, then `ARCHITECTURE.md` when touching implementation design.
3. Read `AGENTS.md` for working and design constraints.

## Current phase

The repository is intentionally at an architecture-and-scaffold checkpoint. Source and test files are empty by design. Do not implement product code until the user explicitly approves the scaffold.

## When implementation begins

- Establish the Electron project metadata and secure main window first.
- Implement main-process services and the IPC contracts before renderer calls.
- Build the main window and Companion independently on the shared visual system.
- Test against a mock Ollama endpoint before relying on a local runtime.
- Keep user-facing copy plain, private, and discreet.
