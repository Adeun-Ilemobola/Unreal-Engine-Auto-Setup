# P4.3 — Quality and Release Validation Checks

## Release Validation Runner
- Entry Point: `tools/validate-release.cjs`
- Command: `node tools/validate-release.cjs [--include-host] [--include-engine]`
- Clean output with individual stage diagnostics and overall pass/fail outcome.

## Check Inventory (12 Automated Checks)
1. **JavaScript Syntax**: 119 files verified via `node --check` across `unreal-auto-setup/` and `tools/`.
2. **Extension Manifest**: Validates package.json structure, publisher, main entry file.
3. **Public Commands**: 35 declared commands verified.
4. **Public Settings**: 5 configuration properties verified.
5. **Native Supervisor**: `native/OperationSupervisor.exe` checked for PE `MZ` header and SHA256 integrity against `supervisor-build.json` and C# source.
6. **Snippet Contributions**: Verified `ustruct`, `uenum`, `uproperty`, `ufunction` in `./snippets/unreal.json`.
7. **Packaging Preflight**: `python -B bundle_sources.py` verified (51 inputs, 41 runtime modules, 3 document mirrors).
8. **Documentation Links**: 333 relative links in `docs/` verified to resolve.
9. **Git Exclusions**: Protected `.gitignore` rules for `.vsix`, `node_modules`, disposable projects verified.
10. **Scratch Compliance**: Verified test scratch root `C:\Dev\Scratch\UnrealAutoSetupTests` is active and used for all temporary test outputs.
11. **Python Test Suite**: 4 packaging unit tests passed (`test_bundle_sources.py`).
12. **Full Node Test Suite**: 482 passing tests, isolated scratch suite, accurately distinguishing the single known P1.1 failure.

## Windows CI Workflow
- File: `.github/workflows/windows-ci.yml`
- Stages:
  1. `fast-checks`: Node 22, Python 3.12, syntax, preflight, unit tests, release check runner.
  2. `native-helper`: Verification and compilation of C# `OperationSupervisor.cs` via `csc.exe`.
  3. `extension-host-tests`: Launches real VS Code Extension Host tests via `tools/run-extension-tests.cjs`.
  4. `unreal-engine-tests`: Opt-in workflow dispatch for self-hosted Windows runner with Unreal Engine installed.
