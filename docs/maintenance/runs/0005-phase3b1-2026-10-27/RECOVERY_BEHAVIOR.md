# Recovery behavior

The extension **does not restore automatically**. This is deliberate while safe automatic preservation remains unproven. Read the [safety contract](SAFETY_CONTRACT.md) before interpreting successful UBT execution.

## Location and contents

Production storage is `ExtensionContext.globalStorageUri/regeneration-v1/transaction-N`. It is outside packaged runtime sources and the ordinary project tree. The isolated test host's root is:

```text
C:\Dev\VSCodeTools\unreal-auto-setup\.local-test-projects\Phase3AIntegration\host-data\User\globalStorage\local-tools.unreal-project-tools\regeneration-v1
```

Each exclusive slot contains an operation UUID in its records, not a reusable project filename:

- `intent.json`: descriptor, engine, operation ID, creation time, policy and bounds. Presence without a final result means incomplete/possibly interrupted, not safe to replay.
- `baseline.json` and `baseline-N.bin`: original path, file/directory/absence state, observed identity/metadata and SHA256 referencing the exact copied disk bytes.
- `observed.json` and `observed-N.bin`: post-run observation, including new paths, deletions and unreadable/unsafe states. No missing bytes are reconstructed by guessing.
- `document-N.json`: labeled initial/event/final editor text, document path/version and dirty flag; text is distinct from disk bytes/encoding.
- `result.json`: execution versus preservation outcome and conflict paths. A missing/partial result or blob requires manual review; it is never interpreted as success.

All writes use exclusive creation and per-file sync; existing records are not overwritten. Partial writes may remain after an I/O failure. Metadata is diagnostic data, never instructions to execute or arbitrary paths to automatically modify.

The warning, coordinator history and **Unreal: Diagnose Project** expose the recovery location; Doctor also shows the storage root after a fresh host activation. A last-session result need not survive reload in memory; disk records remain independently readable. No new public command or setting was introduced.

## User recovery workflow

1. Stop/finish relevant owned generation/build work. A vanished extension host/root PID alone does not prove descendant completion; leave unknown processes alone.
2. Open the reported `result.json`, then baseline/observed manifests **in VS Code**. Check operation ID and exact original descriptor/engine paths. Keep incomplete/conflicting records.
3. Open the referenced `.bin` files as text where appropriate and compare with the current live file. Document JSON contains separately captured unsaved/saved text; do not mistake it for byte-identical disk data.
4. Export the desired version with **Save As to a new unused path**. Preserve the current version as well. This implementation provides no automatic overwrite/merge action; resolving the live target requires explicit review and normal editor safeguards.
5. Confirm exported content and resolved configuration before retrying. A subsequent unchanged run may succeed; UBT rewriting protected files will continue to report Conflict under this fallback. Repeated generation is not a conflict resolver.

No shared engine recovery race experiment or automatic engine-config rollback was performed. The test retained original engine `.vscode` copies and ordinary UBT's generated outputs; no engine source was modified.

## Bounds, cleanup and rollback

Defaults: 512 inventory entries per snapshot, 8 MiB per file, 16 MiB aggregate disk snapshot, 64 observed document events and 8 MiB accumulated event text, 32 MiB total artifact-write budget per transaction, and 32 exclusive transaction slots. Directory/absence records count toward inventory limits. Initial document artifacts also consume the transaction budget. No full-engine scan occurs.

Allocation uses fixed exclusively created slots, so simultaneous allocating hosts cannot exceed the slot count. Exhaustion fails before UBT, with the storage path and review instructions. Unknown/partial entries are not silently deleted to make space. There is **no automatic expiration**, including successful transactions: storage growth is bounded by refusing new work. This trades convenience for evidence retention and can require manual cleanup.

After exporting/validating a resolved transaction and confirming no relevant work is active, the user can remove **only that identified resolved slot** to reclaim space. Never delete unresolved data on an age/heartbeat policy. Copies/metadata from this run remain retained. No automatic replay or process recovery is part of Phase 3B.1.

Rollback of source changes must preserve recovery data and inherited uncommitted work. Review only this phase's changes; do not reset to HEAD wholesale. A hash manifest is integrity evidence, not a source backup. The exact starting generation source is separately archived for defect reproduction; it is unsafe to deploy its old restore behavior as a data-loss fix.
