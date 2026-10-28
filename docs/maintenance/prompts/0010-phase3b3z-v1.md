# Unreal Engine Auto Setup — Phase 3B.3z
## Quick Feature Expansion: C++ Class Creation, Structs, Enums, and Snippets

### Mission

Improve the existing C++ creation tools in my **Unreal Engine Auto Setup** VS Code extension.

The goal is a faster, more organized, JetBrains-like Unreal C++ creation experience without rebuilding the extension's architecture.

**This is a deliberately lightweight feature-development task.**

The available Codex usage budget is limited. Prioritize completing useful features and verifying them rather than conducting another lengthy audit.

Do not confuse this task with the previously planned Phase 3B.3 debugger-lifecycle validation.

### 1. Standing authorization

The user explicitly authorizes autonomous development, testing, debugging, compilation, and necessary narrowly scoped work outside the sandbox within these areas:

- Visual Studio Code and its isolated Development Hosts.
- The extension repository at `C:\Dev\VSCodeTools\unreal-auto-setup`.
- Unreal Engine and the existing disposable integration project.

Directly necessary Git, Node.js, Python, PowerShell, MSVC, Windows SDK, UBT, and repository-local testing commands are authorized.

Do not repeatedly request approval for routine in-scope work.

Respect approval prompts enforced by the execution environment.

Do not access unrelated graphical applications or projects, modify system-wide configuration, disable antivirus protection, install software, or change personal VS Code profiles without additional approval.

### 2. Mandatory scratch-directory convention

All temporary executable fixtures, compiler outputs for test harnesses, isolated VS Code profiles, test artifacts, and process-supervision files must use:

`C:\Dev\Scratch\UnrealAutoSetupTests`

Preserve the existing per-run isolation, concurrency safety, scoped temporary environment variables, and automatic cleanup.

Do not change system-wide TEMP/TMP.

Do not revert to default Windows Temp for compiled fixtures.

Do not change Bitdefender settings.

Keep permanent source files in the repository.

### 3. Inspect existing functionality first

Before editing, inspect:

- `classTemplates.js`
- `classWizard.js`
- `classFiles.js`
- `explorerClass.js`
- `modules.js`
- Relevant `package.json` contributions.
- Existing creation tests.
- Relevant portions of `docs/DEVELOPMENT.md`.

Confirm actual file locations, since later phases may have extracted modules.

The extension previously supported nine class templates:

1. UObject
2. Actor
3. Actor Component
4. Scene Component
5. Unreal Interface
6. Game Instance Subsystem
7. World Subsystem
8. Engine Subsystem
9. Local Player Subsystem

The full wizard already exposed these types, while Explorer context creation previously exposed only five.

Verify what remains true in the current checkout.

**Reuse the existing class/template registry, naming checks, safe writer, preview, and collision protection.**

Do not build an independent competing generator.

### 4. Explorer right-click workflow

Improve the existing `Unreal: Create Class Here` command.

When I right-click a valid module directory, I want:

1. A native VS Code QuickPick displaying available Unreal C++ types.
2. Selection of a type.
3. A name input.
4. Automatic prefix normalization.
5. A brief preview or existing safe confirmation.
6. Creation in the selected module location.
7. The generated header opening automatically.

Keep the interaction quick.

Do not introduce a new webview, wizard framework, or unnecessary series of dialogs.

Ensure all nine existing templates become available from the Explorer creation flow, unless a verified technical limitation requires an exception.

Retain the existing Command Palette creation workflow.

### 5. Expand available types

#### Required new header-only types

**Unreal Struct**

Generate a reflected `USTRUCT` declaration using a name beginning with `F`.

Example:

Input: `ItemData`

Output declaration: `FItemData`

Generate a single header such as `ItemData.h`.

Include the appropriate Unreal reflection macros, `GENERATED_BODY()`, and correctly placed `.generated.h` inclusion.

Provide a minimal, compilable declaration.

Do not create a `.cpp` merely to satisfy a generic class-template rule.

**Unreal Enum**

Generate a reflected scoped `UENUM` using a name beginning with `E`.

Example:

Input: `WeaponType`

Output declaration: `EWeaponType`

Use an appropriate Unreal-compatible underlying type, such as `uint8`, and a small safe default enumerator.

Generate a single header.

Verify reflection syntax and generated-header requirements against the installed Unreal Engine version.

#### Additional common classes

Extend the generator with these commonly useful Unreal types, using the existing template architecture:

- Character — `ACharacter`
- Pawn — `APawn`
- Player Controller — `APlayerController`
- Game Mode Base — `AGameModeBase`
- Blueprint Function Library — `UBlueprintFunctionLibrary`
- Data Asset — `UDataAsset`

Use the correct base class, include paths, API macros where appropriate, reflection declarations and minimal constructor or method definitions.

Avoid unnecessary Tick functions, constructors, Blueprint functions, or other boilerplate.

Keep templates intentionally minimal.

**Implementation priority:** Existing Explorer type parity, Struct, Enum, and Character/Pawn come first. Add the remaining common classes if the required work remains straightforward and within scope.

Do not attempt to reproduce every class template offered by JetBrains Rider in this phase.

Instead, keep the template registry easy to extend in future releases.

### 6. Automatic Unreal naming

The creation tools must apply appropriate type prefixes.

| Type | Prefix | Example |
|---|---|---|
| UObject / most UObject-derived classes | U | `UItemDefinition` |
| Actor / Pawn / Character / Player Controller | A | `AEnemyCharacter` |
| Reflected struct | F | `FInventoryEntry` |
| Reflected enum | E | `EItemCategory` |
| Unreal Interface | U and I | `UInteractable` and `IInteractable` |

The user should be able to enter the base name without knowing the prefix.

If an appropriate prefix is already supplied, do not duplicate it.

Examples:

- `Enemy` → `AEnemy`
- `AEnemy` → `AEnemy`
- `InventoryComponent` → `UInventoryComponent`
- `UInventoryComponent` → `UInventoryComponent`

For interfaces, preserve the existing correct dual-declaration implementation.

Distinguish C++ class identifiers from filenames.

Avoid accidental doubled prefixes, reserved identifiers, invalid names and case-insensitive collisions.

Preserve existing naming conventions and verification logic unless a test proves they need improvement.

### 7. Per-class folder organization

I want generated C++ declarations grouped into their own logical folders instead of accumulating unrelated files in one large directory.

Example for a flat module:

```text
InventoryComponent/
    InventoryComponent.h
    InventoryComponent.cpp
```

Example for a header-only type:

```text
ItemData/
    ItemData.h
```

When the module uses Unreal's conventional Public/Private structure, preserve the appropriate visibility and include semantics.

A suitable mirrored layout is:

```text
Public/
    InventoryComponent/
        InventoryComponent.h

Private/
    InventoryComponent/
        InventoryComponent.cpp
```

For an explicitly selected nested folder, retain that logical relative location.

Do not move existing files.

Do not create `.cpp` files inside Public merely for visual grouping when the module has a conventional Private location.

For flat or private-local layouts, colocated files are appropriate.

If a single physically colocated directory conflicts with public API visibility, prefer the correct Unreal module convention and document that decision.

The generated `.cpp` must include the correct header path.

Test nested paths.

Respect existing module discovery, symlink protection, path containment, and collision checks.

### 8. Add lightweight editor snippets

In addition to file creation, provide a small set of useful VS Code C++ snippets, if the current extension does not already include equivalent functionality.

Prioritize:

- `ustruct` — Unreal reflected struct declaration.
- `uenum` — Unreal reflected scoped enum declaration.
- `uproperty` — Common UPROPERTY declaration.
- `ufunction` — Common UFUNCTION declaration.

Use the native VS Code snippet contribution system.

Do not implement a custom editor completion engine.

Ensure snippets use appropriate placeholders and do not silently insert invalid include order or duplicate `.generated.h` references.

Document that reflected declarations require a valid Unreal header context.

If the current extension already has equivalent snippets, enhance or reuse them rather than duplicating entries.

Keep snippet behavior distinct from the right-click file generator.

### 9. Generated code correctness

Verify that all new output uses the Unreal Engine 5.8.4-compatible API structure.

Review:

- Base-class include paths.
- `UCLASS`, `USTRUCT`, and `UENUM`.
- `GENERATED_BODY()`.
- Required generated-header includes.
- Module API macros.
- Class constructor declarations.
- Source/header include paths.
- Reflection-compatible enum and struct syntax.
- Blueprint exposure metadata.
- Required Build.cs dependencies.

Use existing Unreal class and module conventions.

Do not silently modify Build.cs to add dependencies merely because a template was selected.

If a dependency is missing, reuse the existing dependency information and management workflow to explain it.

A generator that produces files with correct names but non-compiling Unreal code is not complete.

### 10. Tests

Add focused regression tests for:

- All existing Explorer-accessible type choices.
- New template generation.
- Correct A/U/F/E prefix normalization.
- Interface U/I pair generation.
- Already-prefixed names.
- Struct and enum header-only output.
- Header/source class pairs.
- Dedicated class directories.
- Public/Private mirrored paths.
- Nested selected folders.
- Filename and declaration consistency.
- `.generated.h` ordering.
- Module API macro correctness.
- Collision refusal.
- Invalid names.
- Symlink/path traversal refusal.
- Creation rollback.
- Existing preview and confirmation behavior.
- Native snippet contributions.

Preserve prior tests.

Do not weaken safety checks to make new templates pass.

### 11. Lightweight real integration

Reuse the existing Git-ignored disposable Unreal project:

`.local-test-projects/Phase3AIntegration/`

Perform targeted integration testing.

At minimum:

1. Open the project in an isolated VS Code Development Host, if practical.
2. Right-click a valid module folder.
3. Verify the type selector.
4. Create one Actor or Component pair.
5. Create one reflected struct.
6. Create one reflected enum.
7. Inspect generated folders.
8. Check C++ naming and includes.
9. Run one appropriate Development Editor build to validate UnrealHeaderTool and compilation.
10. Confirm no unexpected files were overwritten.

If possible, also create and compile one new Character or Pawn template.

Avoid rebuilding the entire Unreal Engine installation.

Do not repeat the comprehensive Phase 3A integration suite.

If an interactive test cannot run, report it honestly and continue the remaining automated checks.

Do not modify the RPGX project.

### 12. Scope and efficiency

This task is intended to use a limited Codex budget effectively.

Avoid:

- Broad architectural refactoring.
- Unnecessary new frameworks.
- New runtime dependencies.
- Changing the extension's version.
- Publishing a new release.
- Redesigning the existing sidebar.
- Rewriting build-process supervision.
- Modifying regeneration safety.
- Starting debugger detach testing.
- Creating hundreds of new class templates.
- Repeated expensive Unreal builds.
- Repeating old comprehensive audits.

Make the smallest coherent changes that satisfy the creation workflow.

Prioritize working implementation over extensive explanatory documentation.

If usage becomes constrained, finish and validate the required Explorer workflow, Struct/Enum support, and folder grouping before optional additional snippets or templates.

### 13. Existing unresolved test

P1.1 regeneration preservation remains unresolved.

The repository has one known failing acceptance test associated with that issue.

Preserve it unchanged.

Do not claim the complete suite is green unless that independently unresolved test has actually been fixed in an authorized phase.

A successful Phase 3B.3z result may retain that one known failure.

Any new failure introduced by this task must be investigated and corrected.

### 14. Validation

At completion:

- Run targeted class/template tests.
- Run the full Node suite where practical.
- Run existing Python tests.
- Perform JavaScript syntax checks.
- Run packaging preflight.
- Verify manifest contributions.
- Confirm public command and setting compatibility.
- Validate generated includes.
- Check Git diffs and whitespace.
- Verify the scratch-directory convention.
- Perform the targeted real Unreal compilation test.

Report exact results.

Do not hide failures.

### 15. Maintenance records

Archive this exact prompt using the existing maintenance system.

Use the next available task ID, for example:

`0010-phase3b3z-v1.md`

Create a matching execution record containing:

- `RESULT.md`
- `CHANGES.md`
- `VALIDATION.md`

Update the maintenance index and relevant developer documentation.

Include a compact table of available creation types, prefixes, generated files and folder layouts.

Avoid generating a large report collection for this small feature.

Do not overwrite earlier maintenance evidence.

Do not automatically create Git commits.

### 16. Acceptance criteria

This phase can be marked complete when:

1. Existing class generators still function.
2. The Explorer right-click workflow exposes the existing supported types.
3. Reflected structs and enums can be generated as header-only files.
4. Appropriate Unreal prefixes are applied automatically.
5. Class pairs are grouped into dedicated logical folders.
6. Existing Public/Private module conventions remain correct.
7. New template output passes targeted tests.
8. At least one new reflected struct and enum compile in the disposable Unreal project.
9. New snippets, if implemented, work through native VS Code completion.
10. No public extension behavior is unintentionally broken.
11. Existing security and creation safeguards remain intact.
12. The known P1.1 failure remains accurately reported.

### Final report

Provide:

- Implemented types.
- Updated Explorer workflow.
- Prefix naming behavior.
- Header-only support.
- Generated folder structure.
- Snippet names.
- Files changed.
- Tests added.
- Exact validation results.
- Real Unreal compilation outcome.
- Remaining optional templates.
- Git working-tree status.
- Maintenance record location.

**Finish the approved changes, validate them, document them, and stop.**

Do not begin the original Phase 3B.3 debugger validation automatically.