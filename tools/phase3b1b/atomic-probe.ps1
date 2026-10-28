$ErrorActionPreference = 'Stop'
$repositoryPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$fixturePath = Join-Path $repositoryPath '.local-test-projects\Phase3AIntegration'
$ownerRecord = Get-Content -LiteralPath (Join-Path $fixturePath 'PHASE3A-OWNERSHIP.json') -Raw | ConvertFrom-Json
if ($ownerRecord.repository -ne $repositoryPath -or $ownerRecord.purpose -ne 'Phase3AIntegration') { throw 'Wrong fixture' }
$probePath = Join-Path $fixturePath 'phase3b1b-atomic-probe'
if (Test-Path -LiteralPath $probePath) { throw 'Probe collision' }
New-Item -ItemType Directory -Path $probePath | Out-Null
$results = @()
foreach ($scenario in @('ordinary','late-external-save')) {
  $casePath = Join-Path $probePath $scenario
  New-Item -ItemType Directory -Path $casePath | Out-Null
  $target = Join-Path $casePath 'settings.json'
  $replacement = Join-Path $casePath 'baseline.tmp'
  $backup = Join-Path $casePath 'replaced.bin'
  [IO.File]::WriteAllText($target,'generated-content')
  [IO.File]::WriteAllText($replacement,'original-configuration')
  # Deterministic barrier: simulate a saved external edit immediately before commit.
  if ($scenario -eq 'late-external-save') { [IO.File]::WriteAllText($target,'newer-user-content') }
  $before = Get-Item -LiteralPath $target
  [IO.File]::Replace($replacement,$target,$backup)
  $results += [ordered]@{scenario=$scenario;primitive='System.IO.File.Replace (Windows atomic replacement with backup)';preLength=$before.Length;preLastWriteUtc=$before.LastWriteTimeUtc.ToString('o');live=[IO.File]::ReadAllText($target);backup=[IO.File]::ReadAllText($backup);ordinaryRestoration=([IO.File]::ReadAllText($target) -eq 'original-configuration');concurrentLiveContentPreserved=([IO.File]::ReadAllText($target) -eq 'newer-user-content')}
}
$lockTarget = Join-Path $probePath 'locked.json'
[IO.File]::WriteAllText($lockTarget,'baseline')
$handle = [IO.File]::Open($lockTarget,[IO.FileMode]::Open,[IO.FileAccess]::ReadWrite,[IO.FileShare]::Read)
try {
  try { [IO.File]::WriteAllText($lockTarget,'generator-or-user-write'); $blocked = $false }
  catch [IO.IOException] { $blocked = $true }
} finally { $handle.Dispose() }
$record = [ordered]@{scope=$probePath;replacementCases=$results;exclusiveWriteLockBlocksBothGeneratorAndUser=$blocked;adopted=$false;conclusion='Atomic backup preserves the displaced version but does not identify its writer; a blanket write lock also prevents ordinary generator writes. Neither alone establishes safe conflict-free restoration.'}
$record | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $repositoryPath 'docs\maintenance\runs\0006-phase3b1b-2026-10-28\atomic-probe.json') -Encoding utf8
$record | ConvertTo-Json -Depth 6
