# Authorized Alpha baseline — 2026-10-28 UTC

The user explicitly authorized the current 1.0.0 Alpha working tree as the migration baseline, including all uncommitted work. Phase 4E reports describe historical qualification, not the current source of truth. No clean-tree requirement or permission to commit is implied.

Branch `main`; HEAD `1d13b3a7e8e3da41af9f7270b097c239641aaf9a` (subject `3B.2c`). Index empty. Incoming status: 19 modified tracked files, 81 individually listed untracked nonignored files. The exact inventory and binary HEAD diff are in the evidence directory below. Stable identity remains `local-tools.unreal-project-tools`; working manifest and installed extension are 1.0.0 Alpha, VS Code minimum `^1.100.0`.

## Recovery without discarding existing work

Evidence directory: `C:\Dev\Scratch\UnrealAutoSetupTests\wf-p1a-20261028T172121Z`.

- `baseline.zip`: 515 tracked and nonignored untracked files, verified against `manifest.json` by SHA-256 after ZIP creation. SHA-256 `d663d95410a88cbf3db9ab55f1933a26a55054e2ced83fd05a2949ceb8c771f7`.
- `baseline-ignored-release.zip`: additional copy of the ignored Alpha VSIX. Original VSIX SHA-256 `0dcc21ce55760e8a97825c1c7d3f0bb6ef5862cf8e7f7a7f3b1993c46e30d23a`.
- `status.txt`, `tracked.patch`, `staged.patch`, `head.txt`, `ignored.txt`, `baseline-comparison.json`: exact inventory, binary Git diff, empty staged diff, HEAD and comparisons. The 2,407 ignored paths include historical integration fixtures; they were not removed or rewritten. This is a recoverable source/configuration baseline, not a full backup of ignored build caches or external applications.

Recovery procedure: verify ZIP hash; extract into a NEW uniquely named directory under the scratch root, inspect the manifest and compare individual files. Do not extract over the live checkout or apply the HEAD patch on top of the already-modified working tree. The ZIP contains current working contents, not Git history. HEAD remains available in the existing repository. No reset/stash/clean is needed.

## Differences from Phase 4E

Phase 4E recorded 16 tracked modifications and 78 untracked files, version 0.8.0, 35 commands and five settings. All recorded status entries remain present. Additional status entries are root README.md, build_bundle.py, packaged README.md, dist/BUILD-NOTES.txt, dist/validation.txt and the 0013 review ZIP. The ignored VSIX is additional packaging evidence, not part of `git status`.

Current manifest changes the display name to Alpha and version to 1.0.0; release validation now expects 1.0.0. Build bundling adds `--release`, writes to dist, and uses the fixed Alpha filename. Both READMEs contain expanded command/settings/snippet documentation. Existing release notes document removal of older generated archives; this session performed no such removals. Source still carries prior Phase 3/4 creation, debugger and process-safety work. All 51 entries in the current Alpha VSIX match corresponding current source assets byte-for-byte. All 41 installed runtime JS modules match current runtime source. Installed directory presence does not establish activation in the user's current window.

The 0.8.0 validation VSIX is absent at its recorded scratch location. The Phase 4E review ZIP contains reports/logs, not a complete final source snapshot. Thus an exact byte-level Phase 4E-to-Alpha source diff cannot be reconstructed for every previously untracked file. Do not claim all changes since Phase 4E are packaging-only. The current baseline snapshot removes this ambiguity for future phases.

## Review flags preserved, not repaired

1. Historical reports and validation counts must not be presented as fresh 1.0.0 qualification. `dist/validation.txt` is Alpha-era historical evidence and still reports a failing strict gate.
2. Packaging `--release` is an artifact-production switch, not a zero-failure release qualification barrier; the Alpha artifact coexists with open P1.1.
3. The fixed Alpha output name in build_bundle.py can drift from future manifest versions.
4. All 35 public command contributions and all five configuration definitions match HEAD exactly when decoded as UTF-8; only the documented packaging identity/snippet changes are inferred from manifest diff.
5. SkyBox 0.1.2 requires VS Code `^1.123.0`, while our manifest permits `^1.100.0`; automatic required-companion setup has a compatibility gap on older allowed hosts.
6. Current VS Code installation contains an update-in-progress marker and refused an isolated launch. Neither updater nor personal profile was modified.

## Exact incoming tracked differences against HEAD

These counts describe the authorized Alpha baseline, not changes made by Phase 1A. Full patch is preserved in scratch.

| Path | Added | Removed |
|---|---:|---:|
| `README.md` | 147 | 16 |
| `build_bundle.py` | 7 | 2 |
| `bundle_sources.py` | 1 | 1 |
| `docs/DEVELOPMENT.md` | 17 | 1 |
| `docs/maintenance/INDEX.md` | 10 | 0 |
| `tools/run-tests.cjs` | 1 | 1 |
| `unreal-auto-setup/README.md` | 147 | 16 |
| `unreal-auto-setup/classTemplates.js` | 10 | 5 |
| `unreal-auto-setup/classWizard.js` | 5 | 5 |
| `unreal-auto-setup/debugger.js` | 20 | 1 |
| `unreal-auto-setup/package.json` | 3 | 2 |
| `unreal-auto-setup/processSupervisor.js` | 2 | 2 |
| `unreal-auto-setup/tests/classFiles.test.js` | 3 | 3 |
| `unreal-auto-setup/tests/classTemplates.test.js` | 5 | 5 |
| `unreal-auto-setup/tests/classWizard.test.js` | 2 | 2 |
| `unreal-auto-setup/tests/debugger.test.js` | 49 | 1 |
| `unreal-auto-setup/tests/real-unreal-validation.js` | 141 | 39 |
| `unreal-auto-setup/tests/testTemp.js` | 1 | 1 |
| `unreal-auto-setup/tests/ux.test.js` | 3 | 3 |
