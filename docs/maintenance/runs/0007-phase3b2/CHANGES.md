# Changes

- `operationOwnership.js`: immutable versioned, file-synced intent; exclusive canonical descriptor claim; bounded reads/admission; fail-closed partial/corrupt records; optional bounded CIM observation. Every recovered state is quarantined regardless of root presence.
- `build.js`: optional durable adapter; intent before spawn, random operation tag, root-exit observation before result completion; release positively unspawned work only. Existing injected process adapters retain their behavior.
- `runner.js`: compose journal under extension global storage and check it before managed workflows. `runtimeWatcher.js`/`runtimeView.js`: storage-only recovery snapshot on activation/refresh and actionable Build status. No continuous process scanner.
- `runtimeCommands.js`: explicitly refuse Cancel when this host controls no operation. No public command/setting addition.
- Ten deterministic ownership tests plus existing lifecycle suite. `tools/phase3b2/host.cjs` is an isolated real-host reload probe; fixture driver/profile remain ignored.
- Current-session taskkill remains a pre-existing limitation; no recovered termination API was added. Generation preservation code and its failing acceptance test are untouched.

The journal intentionally restricts availability after normal completion. This is a partial quarantine milestone, requiring further lifecycle work before release. Historical documentation and recovery artifacts are unchanged in Git. See final status for the exact changed-file inventory.
