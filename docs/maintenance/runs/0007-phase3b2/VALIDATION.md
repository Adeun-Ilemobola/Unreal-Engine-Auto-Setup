# Validation

- Before implementation: `node --test unreal-auto-setup/tests/operation-ownership.test.js` failed because the new durable-ownership module did not exist; captured in red-tests.txt. The existing service's new-instance memory loss was established from source and then reproduced with the durable reload test. A pre-change real-host failure was not recorded.
- `node --test unreal-auto-setup/tests/operation-ownership.test.js`: 10/10 pass (ownership-tests.txt). Existing cancellation/lifecycle, coordinator and functionality tests also run in the full suite.
- From extension directory: `npm test > ../docs/maintenance/runs/0007-phase3b2/node-final.txt 2>&1`: 435 total, 434 pass, one unchanged P1.1 failure, no skips/TODO. Exit 1. Final successful lifecycle run used required narrow escalation; earlier sandbox test runs failed cancellation or timed out and are retained as non-authoritative intermediate logs.
- From root: `python -B -m unittest discover -s tests -p 'test_*.py' -v`: four pass after sandbox temporary-file access failure was rerun with scoped escalation (python-suite.txt).
- `python -B bundle_sources.py`: 46 inputs, 40 runtime modules, three mirrors pass; no VSIX/archive overwrite.
- `node tools/phase3b2/check.cjs`: syntax checks, export-name compatibility, unchanged manifest and P1.1 test, documentation links and packaging; checks.json records results.
- `git diff --check`: pass after preserving LF on edited existing sources. Original Python edits converted line endings; corrected without broad formatting changes.
- Git descriptor ignore check and final working-tree inventory recorded; original history and recovery records unchanged in tracked diff.
- Actual VS Code reload and direct UBT results/limits: INTEGRATION_RESULTS.md. No real UBT reload, live Editor survival or successful post-recovery managed retry claim.

The matrix is adapted to quarantine-only architecture. No claim is made that all requested full-tree/cancellation recovery scenarios passed. Exact-process handle termination and verified tree completion remain acceptance gaps.
