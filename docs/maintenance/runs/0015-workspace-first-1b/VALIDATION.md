# Phase 1B validation

Date: 2026-10-28 UTC. **Native acceptance blocked.** No production tests or source were modified. Phase 1A's known P1.1 failure is carried forward, not rerun or reclassified as passing in this documentation/prototype phase.

## Environment and checkpoint

Windows; Node v24.19.0; installed Unreal 5.8.4. Microsoft Code executable: `C:\Users\Owner\AppData\Local\Programs\Microsoft VS Code\Code.exe`. Failed startup stack references the e646868227 app (1.143.1); another update payload exists, so no successfully running host/version is claimed. PATH's `code` is not substituted for this executable.

Branch before/after: main. HEAD before/after: `1d13b3a7e8e3da41af9f7270b097c239641aaf9a`. Index remains empty. Existing 19 tracked modifications are retained; before/after full status and binary tracked patches are saved in the scratch directory. No commit or clean-tree conversion.

Scratch directory for all commands/artifacts below: `C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1b-20261028T175456Z`.

`baseline.zip` contains 528 tracked/nonignored incoming files; its `manifest.json` records SHA256 per file. ZIP SHA256: `53ff1ea8e41e1ae33f6b3c5414b3964e1366cc75e0ef38e5e1e5ac923bd2715d`. This is a working-file snapshot, not a full Git/ignored-file backup. Phase 1A's separate ignored release backup remains available. Existing Alpha VSIX SHA256 was rechecked: `0dcc21ce55760e8a97825c1c7d3f0bb6ef5862cf8e7f7a7f3b1993c46e30d23a`.

## Executed proof and outcomes

Commands used explicit absolute scratch paths (PowerShell):

```powershell
python C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1b-20261028T175456Z\prepare.py
node C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1b-20261028T175456Z\launch.cjs
node C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1b-20261028T175456Z\contract.cjs
node --check C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1b-20261028T175456Z\probe\test.cjs
node --check C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1b-20261028T175456Z\launch.cjs
python C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1b-20261028T175456Z\finish-docs.py
git diff --check
git rev-parse HEAD
git branch --show-current
git diff --cached --name-only
```

Initial launcher invocation was escalated for the isolated desktop process. It exited 1 before test activation. `project-first-host.log` records at 17:56:18 UTC that vscode-updating was held; at 17:56:48 it still was held and Code refused startup. `proof-launch.log` records no result and exit 1. `project-first-launch.json` preserves exact executable/arguments. Engine-first and relocated native cases were not launched after this failure. Profiles/extensions directories are isolated and retained. No process was killed. A read-only process query scoped to this scratch path returned `[]` in `owned-processes.json`.

After the attempt, the scratch test's root safety assertion was corrected and syntax-checked; it had never executed in the failed host. The launcher was made retry-safe with a required fresh attempt label (`retry1`, etc.); original launcher retained as `launch-initial.cjs`. Therefore the exact original command above is historical: use the labeled command in RESUME for subsequent attempts.

`contract-result.json`: **10 passed**, running the scratch probe against real filesystem fixtures with a mocked VS Code command registry. Cases: project-first, engine-first with renamed roots, relocated fixture, reject engine URI, missing engine, unrelated root, multiple projects, multiple descriptors, remote root and numeric engine mismatch. This establishes only prototype resolver behavior. It does not establish native workspace activation, production command behavior, IntelliSense, task cancellation or runtime provider coexistence.

`finish-docs.py` / `preservation-result.json`: all 528 incoming files unchanged except the exact planned INDEX append; zero unexpected changes or missing files. Engine `.vscode` inventory: all 37 file hashes and the complete file-path set unchanged. This bounded check is not a full engine filesystem trace; no UBT, UHT or Editor execution occurred. Scratch fixture copies do not alter `C:\Dev\Unreal\hex`.

`git diff --check` passed. Native source/code changes are absent; broad build/test reruns were unnecessary for these documentation and disposable probe changes. Existing failing generation acceptance remains intact, with the failure evidence in Phase 1A VALIDATION.

## Documentation and source evidence

Design uses the four requested Phase 1A records and the installed engine source. QueryMode, GenerateClangDatabase and UEBuildTarget observations with file/line references and limitations are recorded in ARCHITECTURE_DECISION. No metadata exporter was executed.

Official documentation consulted:

- [VS Code API](https://code.visualstudio.com/api/references/vscode-api): workspace folder ownership/events and execution APIs.
- [Task providers](https://code.visualstudio.com/api/extension-guides/task-provider): native task integration surface; does not establish Windows process containment equivalence.
- [C++ settings](https://code.visualstudio.com/docs/cpp/customize-cpp-settings): configuration provider and compilation database inputs/precedence.
- [Unreal Build Tool](https://dev.epicgames.com/documentation/unreal-engine/unreal-build-tool-in-unreal-engine): build infrastructure independent of IDE projects.

## Outstanding acceptance

Real minimal two-root host proof in both root orders is mandatory and missing. Renamed/relocated native proofs, trust/reload, GUID/custom engine association, aliases, native IntelliSense freshness, generated headers and companion coexistence remain unverified. Phase 1A's three fresh baseline modes remain incomplete. The provisional hybrid architecture does not resolve P1.1 by assertion. Preserve the evidence and resume after Code's update finishes normally; do not change updater or Bitdefender settings.
