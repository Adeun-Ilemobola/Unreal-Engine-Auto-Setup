# Process ownership contract — conservative milestone

Starting checkpoint: main, 251fd3905e6e9daf832a38cee1dd724358f4e283. Clean tree; disposable fixture exists and is ignored.

Before any managed launch, exclusively acquire a canonical-project claim and sync an immutable random-UUID intent to extension storage. Empty, corrupt, unsupported, inaccessible and interrupted claims block launch. No timestamp expires a claim. At most one unresolved claim per project; global quota refuses new claims rather than deleting unresolved evidence.

Observation requires PID, exact executable path, exact encoded command containing a random operation identity and creation time. Observation never authorizes recovered termination. Missing/reused root identity does not prove descendant exit. Recovery is quarantine-only; no replay, guessed success or PID termination. Current-session cancellation behavior remains separately scoped to the existing build service and is not a new full-tree guarantee.

A claim created before spawn can be released only by its original in-memory owner when it positively knows spawn was never attempted. After spawn is attempted, claims remain unresolved even following wrapper close. This intentionally limits availability until a tested containment supervisor supplies full-tree completion evidence. Manual recovery requires independent verification of the entire operation; deleting a claim is an administrative override, never machine proof.

Scope: cooperating windows sharing the same extension global-storage directory, canonical descriptor paths. Other profiles/machines, external builds, Skybox and Editor sessions do not participate. Shared engine mutation serialization and race-free destructive cancellation remain unimplemented. No complete P1.2 claim.

Storage uses exclusive mkdir for arbitration, exclusive file creation, file fsync and immutable observations. Reads are bounded; links, non-files, hard links and oversized records are refused. Partial writes are blocking, never fallback to an empty registry. OS power-loss durability of parent directories is not certified. No secrets or output logs are journaled. Completed pre-spawn claims are removed; spawned unresolved claims are never age-pruned.

Rejected for this milestone: PID taskkill after CIM matching (identity race), TTL unlock (unknown work may survive), root-close completion (descendants may survive). A Windows Job Object supervisor needs assignment-before-resume, no-breakaway containment and tested job-empty evidence before it can safely improve availability; it is not established here.
