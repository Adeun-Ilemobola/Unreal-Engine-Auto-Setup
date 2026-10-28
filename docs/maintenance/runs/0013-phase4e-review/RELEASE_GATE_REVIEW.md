# Release gate policy

The incoming Node catch checked whether output included the preservation test name and `fail 1`. That could accept unrelated failures and failure totals of 10 or more. It then marked the Node check Passed and reported 12/12. Thus the original green report was not a valid release-readiness signal.

The corrected `nodeSuite()` propagates every nonzero process result. No text matching, failure-count allowance, TODO conversion or baseline-aware waiver remains. The command `node tools/validate-release.cjs` exits 1 unless every required check passes. P1.1 is documented but not excused. Five targeted tests verify strict rejection and success behavior.

Current result: **11/12 checks passed, exit 1**. Node: **493 passed, 1 failed, 494 total, no skipped/cancelled/TODO tests**. The sole failing test is `tests/generation.test.js:10`, “generation uses the active engine/project and restores existing VS Code configuration.” Its expected original bytes are still replaced by the stub generator, exactly the pre-existing acceptance failure. No production-preservation code or assertion was weakened.

Other check boundaries: public command/settings checks in the general runner are presence checks; the independent Phase 4E check additionally compares all 35 commands and five settings with starting HEAD. Native integrity now checks SHA-256 for both source and binary, and packaging independently checks them. Scratch root existence alone is not an artifact audit; actual test/compiler paths, child env and cleanup were reviewed separately.

Windows workflow YAML was parsed locally and implementation assumptions reviewed. Hosted fast checks run the strict gate and therefore currently fail on P1.1. Native compilation uses the repository script with explicit compiler/reference and manifest regeneration. Host/engine jobs require manual opt-in and prepared self-hosted Windows runners. No remote workflow was triggered or observed. The workflow performs packaging preflight, not publication; it does not claim an uploaded VSIX.

Development commit qualification, isolated test-package installation and production release are separate decisions. The first two are supported by this review; production release is blocked.
