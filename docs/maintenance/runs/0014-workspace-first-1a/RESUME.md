# Resume — Phase 1A only

Status: **Incomplete**. Source/ownership/reference audit is documented; native matrix blocked. Read PLAN_STATUS.md and RESULT.md first. Current user-authorized baseline is 1.0.0 Alpha on `main`, HEAD `1d13b3a7e8e3da41af9f7270b097c239641aaf9a`. Preserve all incoming dirty work. Phase 4E is historical; Phase 1B is NOT authorized.

Last successful operations: completed source ownership/write-boundary audit and direct hex archive comparison; focused tests finished 30 pass / 1 unchanged P1.1 failure; simulated-UI wizard probe reproduced silent gate and recovery on dismissal. Native launch failed on VS Code update mutex. Read-only scoped process verification found no run-owned Code/Editor/dotnet/supervisor/node processes. Failed profile remains at `C:\Dev\Scratch\UnrealAutoSetupTests\host-kzaJKz`; do not delete or reuse it automatically.

Evidence and recoverable baseline: `C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1a-20261028T172121Z`. `baseline.zip`/manifest contain the starting source and nonignored artifacts; a separate ZIP preserves the ignored Alpha VSIX. See BASELINE.md for hashes and recovery precautions. `preservation-check.json` records final baseline/reference comparisons. No automatic restore, Git reset or commit.

Changed files this phase: new `docs/architecture/workspace-first/MASTER_PLAN.md`, this single maintenance run's 11 Markdown reports, and an appended INDEX.md entry. Runtime/tests/packaging and all pre-existing report contents remain preserved. No UBT/Editor was run. No test process is intentionally left running.

Next command, **only once the existing VS Code update has completed**, from the repository in PowerShell:

```powershell
$env:VSCODE_PATH='C:\Users\Owner\AppData\Local\Programs\Microsoft VS Code\Code.exe'
node tools/run-extension-tests.cjs C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1a-20261028T172121Z\wizard-host.cjs
```

Use a fresh evidence log filename. The launcher creates a new isolated profile and lightweight source fixture under scratch. Expected observation: native notification remains pending, a second registered handler invocation yields no picker, dismissal permits retry. Picker/input/modal answers are scripted; this is still not a fully manual Explorer/UI reproduction. Preserve failed artifacts and report new results accurately. Do not manipulate the updater or substitute Cursor.

Then finish real no-SkyBox/SkyBox-only/coexistence observations and independent baseline A/C provenance only within Phase 1A scope. Before any generator experiment, resolve how installed-engine writes will be prevented; current UBT source has a conditional engine .vscode writer, and no safe redirection flag has been established. Keep P1.1's original failing test. Stop at Phase 1A; obtain a new user instruction before any Phase 1B proof or rewrite.
