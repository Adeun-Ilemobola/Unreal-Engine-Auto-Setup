$ErrorActionPreference = 'Stop'
$phaseRepository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$phaseProject = Join-Path $phaseRepository '.local-test-projects/Phase3AIntegration'
$phaseTemplate = 'C:\Program Files\Epic Games\UE_5.8\Templates\TP_Blank'
if (Test-Path -LiteralPath $phaseProject) { throw 'Refusing to overwrite existing disposable workspace' }
git -C $phaseRepository check-ignore --quiet --no-index ($phaseProject + '/Phase3AIntegration.uproject')
if ($LASTEXITCODE -ne 0) { throw 'Disposable workspace is not ignored' }
if (-not (Test-Path -LiteralPath (Join-Path $phaseTemplate 'Config/TemplateDefs.ini'))) { throw 'Installed template missing' }
New-Item -ItemType Directory -Path $phaseProject | Out-Null
@{ purpose='Phase3AIntegration'; repository=$phaseRepository; template=$phaseTemplate; created=[DateTime]::UtcNow.ToString('o') } | ConvertTo-Json | Set-Content (Join-Path $phaseProject 'PHASE3A-OWNERSHIP.json')
# Template-based equivalent of the installed TP_Blank rename rules; not Editor-created.
foreach ($phaseFile in Get-ChildItem (Join-Path $phaseTemplate 'Source') -Recurse -File) {
  $phaseRelative = [IO.Path]::GetRelativePath($phaseTemplate,$phaseFile.FullName).Replace('TP_Blank','Phase3AIntegration')
  $phaseDestination = Join-Path $phaseProject $phaseRelative
  New-Item -ItemType Directory -Path (Split-Path $phaseDestination -Parent) -Force | Out-Null
  $phaseText = [IO.File]::ReadAllText($phaseFile.FullName).Replace('TP_BLANK','PHASE3AINTEGRATION').Replace('TP_Blank','Phase3AIntegration').Replace('tp_blank','phase3aintegration')
  [IO.File]::WriteAllText($phaseDestination,$phaseText)
}
$phaseDescriptor = Get-Content (Join-Path $phaseTemplate 'TP_Blank.uproject') -Raw | ConvertFrom-Json
$phaseDescriptor.EngineAssociation='5.8'
$phaseDescriptor.Modules[0].Name='Phase3AIntegration'
$phaseDescriptor.Plugins=@() # No optional Modeling Tools/Starter Content in this minimal fixture.
$phaseDescriptor | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $phaseProject 'Phase3AIntegration.uproject')
New-Item -ItemType Directory -Path (Join-Path $phaseProject 'Config'),(Join-Path $phaseProject 'Content'),(Join-Path $phaseProject '.vscode') | Out-Null
[IO.File]::WriteAllText((Join-Path $phaseProject 'Config/DefaultEngine.ini'),"[/Script/EngineSettings.GameMapsSettings]`nGameDefaultMap=/Engine/Maps/Entry`nEditorStartupMap=/Engine/Maps/Entry`n")
[IO.File]::WriteAllText((Join-Path $phaseProject 'Config/DefaultGame.ini'),"[/Script/EngineSettings.GeneralProjectSettings]`nProjectName=Phase3AIntegration`n")
# Test-owned custom value: setup must preserve it. Auto-install is avoided by loading existing companions.
@{ 'files.exclude'=@{ 'Content'=$false }; 'unrealEngine.enginePath'='C:\Program Files\Epic Games\UE_5.8'; 'unrealSetup.runtimeRefreshInterval'=0; 'unrealSetup.automationMode'='watch' } | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $phaseProject '.vscode/settings.json')
Write-Output ('Created template-based disposable C++ project: ' + $phaseProject)
