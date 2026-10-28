# Validation — 2026-10-28

| Command/scenario | Result |
| --- | --- |
| Initial `node tools/run-tests.cjs tests/operation-ownership.test.js tests/process-supervision.test.js tests/build.test.js` | 21/21 pass; [baseline.txt](baseline.txt) |
| Targeted admission/ownership/native tests | 22/22 pass; [targeted.txt](targeted.txt) |
| `npm test` in `unreal-auto-setup` | **449 total, 448 pass, one unchanged P1.1 failure**, zero skipped/cancelled/TODO; 26.319 s; [node-final.txt](node-final.txt) |
| `python -B -m unittest discover -s tests -p 'test_*.py' -v` | Four pass; [python.txt](python.txt) |
| `node tools/phase3b2b/check.cjs` | Syntax, public manifest, generation assertion/implementation and native hashes checked; exact count in [interfaces.json](interfaces.json) |
| `python -B bundle_sources.py` | 50 inputs, 41 runtime modules, three mirrors |
| Fresh validation VSIX | Installed, activated, helper verified, repeated Builds and Build-and-Run pass; [installed-host.jsonl](installed-host.jsonl) |
| Post-Editor Build in same installed profile | Pass, Clear claim, empty diagnostics; [resume.txt](resume.txt) confirms cleanup |
| Two real VS Code hosts | Shared-store exclusion, independent project, retry all pass; [cross-window.jsonl](cross-window.jsonl), [windows.txt](windows.txt) |
| Real host reload rerun | Active descendant blocks; completed work safely reconciles; actual UBT reload and subsequent build pass; [host-events.jsonl](host-events.jsonl), [reload.txt](reload.txt) |

The unchanged failing assertion is `generation uses the active engine/project and restores existing VS Code configuration`, generation.test.js:21. No new final-suite failures. Preliminary driver/resource-harness failures were corrected and retained as evidence, not counted as passes.

The real reload rerun used `integration-CoW84l`; final host 42692 recovered matching zero-member exit-0 proof and completed another build. Its store was empty and its run directory was removed after process absence was checked. The two-host run `windows-ySEm8P` also completed and cleaned up. Final installed run `qualification-pyXBbt` completed after UI-assisted Editor shutdown and resume, then cleaned up. Earlier failed installation runs retain files; their profiles are closed separately through a scoped VS Code quit driver.

All new generated executables, VSIXs, profiles, journals and compiler temporary files used `C:\Dev\Scratch\UnrealAutoSetupTests`. Full-suite logs include actual TreeFixture paths. Permanent code and native distribution files remain in the repository. No system-wide environment or antivirus setting changed.

Manual Editor closure is an explicit part of this integration result. No claim is made that the one-shot automated window-close test runs unattended on every Editor configuration. No debugger attach/detach qualification, arbitrary distributed executor containment, cross-machine coordination or long-term stress certification.

Final syntax count: **112 files**. All **29 local report links** resolve; Git whitespace checks passed. Two failed profiles retained background Code processes after the scoped Quit request. Both claim stores were verified empty, then only Code handles matching their exact scratch profiles, executable and creation time were closed. Their files remain as failed-run evidence. The final scoped process inventory reports **zero remaining** test-associated Editor/compiler/supervisor/Code processes; see [process-cleanup.json](process-cleanup.json) and [failed-profile-cleanup.json](failed-profile-cleanup.json). This inventory complements the completed jobs' zero-active receipts rather than substituting for them.
