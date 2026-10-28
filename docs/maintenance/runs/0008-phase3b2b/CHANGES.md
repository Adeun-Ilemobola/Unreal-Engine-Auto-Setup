# Changes

- Added `unreal-auto-setup/native/OperationSupervisor.cs`, its checked-in Windows x64 executable, build hash manifest and `tools/phase3b2b/build-helper.ps1`. Runtime does not compile or download helpers.
- Added `processSupervisor.js` for validated helper launch, bounded journal reads, log streaming, cancellation request and completion proof validation.
- Updated `operationOwnership.js` to distinguish live verified supervisors, completed jobs and uncertainty; completion uses exclusive release locking and an atomic retirement rename before deletion.
- Wired supervision into `runner.js` and `build.js`. Managed local builds disable UBA/XGE/FASTBuild/SNDBS. Host disposal detaches the monitor. Cancellation while asynchronous launch is pending waits for the job and verified completion. `runtimeView.js` exposes recovery blocking.
- Updated packaging inputs to include and hash-check native assets. Command IDs, settings, version and entry point remain unchanged; only the package test script changes.
- Added native, crash, breakaway, cancellation and completion-proof regressions, plus real host integration tools under `tools/phase3b2b`.
- Added `tools/run-tests.cjs` and `tests/testTemp.js`; routed all affected Node fixtures and Python package fixtures into the dedicated development scratch root. Compiler TEMP/TMP is scoped and restored by the helper build script. Real host profiles, drivers, fixture binaries and journals also use isolated scratch runs.

The generation preservation implementation and `generation.test.js` are unchanged. Historical reports and uncertain operation journals were retained. No dependencies were installed, no system environment or antivirus configuration was changed, and no release artifact was published.
