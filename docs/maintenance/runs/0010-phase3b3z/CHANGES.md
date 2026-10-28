# Phase 3B.3z Changes

## Source Files Modified
- `unreal-auto-setup/classTemplates.js`:
  - Added 8 new template types to registry (`struct`, `enum`, `character`, `pawn`, `playerController`, `gameModeBase`, `functionLibrary`, `dataAsset`).
  - Added `kind: 'struct'` and `kind: 'enum'` with `cpp: false`.
  - Added `E` and `F` prefix checking to prefix normalization regex `^[AUFIE][A-Z]`.
  - Updated `render()` to handle `struct` and `enum` header generation.
  - Updated `plan()` to group files into per-class subfolders (`[subfolder(folder), name.stem].filter(Boolean).join('/')`) and only emit `.cpp` when `type.cpp !== false`.
- `unreal-auto-setup/classWizard.js`:
  - Updated QuickPick to display all registry items (removed 5-item limitation for Explorer invocation).
  - Updated preview and information messages to handle header-only classes (`type.cpp`).
  - Set default exposure to `native` when invoked from Explorer context.
- `unreal-auto-setup/package.json`:
  - Added contributes `snippets` mapping `cpp` to `./snippets/unreal.json`.
- `bundle_sources.py`:
  - Added `snippets/unreal.json` to `ASSETS`.

## New Assets and Tests
- `unreal-auto-setup/snippets/unreal.json`:
  - Snippets for `ustruct`, `uenum`, `uproperty`, `ufunction`.
- `unreal-auto-setup/tests/creation-expansion.test.js`:
  - Comprehensive suite for all 17 templates via Explorer workflow, safe writing, and snippet packaging.
- `unreal-auto-setup/tests/classFiles.test.js`:
  - Updated fixture paths for per-class folders.
- `unreal-auto-setup/tests/classTemplates.test.js`:
  - Updated tests for cpp-only rendering and folder layouts.
- `unreal-auto-setup/tests/classWizard.test.js`:
  - Updated expected paths with per-class folders.
- `unreal-auto-setup/tests/ux.test.js`:
  - Updated expected QuickPick counts and per-class folder paths.
- `tools/phase3b3z/compile.cjs`:
  - Disposable UE 5.8 integration compilation script compiling all 17 templates.
