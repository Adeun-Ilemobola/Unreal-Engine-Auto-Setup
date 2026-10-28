$ErrorActionPreference='Stop'
$repository=Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$native=Join-Path $repository 'unreal-auto-setup\native'
$compiler=Join-Path $env:SystemRoot 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$scratchBase='C:\Dev\Scratch\UnrealAutoSetupTests'
New-Item -ItemType Directory -Path $scratchBase -Force | Out-Null
$compileScratch=Join-Path $scratchBase ('helper-build-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $compileScratch | Out-Null
$previousTemp=$env:TEMP
$previousTmp=$env:TMP
try {
 $env:TEMP=$compileScratch
 $env:TMP=$compileScratch
 & $compiler /nologo /optimize+ /platform:x64 /target:exe /reference:System.Web.Extensions.dll "/out:$native\OperationSupervisor.exe" "$native\OperationSupervisor.cs"
 if($LASTEXITCODE -ne 0){throw 'Supervisor compilation failed'}
} finally {
 $env:TEMP=$previousTemp
 $env:TMP=$previousTmp
 Remove-Item -LiteralPath $compileScratch -Recurse -Force
}
$record=@{schema=1;binarySha256=(Get-FileHash "$native\OperationSupervisor.exe" -Algorithm SHA256).Hash.ToLowerInvariant();sourceSha256=(Get-FileHash "$native\OperationSupervisor.cs" -Algorithm SHA256).Hash.ToLowerInvariant()}
$record | ConvertTo-Json | Set-Content -Encoding utf8 "$native\supervisor-build.json"
