# P4.2 — Reliable Unreal Engine Validation Failure Handling

## Problem Addressed
Previously, `real-unreal-validation.js` ran UBT stages sequentially without checking exit codes, meaning that when UBT generation or module build failed, the script recorded the failure in a JSON file but still returned exit code 0. This silently masked failures in automated CI and test harnesses.

## Implemented Improvements
1. **Explicit Stage Tracking**:
   - Every required stage (`generation`, `moduleBuild`, `pluginBuild`) is executed with an explicit status (`Passed`, `Failed`, `Skipped`).
   - If an earlier required stage fails, subsequent dependent stages are explicitly marked `Skipped` with a clear reason, rather than executing blindly.
2. **Nonzero Exit Propagation**:
   - When run as a CLI script, any failed stage results in `process.exitCode = 1`.
3. **Bounded Execution Timeout**:
   - Configurable per-stage timeout (default 300s, configurable in tests).
   - Hung child processes are automatically terminated on timeout, marking the stage `Failed` with `timedOut: true`.
4. **Log Preservation**:
   - Each stage writes its stdout/stderr to a dedicated log file (`generation.log`, `module-build.log`, `plugin-build.log`).
5. **Disposable Workspace Enforcement**:
   - Refuses execution if the project root is not a disposable test directory.

## Fault Injection Test Suite
File: `unreal-auto-setup/tests/engine-validation-failures.test.js`
- Test 1: Nonzero child exit code -> captures exit code and marks stage `Failed`.
- Test 2: Child process hang -> bounded execution terminates process and marks `timedOut: true`.
- Test 3: Missing executable -> caught and cleanly marked `Failed`.
- Test 4: Invalid disposable-project path -> rejected before launch.
- Test 5: Failed generation -> marks `Failed`, skips `moduleBuild` and `pluginBuild`, returns `success: false`.
- Test 6: Failed module build -> marks `Failed`, skips `pluginBuild`, returns `success: false`.
- Test 7: Failed plugin build -> marks `Failed`, returns `success: false`.
- Test 8: Successful full validation -> all 3 stages marked `Passed`, returns `success: true`.

Results: 8/8 tests pass.
