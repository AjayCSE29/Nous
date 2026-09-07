# Security Policy

Nous is a private, local-first desktop client. It never sends data outside the
configured Ollama endpoint, and it has no accounts, analytics, telemetry, or
cloud components.

## Reporting a vulnerability

Do **not** open a public issue for security problems. Report privately by
opening an issue with the `security` label on the project repository, or by
emailing the maintainer.

Please include:

- The Nous and Electron versions affected (`nous --version`, or the version in
  `package.json`).
- Steps to reproduce.
- The impact you expect.

## Scope

- The main process (`src/main/`), renderer boundaries (`src/preload/`), and IPC
  contract (`src/shared/channels.cjs`).
- Packaging and release artifacts.

## Non-goals

- Vulnerabilities in Ollama itself should be reported to the Ollama project.
- General Electron/Chromium advisories belong to the Electron security policy;
  Nous tracks upstream Electron releases.