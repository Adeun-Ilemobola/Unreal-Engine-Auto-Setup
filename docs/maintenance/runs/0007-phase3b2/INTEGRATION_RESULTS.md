# Integration results

[Raw host events](host-events.jsonl) include a failed harness path check followed by the successful corrected run. Initial manifest `engines.vscode=*` was rejected by VS Code, then fixed to `^1.100.0`; Windows workspace path comparison was corrected to case-insensitive. No product behavior was altered to hide these harness failures.

Isolated development profiles under the verified ignored Phase3AIntegration fixture; maintained extension source loaded via `--extensionDevelopmentPath`. `tools/phase3b2/host.cjs` was loaded through a disposable extension with `onStartupFinished`. VS Code 1.143.1, extension 0.8.0. The child was a dedicated harmless PowerShell wait loop, tagged with a random operation UUID, with a release marker and a 90-second self-exit bound; no compiler or Editor was used as the reload target.

Before reload: host 76744, child 77416; exact CIM identity observed. `workbench.action.reloadWindow` interrupted the host. After reload: host 61008, persisted claim found, identity Unknown. Actual `unrealSetup.build` returned Blocked; actual runtime snapshot showed Recovery blocked. Combined reconciliation/refresh/command latency 2217 ms (not a comparable Phase3A performance benchmark). Cleanup observed the child root absent. This does not prove why it exited or certify arbitrary descendant exit. Claim intentionally retained; no recovered PID termination attempted. Driver requested closeWindow.

Ordinary direct build command (repository root):

```powershell
& 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.exe' Phase3AIntegrationEditor Win64 Development '-Project=C:\Dev\VSCodeTools\unreal-auto-setup\.local-test-projects\Phase3AIntegration\Phase3AIntegration.uproject' -WaitMutex -NoHotReloadFromIDE
```

[UBT output](ubt-build.log), [exit code](ubt-exit.txt): succeeded, exit 0, target up to date, zero compiler actions, 1.53 seconds. This is not a managed Build/Run or compilation/reload acceptance result. Current engine binary version is in checks.json; MSVC/SDK were not exercised by this up-to-date invocation.

No real UBT interruption was attempted because full-tree ownership/recovery is unproven. No Editor was launched, closed or adopted. Live Editor survival, successful subsequent managed operation and managed normal completion release remain unverified/unmet.

The initial isolated host remained visible immediately after UI cleanup attempts; the final targeted process query subsequently found no task-profile processes or test child. No forced tree termination was used. The corrected host's close request and child-root absence are recorded; final point-in-time process checks are in cleanup.json. No global process termination or unrelated GUI interaction.
