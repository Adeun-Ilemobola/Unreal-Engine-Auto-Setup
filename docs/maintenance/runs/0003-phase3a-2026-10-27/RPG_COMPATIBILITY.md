# RPGX backward-compatibility review

Confidently located at `C:\Dev\Unreal\RPGX\RPGX.uproject` through a scoped C:\Dev descriptor search. This review was **read-only**. The other discovered `testVs` project was not modified or used. No guessing of an RPG path or broad gameplay audit.

[Structured inspection and hashes](rpg-readonly.json) were produced by `node tools/phase3a/inspect-rpg.cjs`. It calls current discovery/policy helpers with a minimal read-only configuration adapter, not a real VS Code extension host. The observed settings JSONC has a trailing comma and no comments; the script's narrow trailing-comma normalization is not a general JSONC parser and did not rewrite the file.

## What exists and what current source understands

- Descriptor association **5.8**; one conventional Runtime/Default RPGX module with AdditionalDependencies Engine. Current target inference recognizes **RPGX (Game)** and **RPGXEditor (Editor)**.
- Existing `.vscode/settings.json` contains expected C++ file associations/exclusions, bracket/whitespace settings, C/C++ clang-format settings, C++ formatting-on-save defaults, `unrealEngine.defaultProject=RPGX.uproject`, and engine path `C:\Program Files\Epic Games\UE_5.8`. It matches the older extension's documented configuration shape. No missing top-level core setup-default keys were found.
- `.vscode/c_cpp_properties.json` uses version 4 and `configurationProvider=skyboxlabs.unrealengine-tools`, still the expected provider.
- `.vscode/tasks.json` has an older **AD Unreal: RPGXEditor Win64 Development** label, type UnrealBuildTool, mode Build, target RPGXEditor, platform Win64 and configuration Development. Current setup's equivalent-argument check recognizes that task despite the old label; no automatic label modernization is needed.
- Existing `.clang-format` is present. Current mergeMissing preserves all observed existing settings values in a dry calculation. No setup command, write, regeneration or formatting operation was applied to RPGX.
- Current module discovery finds RPGX in Flat layout plus two modules under the local VisualStudioTools plugin (Editor helper and VisualStudioTools). The descriptor explicitly disables that plugin for Win64; discovery is not proof of enablement/build participation. Module selection can therefore offer discovered disabled plugin modules; review the chosen module before creation/dependency operations.
- Other enabled references include ModelingToolsEditorMode, GameplayStateTree and CommonUI. Their gameplay/build compatibility was not investigated, changed or certified.

## Risks and preservation findings

The configured engine folder now contains **5.8.4**, while the descriptor only constrains major/minor **5.8**. Current version-policy acceptance is true and required executable files are present. This does not establish that RPGX's existing code/assets compile on that patch, and no RPG migration/build was attempted. Historical 5.8.1 validation is not a new RPG result.

Old settings/tasks/provider choices remain understandable to the current source. Current setup merges missing defaults and preserves equivalent existing tasks/configuration; that logic was exercised in the disposable real host, while the RPG check itself stayed read-only. New automation settings are absent from the old config, so current declared defaults apply (watch mode); no opt-in automation was enabled for RPGX.

P1.1 remains an explicit risk if RPGX regeneration is later requested while protected files can change. It was **not** regenerated here. Existing files were not overwritten just to modernize them. No gameplay class/module refactor, asset/content deletion, Editor launch, debugger attach, migration or source write occurred in RPGX.

Final checks confirmed identical SHA-256 values for the descriptor, all three .vscode files, .clang-format, and all three discovered Build.cs files. The original project is retained untouched. Real RPG host/build validation would need a separate controlled decision; this result is a backward-configuration/read-only compatibility finding, not RPG integration certification.
