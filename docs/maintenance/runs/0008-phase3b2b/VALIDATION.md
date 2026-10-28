# Validation

Final full suite command: `npm test` from `unreal-auto-setup/`. [node-final.txt](node-final.txt): 442 tests, 441 pass, one fail, zero skipped/cancelled/TODO; 13.047 seconds. The failure is the unchanged `generation uses the active engine/project and restores existing VS Code configuration` assertion at generation.test.js:21. This is known P1.1, not a green suite or a new scratch regression.

`node tools/phase3b2b/check.cjs`: 102 JavaScript/CommonJS files passed syntax checks; full manifest comparison allows only the test-script change; public commands/settings/version and generation implementation/assertion remain unchanged; helper hashes verified. See [final-checks.json](final-checks.json).

`python -B -m unittest discover -s tests -p 'test_*.py' -v`: four passed ([python-final.txt](python-final.txt)). `python -B bundle_sources.py`: 50 packaging inputs, 41 runtime modules, three matching product-document mirrors. This is preflight, not a fresh installer execution.

Native supervision tests execute real Windows processes and compile TreeFixture from its permanent C# source into a uniquely created scratch fixture directory. [native-faults.txt](native-faults.txt) records six native cases passing; all six also pass in the final full suite. [scratch-tests.txt](scratch-tests.txt) records the earlier targeted 18/18 ownership/runner/native tests before two fault cases and the launch-cancellation regression were added.

The full-suite output records the exact `Test scratch` and `Compiled test fixture` paths under `C:\Dev\Scratch\UnrealAutoSetupTests`. Python TemporaryDirectory and the Node launcher remove their owned fixtures on normal or failed test exit. [integration-final.txt](integration-final.txt) records creation and verified removal of the final real VS Code run directory `integration-jAiaCo`.

Real integration evidence: [host-events.jsonl](host-events.jsonl), [cross-window.jsonl](cross-window.jsonl), [editor-safety.json](editor-safety.json). Event logs contain earlier experiments as well as final runs; see the timestamped interpretation in [reload results](RELOAD_INTEGRATION_RESULTS.md). Failed initial host-lifetime experiments are evidence of the reason for the bootstrap change, not passes.

No deliberate antivirus interference test was performed. Relocation proves harness output selection; it cannot certify all internal files created by arbitrary future toolchains. Forced termination cannot run language cleanup hooks; unfinished integrations retain journals intentionally.
