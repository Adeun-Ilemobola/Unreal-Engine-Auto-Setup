# Resume WF-P1B

State: **Blocked**, not Accepted. User authorized Phase 1B using Phase 1A's existing OWNERSHIP_MATRIX, DECISIONS, BASELINE and RESUME. Those remain unchanged. Current 1.0.0 Alpha dirty working tree is the baseline; Phase 4E is historical evidence. Do not clean or commit existing work.

Read PLAN_STATUS, ARCHITECTURE_DECISION, COMPATIBILITY_MATRIX, MIGRATION_MAP and VALIDATION in this directory. C/hybrid is provisional; retain the process supervisor. P1.1 remains open. No Phase 2 work has started.

Scratch root: `C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1b-20261028T175456Z`. Original project-first native launch failed before extension activation because Microsoft Code's updater mutex remained held. Other native cases were not attempted. No owned proof processes remained at the recorded inspection. Profiles and logs were retained.

After the update completes normally, inspect current Git state and scratch files; never overwrite previous evidence. The launcher requires a new unused attempt label and creates isolated profiles/extensions directories:

```powershell
node C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1b-20261028T175456Z\launch.cjs retry1
```

Use retry2 etc. if retry1 already exists. Launcher runs project-first, engine-first-renamed, then relocated; stops on first failure and never kills a process. Keep generated host/result logs. Verify native extension activation and correct descriptor/engine results, absence of engine writes and unchanged existing files; update evidence and status only to what results support. Recheck host-owned processes before another launch. Do not interfere with updater, personal profiles, installed engine or Bitdefender.

The scratch contract harness can be rerun with `node ...\contract.cjs`, but its result remains mocked-host evidence. Its fixture setup writes scratch files; preserve earlier artifacts before rerunning. Native fixtures copy hex descriptor/Source and are not fresh Blueprint-conversion/conventional C++ baselines.

Baseline ZIP SHA256: `53ff1ea8e41e1ae33f6b3c5414b3964e1366cc75e0ef38e5e1e5ac923bd2715d`. Read CHANGES for targeted rollback; never replay this snapshot over later edits. Stop at Phase 1B; a later implementation phase requires user direction.
