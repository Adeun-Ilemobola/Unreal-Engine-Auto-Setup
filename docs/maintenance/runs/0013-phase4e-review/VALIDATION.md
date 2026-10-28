# Commands and outcomes

Commands ran from C:\Dev\VSCodeTools\unreal-auto-setup. Native/host operations used narrowly scoped sandbox exceptions where process/OS access required them. Initial sandbox junction restrictions were rerun with authorized access; they were not counted as product failures.

| Command / check | Result / evidence |
| --- | --- |
| git branch --show-current; git rev-parse HEAD; git status --short; git diff; git diff --cached | main at 1d13b3a7e8e3da41af9f7270b097c239641aaf9a; incoming unstaged work preserved; no staged changes |
| node tools/run-tests.cjs tests/classTemplates.test.js tests/classFiles.test.js tests/classWizard.test.js tests/creation-expansion.test.js tests/debugger.test.js (incoming baseline) | 73/73; 67 creation plus six incoming debugger tests; baseline.txt |
| node tools/run-tests.cjs tests/debugger.test.js tests/release-gate.test.js | 13/13; debugger-unit.txt and focused.txt |
| node tools/run-tests.cjs tests/engine-validation-failures.test.js | 12/12; engine-faults.txt; final full suite repeats these after retention hardening |
| node tools/run-tests.cjs | 494 total, 493 passed, only unchanged P1.1 failed; exit 1; node-final.txt |
| python -B -m unittest discover -s tests -p test_*.py -v | 4/4; python.txt |
| python -B bundle_sources.py | 51 inputs, 41 runtime modules, three exact document mirrors; preflight.txt |
| node tools/validate-release.cjs | 11/12; strict exit 1 for P1.1; 126 JS/CJS files syntax-checked, 353 documentation links resolved; release-gate.txt contains manifest/native checks and repeated full-suite failure |
| node tools/phase4e/check.cjs C:\Users\Owner\.vscode\extensions\esbenp.prettier-vscode-12.4.0\node_modules\prettier\index.cjs | All prior exports retained; 35 commands/five settings unchanged; P1.1 files unchanged; native hashes match; workflow YAML parses; 17 UHT headers found; interfaces-ci-uht.txt |
| node tools/run-extension-tests.cjs | 20/20 accurately labeled checks in real VS Code; verified scratch cleanup; host.txt |
| UNREAL_VALIDATION_RECORD_DIR=...\0013-phase4e-review; node tools/phase3b3z/compile.cjs | UE 5.8.4 target Phase3AIntegrationEditor Win64 Development: 17 generated types, 19 real actions, exit 0, private-job proof activeProcesses=0; compile.txt, ubt.txt, generated.json, compile-result.json |
| node tools/phase4e/launch-debug.cjs | Two genuine cppvsdbg attach/disconnect cycles; same Editor PID survives; clean host/profile removal; real-debugger.json, debugger-final.txt |
| node tools/phase4e/launch-package.cjs | Fresh validation-only VSIX; CLI installed into isolated profile; all commands and four native snippet insertions verified; installed-package.json, installation.txt, package-host.txt |
| git diff --check | Clean; whitespace.txt |

Full-suite native coverage includes root-exited descendants, private-job cancellation, breakaway refusal, supervisor loss without fabricated proof, claim arbitration and subsequent operations. TreeFixture.exe is compiled under the testTemp-created suite/node/supervision path within the fixed scratch root; csc inherits the same TEMP/TMP scope. Fault-stage logs include exact stage paths and full completion proofs. Python TemporaryDirectory also uses the fixed scratch base. Successful roots are automatically removed; uncertain roots are preserved.

The standalone three-stage real validator was not rerun against a second fresh engine project: the smallest independent 17-type compile was used, as requested. Its stage orchestration/failure behavior was exercised with real supervised synthetic commands; those results are not mislabeled as additional engine builds. No remote CI run or new full interactive wizard/reload/Quick Fix claim is made.

Final scoped OS process inspection found no Code, Editor, UBT, dotnet, supervisor or TreeFixture process referencing this repository or dedicated scratch. A separate unassociated Editor was visible to general Editor discovery, so that broader query returned Unknown with zero project matches; it was left untouched. This does not negate the task-owned close events and exact-run cleanup barriers. The sanitized scoped inventory is final-owned-processes.json.
