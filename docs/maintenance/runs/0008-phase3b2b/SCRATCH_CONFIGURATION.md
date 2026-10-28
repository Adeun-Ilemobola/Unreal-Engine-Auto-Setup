# Temporary artifact relocation

User steering during Phase 3B.2b requested moving executable-generating tests out of Windows Temp to the already-excluded development directory. No Bitdefender/antivirus setting was inspected or changed.

Default Windows root: `C:\Dev\Scratch\UnrealAutoSetupTests`.

- `tools/run-tests.cjs`: unique suite directory, child-only TEMP/TMP/TMPDIR and UNREAL_AUTO_SETUP_TEST_TEMP, cleanup on normal/failed test exit. `npm test` routes through it.
- `tests/testTemp.js`: per-process scratch root, descendant compiler environment, exit cleanup. All Node harnesses formerly calling os.tmpdir for fixtures now use it, including runner scripts that generate executables.
- Python packaging fixtures use the dedicated root and retain TemporaryDirectory cleanup.
- Native helper build scopes compiler TEMP/TMP and restores caller values; permanent source and deliverable binary stay in the repository.
- Integration launcher creates its profile, driver, compiled TreeFixture.exe, release barriers and supervisor journal in an integration-* scratch directory. Uncertain integration records are deliberately retained until verified cleanup.

Executed: `node tools/run-tests.cjs tests/process-supervision.test.js tests/operation-ownership.test.js tests/runner.test.js` — initially 18/18 passed. Final `npm test`: 442 tests, 441 passed, one unchanged P1.1 failure. Python packaging: four passed. Syntax: 102 files passed. Packaging preflight passed. See node-final.txt, python-final.txt and final-checks.json.

The final suite compiled `C:\Dev\Scratch\UnrealAutoSetupTests\suite-i6Ch7N\node-70124-WUTJI4\supervision-ARIpnM\TreeFixture.exe`. After the suite exited with its known test failure, the suite directory was confirmed absent. This verifies cleanup on a failing suite as well as output placement.

Final real VS Code/UBT integration `integration-jAiaCo` and two-window test `windows-PbSW39` passed and were automatically removed after completion barriers and a bounded process absence check. Their launch logs record successful cleanup. The Editor cancellation test used `editor-NNADJu`, preserved the independently spawned Editor during job cancellation, then closed its exact owned Editor handle and removed scratch. Integration cleanup refuses paths outside the dedicated root and retains directories if completion or process absence cannot be established.

Limitations: scratch writes require environment approval outside the repository sandbox; forced process termination cannot run JavaScript/Python cleanup hooks. Previous uncertain lifecycle records were not deleted or silently relocated while they could represent active work. Production user journals continue to use VS Code global storage; the relocation concerns test execution, not user-facing runtime storage.
