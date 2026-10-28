# Phase 1B decisions

The decision record is [ARCHITECTURE_DECISION.md](ARCHITECTURE_DECISION.md); this index avoids duplicating the rationale.

- Provisionally select C: minimal two-root bootstrap plus deliberate authoritative metadata import/refresh. A and B and seven scoring dimensions are compared in that record.
- Retain the managed coordinator and Windows Job Object process boundary. A future TaskProvider adapter must share that boundary; native task APIs alone do not establish equivalent containment.
- Use canonical project/engine identities, independent of root order or display names. Ambiguity requires selection; engine and unrelated resource URIs cannot become project write targets.
- Separate workspace readiness, build/UHT outputs and IntelliSense metadata freshness. Query/Clang exports are candidates requiring write tracing, not proved safe alternatives.
- Preserve existing user/generated configuration; no snapshot replay over newer edits. P1.1 stays open and its acceptance test remains unchanged.
- No production removals in this phase. Future dispositions for all 35 commands, five settings and critical systems are in [MIGRATION_MAP.md](MIGRATION_MAP.md).
- WF-P1B is Blocked until real-host acceptance. No Phase 2 work was begun.
