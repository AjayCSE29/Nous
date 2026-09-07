# Changelog

All notable changes to Nous are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Adds Native RPM packaging (spec + rpmbuild) alongside the AppImage.
- Fixes the logo appearing in the window title bar, window shell, and app
  empty states; ships a 512px hicolor icon.
- Adds a stop/cancel control and Escape-key cancellation to both windows.
- Makes the Companion window resume the latest conversation on open.
- Adds a context picker (pasted selection, current window, or selected file)
  with the context shown before submission.
- Surfaces generation errors with a retry affordance and wires Ctrl+N / Cmd+N
  to start a new chat.
- Adds privacy and security documentation and a MIT license file.
- Renders assistant replies as markdown with KaTeX math and copyable code
  blocks; clicks on http(s) links open the system browser through a new
  allow-listed `shell:open-external` IPC. Rendering libraries are vendored
  locally.
- Formats display math that common models emit in multi-line `$$...$$`,
  `\[...\]`, `\begin{env}` blocks, and bare `[ latex ]` or `( latex )` lines,
  which KaTeX auto-render alone cannot match.