# 0003 — Incremental service boundaries and release inputs

Date: 2026-10-27. Status: implemented. [Phase 2 run](../runs/0002-phase2-2026-10-27/RESULT.md).

Keep the flat CommonJS layout. Extract only runner's native view/status projection and runtime command/dialog adapters into `runtimeView.js` and `runtimeCommands.js`. Runner keeps workflow policy, operation sequencing, Editor launch checks and service composition. The old exported helpers remain. No broad folder migration, TypeScript, event bus, dependency container or setup transaction rewrite is justified. Setup remains in extension.js so its Phase 1 identity checks and ordering stay local and visible.

JSDoc-only `contracts.js` names the existing context/result/service shapes and ownership. It does not claim enforced static typing or introduce runtime initialization. Formatting uses the user's installed Prettier and a syntax-tree equivalence check; no npm dependencies or manifest edits.

Share numeric engine-association and minimum-version parsing in `enginePolicy.js` while retaining core's compatibility export. Share strict lexical containment in `paths.js` while retaining classFiles/dirtyTracker exports. The immediate-parent divergence was reproduced before correction. Transaction-specific descriptor, link, dirty-document, exclusive-write and WorkspaceEdit safeguards remain separate. Automation dialog validation and runtime normalization intentionally differ and were not merged.

Replace the manual JavaScript packaging list with discovery limited to the current flat production source root. Retain explicit assets and validate literal local imports and the entry point before any archive is opened. A nested production folder requires a future explicit policy update. Keep root product documents as checked mirrors of extension copies, instead of duplicating editing responsibility. A separate read-only preflight and fixture tests avoid invoking the installer-writing script during validation.

P1.1 remains Blocked and P1.2 remains Partially complete. Their unresolved preservation/reload contracts are constraints on this refactor, not implicit acceptance of those defects. No new engine compatibility certification or Phase 3 work is part of this decision.
