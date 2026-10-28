# Workspace-first migration status

Overall: **Incomplete — Phase 1A investigation checkpoint**.
Current subphase: **1A only**. Source/ownership/reference audit and documentation complete; native reproduction/comparison matrix is not complete. Phase 1B and every implementation phase: **Not Started, not authorized**.

Authorized baseline: current 1.0.0 Alpha working tree on main at `1d13b3a7e8e3da41af9f7270b097c239641aaf9a`, expressly accepted by user after the initial read-only stop. Phase 4E is historical review evidence, not an authoritative current version. P1.1 remains OPEN; production release not qualified.

| Phase 1A requirement | Evidence / status |
|---|---|
| Preserve and document current dirty baseline | Complete: recoverable source snapshot, patch/inventory, Alpha comparisons; no prior source edits overwritten |
| Inventory every command/critical service | Complete: 35 commands, five settings and all 41 runtime JS modules; ownership and conditional dispositions |
| Inspect reference two-root workspace | Complete read-only: actual hex folder and .zip, 24 tasks, nine launch entries, compile entries/source/response files |
| Consult official docs | Complete relevant contract review, with implementation/version limits |
| First/second creation | Actionable mechanism reproduced under simulated UI; exact native steps recorded. Native host confirmation blocked by VS Code updater |
| Distinguish three baseline modes | Complete definitions and separate provenance requirements; only existing generated capture observed, no fresh A/C runs |
| No-SkyBox / SkyBox-only / coexistence and IntelliSense observation | Not run; active provider/interference remains unverified |
| P1.1/write boundary | Current assertion fails; generator source proves conditional engine writes; no fix claimed |
| No production modifications / future phase work | Preserved; only new docs and additive maintenance-index entry |

The master plan permits an explicitly unverified native symptom with exact reproduction steps, which this audit supplies. Nevertheless this report uses **Incomplete**, rather than implying all requested controlled baselines and companion experiments have executed. The limitation is test-host availability and unproven generator output containment, not lack of authorization to audit the current dirty tree.

Next action within Phase 1A, if continued: once VS Code's existing update completes, rerun the retained isolated native wizard probe; record actual extension activation/provider/task resolution in the three separate profiles and determine a no-engine-write metadata experiment before invoking UBT. Do not alter the updater, ignore engine-write risks, or start a Phase 1B proof-of-concept automatically. See RESUME.md for commands.
