# 3B.2 — Process Ownership and Cross-Reload Safety

**Readiness:** minimum durable quarantine/coordination contract is ready to implement/test with injected adapters. Automatic cross-reload cancellation/resumption and proof of complete process-tree exit remain conditional. No persistence/recovery code implemented in 3B.0.

## Objective, evidence and current lifecycle

Prevent a new extension host/window from starting conflicting work while an earlier extension-owned build/generator may still be active. Unknown ownership means refusal, never a guessed kill.

`build.js` creates a managed pseudoterminal and spawns PowerShell with -NoLogo/-NoProfile/-EncodedCommand and piped output. The encoded script invokes Build.bat (which can spawn cmd/dotnet/UBT/compiler processes), or UBT.exe for generation. Only the immediate child PID and listeners are held in memory. The Editor terminal is a separate runner workflow and is not a managed build child to terminate.

Cancel uses taskkill `/PID <child> /T /F` (5 s command timeout), distinguishes Requested/Accepted/Exited/Failed/Unconfirmed and bounds acknowledgement at 6 s. Failed/Unconfirmed warning retains `done` and the in-host gate; child close settles/cleans operation resources. Repeated cancel is idempotent. **Immediate wrapper close is the current completion signal; it is not a newly proven kernel guarantee about every descendant.** Tests must include a wrapper that exits while a descendant survives.

Service dispose requests cancellation; VS Code does not await arbitrary asynchronous subscription disposals. Extension exports activate, no explicit awaited recovery/deactivate protocol. Coordinator holds active ownership until execute settles, but its epoch/timer/tracker/gate are in memory; a new host composes fresh services. Existing lifecycle tests establish one-service behavior, not cross-host identity. Phase 3A did not intentionally orphan UBT across reload. PID reuse was not ruled out by a PID-only contract and must be treated explicitly.

## Minimum safe contract

1. Persist a launch **intent before spawning any process**. Journal/storage/claim failures abort launch. All participating build/generation launches inspect unresolved resource records before entering their current gate.
2. A record is evidence to investigate, not permission to terminate. Classify Owned-running, Confirmed-complete, Unrelated/PID-reused, Unknown, or Corrupt/unavailable. Unknown/unresolved state blocks affected work across activation/windows and is visible in Doctor/UI.
3. A missing root PID, old timestamp, vanished extension host or stale heartbeat does **not** establish process-tree completion. Do not clear a quarantine automatically for those reasons. No build/generation restoration or false Cancelled result while tree completion is unproven.
4. Minimum first release is **quarantine-only after reload**: show details/log/recovery guidance, do not auto-resume, auto-kill, or automatically clear metadata. Availability is intentionally limited until stronger evidence exists. An explicit administrative acknowledgement may unblock only as a clearly labeled human override, not machine-verified completion; that behavior requires a separate approved UI/recovery contract.
5. Normal confirmed completions can become terminal records; unresolved records never expire into permission to launch. No cleanup by age alone. Retention/quotas apply only to acknowledged terminal records, with linked regeneration conflicts retained.

This minimum is defensible because uncertainty cannot silently create overlapping work. It does **not** promise unattended recovery. It also does not close the full P1.2 claim until the descendant/lifetime gap and recovery validation pass.

## Proposed record and identity

Extension-owned user-level storage shared by local extension hosts, not workspaceState alone. Validate canonical project descriptor and engine paths/aliases; use hashed resource keys rather than raw workspace-controlled paths. Treat remote hosts as different machines; current support remains local Windows/Win64.

```text
schemaVersion, operationId(random UUID), originatingSessionId, machine/store identity
kind(build|generation), canonicalProjectKey, canonicalEngineKey, resourceClaims
createdUtc, monotonic timing context for current host only, state, sequence
intentDigest, wrapper executable, exact normalized argv/encoded-script digest
wrapper identity {pid, creationTime, executable identity/path, operation nonce}
containment/supervisor identity when validated; result/exit proof; log references
linked regenerationRecoveryId; evidence/recovery limitations
```

A nonce in a wrapper command/handshake distinguishes accidental operation instances; it is not authentication against malicious same-user code. PID + creation time + exact executable/argument/operation match is stronger than PID alone, but snapshot comparisons still have TOCTOU. Use process handles/validated containment for an eventual destructive action; do not turn a CIM check followed by PID taskkill into a claimed atomic identity guarantee. Parent PID alone, substring project matches, executable basename and heartbeat are insufficient.

Store files/claims require safe path/schema/version validation, bounded reads, exclusive creation, checked writes/flush/atomic replacement and explicit error handling. Do not follow symlinks/reparse points or trust journal-supplied arbitrary paths. Missing/corrupt metadata after an intent is Unknown, not “nothing running.” The design addresses accidental crashes/concurrency, not hostile processes with the same user's authority.

## State transitions and spawn gap

```text
claim resource keys in deterministic order using a tested atomic claim primitive
persist Intent; fail before spawning if this fails
start tagged wrapper in a waiting handshake state (no UBT/compiler yet)
observe/validate wrapper identity; persist IdentityRecorded
only then authorize child execution; persist Running/result transitions
on cancel: Requested -> Accepted|Failed|Unconfirmed; retain ownership
on verified contained-tree completion: persist terminal result then release claims
on host restart: load/validate records before enabling launch commands
  exact running identity -> RecoveredBlocked (quarantine-only milestone)
  missing/reused/inaccessible root, missing proof or corrupt record -> UnknownBlocked
  independently validated terminal/tree proof -> completed, release under lease
```

If the host dies before identity persistence, Intent still blocks. A validated waiting wrapper may time out without starting work, but absence alone must not be inferred to prove that handshake behavior occurred. If the host dies after GO but before a state write, recovery remains blocked. Persist final completion before claim release. Crashes between multiple resource claims need ownership-aware rollback, not deletion of another operation's claim. Test storage atomicity/order explicitly; ordinary file rename is not a multi-file transaction or an automatic power-loss guarantee.

## Cross-window coordination

Use one canonical resource registry shared by extension hosts for that user/machine. All build/generation participants consult it. Generation claims both project and shared engine configuration; descriptor/setup writers participate in corresponding mutation claims. Independent projects may proceed only when they share no claimed resources under the chosen policy. Sorted claims avoid deadlock, and contention returns a visible owner/operation description.

TTL/lease heartbeat is diagnostic, not authorization to steal an active/unresolved claim. Cross-window recovery itself needs an atomic recovery claim to prevent two hosts acting concurrently. Detect inconsistent/conflicting records and fail closed. External/Skybox builds and other users are nonparticipants; the registry cannot certify their absence. Keep Editor-running/Unknown guards and UBT's own coordination; do not present the extension registry as an OS-wide build lock.

## Stronger recovery: unresolved containment experiment

An immediate PowerShell child can exit while descendants survive. Safe automatic completion/termination therefore needs a lifetime boundary stronger than polling root PID. Candidate: an operation-scoped Windows Job Object with validated no-breakaway child enrollment, held by a small supervisor that survives extension-host reload. This is **not selected as proven implementation** and is not a request for a general OS locking framework/new runtime dependency.

Smallest future experiment: an innocuous owned wrapper + sleeping descendant, never UBT/Editor, verifying assignment-before-work, nested-process/job behavior, root exiting first, host disconnect/reconnect, supervisor loss, access denied and job completion. Use stable handles to distinguish PID reuse and prohibit killing any process outside the proven container. If the installed environment cannot establish containment without prohibited privileges/dependencies, retain quarantine-only behavior and report the limit. Automatic reconnect/kill needs separate design approval after evidence, not an assumed extension of taskkill.

## Expected modules, tests and acceptance

Focused prospective `operationOwnership.js` journal/classifier/claim adapter; injected Windows identity/containment adapter separated from state policy. Wire checks through build.js, runner/coordinator composition and generation's recovery state; annotate contracts. Preserve current exports, bounded history, output/Problems and cancellation acknowledgement-versus-done distinction. No generic framework.

Regression matrix: crash before intent/spawn/identity/GO/result/release; denied journal I/O; malformed/versioned/linked records; PID reuse with same executable; creation-time mismatch/unknown; stale nonce/argv; inaccessible CIM; two same-project windows; shared-engine generation; unrelated projects; two recovery contenders; clock jumps/old heartbeat; wrapper death with live descendant; repeated cancellation; accepted taskkill without close; late confirmed completion; unresolved generation restoration; retention/quota exhaustion. Use barriers/injected clocks/adapters, not timing guesses.

**Acceptance, quarantine milestone:** every spawn has prior intent/claims; new host refuses unresolved operations; no PID-only kill or expiry bypass; no overlapping participants; errors visible and evidence retained; existing service lifecycle tests still pass. **Acceptance, full P1.2:** proven complete tree ownership/exit and safe recovery, including restart windows and the real controlled adapter probe. Quarantine alone must not be relabeled complete automatic recovery.

**Dependencies:** journal/classifier/mock tests independent of 3B.1/3B.3; a shared claim interface is needed by later generation commits. **Allowed future tests:** injected stores and harmless owned descendants first; controlled real host reload only without real UBT work. **Prohibited:** intentional real UBT orphaning, unrelated Editors, automatic uncertain termination, global registry/environment/security changes. **Stop:** ownership mismatch, unknown tree, corrupt journal/claims, containment escape, unexpected process death, or needing an unapproved privileged/native dependency. Roll back deployment only after retaining records; do not delete unresolved journals to “restore availability.”
