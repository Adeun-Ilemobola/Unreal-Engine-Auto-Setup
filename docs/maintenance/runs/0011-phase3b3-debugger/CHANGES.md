# Phase 3B.3 / Phase 4B Debugger Lifecycle Changes

## Source Files Modified
- `unreal-auto-setup/debugger.js`:
  - Added duplicate attach guard: checks `vscode.debug.activeDebugSession` and rejects duplicate attachment if already attached to the target PID (`Debugger is already attached to Unreal Editor (PID <pid>).`).
  - Added and exported `detach(vscode, session)`: detaches active debug session cleanly via `vscode.debug.stopDebugging()` without terminating the target process.
- `unreal-auto-setup/tests/debugger.test.js`:
  - Added test for duplicate attachment rejection.
  - Added test for full attach -> detach -> survival -> re-attach -> detach cycle.

## New Tools
- `tools/phase4b/debugger-lifecycle.cjs`:
  - End-to-end integration harness executing real Unreal Editor launch, detection, attach, duplicate prevention, detach, survival verification, reattach, second detach, and owned-PID cleanup.
