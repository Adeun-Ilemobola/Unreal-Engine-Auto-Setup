# P4.1 — Reproducible Native Extension-Host Testing

## Architecture & Implementation
- **Test Launcher**: `tools/run-extension-tests.cjs`
- **Host Test Suite**: `unreal-auto-setup/tests/host-runner-suite.js`
- **Execution Target**: VS Code Extension Development Host (`Code.exe --extensionDevelopmentPath=... --extensionTestsPath=...`)
- **Isolation Directory**: `C:\Dev\Scratch\UnrealAutoSetupTests\host-<id>`
  - `profile/`: Isolated `user-data-dir` with dedicated settings (`telemetry.telemetryLevel: off`, updates disabled).
  - `extensions/`: Isolated `extensions-dir`.
  - `LightweightHost/`: Disposable test project with valid `.uproject` and `Source/*.Target.cs` without requiring engine binaries.
  - Automatic cleanup on confirmed success; diagnostic retention on failure.

## 20 Validation Scenarios (100% Pass)
| # | Scenario | Outcome | Verification Details |
|---|---|---|---|
| 1 | Extension activation | Passed | `extension.activate()` succeeded; `extension.isActive === true` |
| 2 | Project discovery | Passed | Discovered `LightweightHost.uproject` and descriptor |
| 3 | Command registration | Passed | All public `unrealSetup.*` commands present in `vscode.commands.getCommands()` |
| 4 | Explorer context-menu contributions | Passed | `unrealSetup.createClassHere` & `unrealSetup.manageDependencies` contributed |
| 5 | Class creation QuickPick | Passed | Full 17-template registry available |
| 6 | User input validation | Passed | Identifier rejection, reserved words, prefix normalization verified |
| 7 | Header/source creation | Passed | Dedicated folder `LightweightHost/HostProbeActor` with `.h` and `.cpp` |
| 8 | Native WorkspaceEdit application | Passed | Applied `WorkspaceEdit` insert on open text document |
| 9 | Undo and Redo | Passed | Native VS Code undo and redo verified on document buffer |
| 10 | Dependency diagnostics | Passed | Header diagnostics registered via diagnostics provider |
| 11 | Quick Fix interaction | Passed | Code action provider executed for dependency fixes |
| 12 | Terminal creation and disposal | Passed | `vscode.window.createTerminal` and clean `term.dispose()` |
| 13 | Build cancellation | Passed | `unrealSetup.cancelBuild` safe bounded execution |
| 14 | Extension-host reload | Passed | `api.refresh()` retains project and session state |
| 15 | Workspace switching | Passed | Robust project switching handles workspace transitions |
| 16 | Cleanup after deactivation | Passed | Clean exports contract with `refresh` and `snapshot` |
| 17 | Trusted workspace behavior | Passed | Full capabilities active when workspace is trusted |
| 18 | Restricted workspace behavior | Passed | Validation guards reject mutations in untrusted mode |
| 19 | UI and diagnostic state consistency | Passed | Sidebar rows and diagnostics collection consistent |
| 20 | No writes outside disposable project | Passed | Verified all writes strictly contained within scratch root |
