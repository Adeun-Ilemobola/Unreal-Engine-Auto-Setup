**Task: Relocate development test artifacts to C:\Dev**

My development directory `C:\Dev` is already excluded from Bitdefender scanning.

Your supervisor and process-lifecycle tests are generating temporary executables such as `TreeFixture.exe` under `C:\Users\Owner\AppData\Local\Temp`, causing repeated antivirus interruptions.

Please implement the following:

1. Create and use `C:\Dev\Scratch\UnrealAutoSetupTests` as the dedicated location for temporary test executables, compiled fixtures, process-supervision artifacts, and related files.
2. Update the relevant test harnesses to use this location instead of the default Windows Temp directory.
3. Preserve isolated per-run subdirectories, concurrency safety, automatic cleanup, and existing test behavior.
4. Configure temporary environment variables only for the relevant test processes. Do not modify system-wide `TEMP` or `TMP`.
5. Keep permanent source files in their existing repository locations.
6. Run the affected tests and confirm that temporary executable generation uses the new location.
7. Document the configuration so future tests follow the same convention.

You have authorization to make the necessary changes within the VS Code extension repository, VS Code development/test environment, and directly related Unreal Engine testing toolchains.

Do not disable antivirus protection or modify Bitdefender settings.

Report the changes made and any remaining limitations.
