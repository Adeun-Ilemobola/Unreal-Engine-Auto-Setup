# 3B.1 — Regeneration Preservation and Conflict Recovery

**Readiness:** recovery/conflict model specified; a complete replacement preserving the old automatic workflow is **conditional**, not approved or proven. No production change or experiment performed in 3B.0. This document is a future implementation specification, not execution authorization.

## Objective and confirmed evidence

Prevent the extension from overwriting newer/ambiguous protected versions; preserve usable recovery evidence and report preservation separately from tool success. Full end-to-end protection also requires preventing UBT itself from overwriting concurrent edits. Those are different guarantees.

Current `unreal-auto-setup/generation.js`:

| Stage | Actual behavior |
| --- | --- |
| Specification | Engine-local UBT.exe, `-projectfiles -project=<descriptor> -game -progress -vscode`. |
| Preflight/snapshot | After tool lookup, before `builds.run`; reject initially dirty project documents, recursively snapshot existing project `.vscode/**`, .clang-format, selected .uproject, .ignore, root `*.code-workspace`, and existing engine `.vscode/**`. Only existing files are saved; absence, identity and document versions are not journaled. |
| UBT execution | May change project VS Code/workspace/ignore/provider metadata and shared engine .vscode; the managed service owns the child completion promise. |
| Finally | Await saved-byte restoration on success, failure, rejection or confirmed cancellation. Restore checks ancestors for symlinks, then replaces differing/missing file bytes. No writer attribution, hard-link refusal, late dirty/version checks, durable recovery, or compare-and-swap. A restore exception overrides the result path and prevents subsequent stale-state update. |
| State update | After successful restoration, `state.generated` clears stale only if result.success and captured metadata revision still matches. Revision checks do not preserve file bytes. |

`tests/generation.test.js` covers ordinary restoration, failure/stale behavior, dirty preflight and link refusal. `tests/generation-conflict.test.js` is an executing TODO reproducing newer saved descriptor overwrite. Phase 3A ordinary real generation passed 22 protected hashes; that was explicitly without concurrent edits. Neither result establishes conflict safety.

Existing guards are valuable but incomplete: snapshot rejects lstat symbolic links, restore checks each ancestor, and dirty preflight excludes initially unsaved documents. These are point-in-time checks. A replacement/hard link/dirty document appearing later, transient writes between reads and path alias changes remain relevant. Hashes establish byte equality/difference, **never writer identity**.

## Competing extension-owned operations

Runner serializes its build/generation workflows, not all writers. Module creation (`creation.commit`) changes the project descriptor; plugin creation writes a .uplugin/source; class creation writes source pairs. Their independent wizard guards do not exclude generation. Setup/engine.remember can change protected .vscode configuration. Dependency WorkspaceEdit can create unsaved Build.cs changes and later saves. Other windows, Skybox tasks, Editor and external tools are nonparticipants. Shared engine config crosses project boundaries.

A future shared lease must cover cooperating project mutations and regeneration's canonical project **and engine** resource keys; revalidate any pre-lease wizard plan before commit. Do not hold a lease through an unbounded user dialog. A lease is not proof against an external writer. Preserve creation/dependency transaction-specific guards and Undo semantics.

## Candidate evaluation

| Technique | Reliably proves | Cannot prove / risk | Compatibility and recovery |
| --- | --- | --- | --- |
| Before/after hashes | Equality of observed bytes | Who wrote them, intermediate edits, or protection against a later racing replace | Use for version labels/verification, never authorize overwrite from hashes alone. |
| Document URI/version/dirty events + text snapshots | Observed VS Code model changed; recoverable captured text | External editors, every transient model state, disk encoding/byte identity, or missed events after host death | Keep original disk bytes plus separately labeled document text/version/encoding information; never save dirty documents automatically. |
| FS events, identities, reparse/hard-link checks | Observed replacement/deletion/link/identity changes | Watchers may coalesce/drop; stat/read/recheck is not atomic CAS | Changed/unknown identities are conflicts. Refuse unsupported links; preserve observed bytes/tombstones. |
| Recoverable versions + explicit resolution | Previously captured versions remain accessible; extension can refuse destructive restoration | UBT may already have erased an uncaptured intervening saved edit | Useful conservative fallback, but changes automatic preservation behavior. Open comparisons/export chosen versions to new files; do not silently overwrite target on “recovery.” |
| Validated output isolation | Potentially keeps generator writes away from protected live paths | Not established for installed UBT, references, shared engine outputs or publishing | Preferred route for the full preservation contract. Validate all writes/reference semantics before adoption. |
| Cooperating writer leases | Extension participants do not overlap protected transactions | External or nonparticipating windows/tools | Shared project/engine resource claims from 3B.2; no broad OS-wide locking framework. |

Read-only installed source previously inspected: VSCodeProjectFileGenerator.WritePrimaryProjectFile writes both project and, for foreign projects with included engine source, engine .vscode. NoCompileCommands/UseVSCodeExtension change content/work, not validated output redirection. ProjectFileGenerator derives primary output from project identity. **No general isolation flag is established.** Do not invent one or treat copying the .uproject as complete isolation.

## Chosen contracts and decision gate

1. **Implementable recovery contract:** never automatically restore over any changed/removed/replaced/dirty/ambiguous protected target; never interpret tool exit 0 as preservation success. Retain baseline and every subsequently observed version, explicit absence/tombstones and a recoverable conflict manifest. No new target mutation from activation/reload recovery.
2. **Full P1.1 completion remains gated:** either validate isolated generation/publishing that retains existing automatic preservation semantics, or obtain explicit approval for a conservative conflict/recovery behavior change and accurately narrow the guarantee. The latter prevents the extension's restore overwrite, but cannot promise UBT preserved every concurrent external edit. It must not silently close the old P1.1 acceptance claim.
3. No ordinary Node read-hash-rename loop is a proven atomic compare-and-swap. A final recheck reduces a race, not eliminates it. Safe initial recovery resolution offers comparison/export-to-new-file; automatic target replacement requires a separately proven adapter/contract.

## Future algorithm and storage

Use an injected I/O journal adapter and a pure classifier first; proposed focused modules `generationRecovery.js` / `operationOwnership.js` only if they reduce responsibility. Keep `generation` exports/public command IDs compatible. Recovery data belongs in extension-owned user storage, keyed by validated canonical resource IDs and random operation ID, not arbitrary workspace-supplied absolute paths. Tests inject an owned temporary store. Reject linked/untrusted store paths; write exclusive blobs/manifests atomically with flush/error checks. Do not claim cross-file or power-loss durability without validating the platform behavior. Store errors before launch abort; store errors after launch block and preserve existing evidence.

Expected wiring: `generation.run` owns the transaction and delegates storage/classification instead of blind `finally` restoration; runner/composition supplies shared claims and presents execution versus preservation results. Existing generated/stale state clears only under the approved preservation contract. Creation/setup/engine-settings commit paths acquire corresponding short mutation claims and revalidate prior plans; dependency edits retain document/Undo semantics. Keep pure policy independent from VS Code and process adapters. These are proposed changes for the later package, not changes made here.

```text
acquire cooperating resource claims; validate trust/project/engine identity
create operation intent and recovery directory before generator launch
capture B: bytes or absence, file/volume identity when reliable, nlink,
           parent/reparse identity, metadata, open-document versions/text
persist/flush manifest and B blobs; reject unsafe/unknown links
subscribe document/FS hints before final pre-launch comparison
if baseline unstable or journal unavailable: abort before launch
execute only the chosen, validated generation mode
if exit unconfirmed: keep claims, evidence and recovery state; do not restore
after confirmed process-tree completion:
    capture C and open-document D; persist observed versions/tombstones
    if in-place: no automatic replacement of any changed/absent/uncertain target
    if isolated: validate complete output set and mapped references;
                 preserve existing protected live files; publish only through
                 validated boundary-aware create-new/non-destructive policy
    report {execution, preservation, conflicts, recoveryLocation}
clear metadata stale only when the selected preservation contract succeeded
```

Disk bytes and VS Code text are distinct records. File IDs/nlink/dev/ino values need Windows validation; unavailable/unstable identity is Unknown. Events are hints, not provenance. Capture only a bounded number/size of observed versions with an explicit stop/block policy, never silently discard baseline/current data. Newly appearing files are observed conflicts, not extension-owned rollback candidates.

On failure/cancel/restore/store error, keep baseline/current/document evidence and meaningful original tool errors. Rollback means deleting only provably extension-owned staging files; it does not mean restoring B over live C. Never delete newly observed external files or recovery blobs on a timer. Retention/quota UI policy must be explicit; unresolved conflicts survive reload until acknowledged/exported.

## Smallest unresolved experiment — future session only

First inspect installed generator/configuration code for one concrete supported isolation candidate. If none exists, stop and request the fallback-contract decision; do not run speculative flag combinations. If a candidate exists, one disposable probe must inventory/monitor writes to fixture **and shared engine** roots, hash protected versions, check generated reference paths and then build from the generated outputs. No concurrent edits to live shared engine config. Isolated engine-config conflict fixtures must use an injected temporary engine root/stub generator. An audit of observed writes is supporting evidence, not a universal proof; generator path analysis must explain the complete intended write set. No engine installation/source change to make a probe pass.

## Regression fixtures and acceptance

Use deterministic barriers/fault-injected adapters before live UBT:

- Unchanged success; legitimate generator metadata change; saved user edit; dirty document/version changes after launch; concurrent module/descriptor creation; user file appearing during generation.
- UBT failure/rejection; confirmed cancellation; Failed/Unconfirmed termination (no restoration/gate release); journal write and resolution failure.
- Deletion/tombstones; rename/replacement; parent alias/reparse changes; symlink/junction/hard link; same-size/mtime edit; shared engine config across two project sessions.
- Recovery B/C/D survival across reload; crash at each journal boundary; a barrier between verification and target write proving a plain check-and-write is inadequate; quotas and malformed journal paths.

Required acceptance: all captured versions remain accessible, no ambiguous target overwrite, conflicts are actionable/non-successful, dirty/newer revisions survive, shared participants serialize, tool errors are retained, ordinary preservation semantics match the approved contract. Retire the TODO only when its actual assertion passes under that contract; replacing it with a weaker assertion is not completion.

**Dependencies:** pure journal/classifier work is independent; live conflict-safe generation depends on a supported isolation/fallback decision and shared operation claims/confirmed process-tree completion from 3B.2. **Allowed later tests:** owned mocks/temporary stores first, then explicitly authorized existing disposable project. **Prohibited:** RPGX, shared-engine concurrent fault injection, engine source edits, claiming watcher/hash attribution. **Stop:** unclear write ownership/CAS, unsupported isolation, failed recovery persistence, unconfirmed process tree, or an unapproved preservation behavior change.
