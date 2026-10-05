# PowerShell script to initialize and launch dedicated local PostgreSQL instance for MEIL ESG
param(
    [int]$Port = 5433,
    [string]$DbName = "meil_esg"
)

$ErrorActionPreference = "Continue"
$pgDir = "C:\Program Files\PostgreSQL\18\bin"
if (-not (Test-Path "$pgDir\initdb.exe")) {
    $found = Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter "initdb.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $pgDir = $found.DirectoryName }
}

$dataDir = "$PSScriptRoot\..\..\pgdata_meil"
$dataDir = [System.IO.Path]::GetFullPath($dataDir)
$logFile = "$PSScriptRoot\..\..\pg_server.log"

Write-Host "[PostgreSQL Setup] Data directory: $dataDir"

if (-not (Test-Path "$dataDir\PG_VERSION")) {
    Write-Host "[PostgreSQL Setup] Initializing cluster with user 'postgres' and trust auth..."
    & "$pgDir\initdb.exe" -D "$dataDir" -U postgres -A trust --no-locale --encoding=UTF8
}

# Check if server is running on $Port
$testConn = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -InformationLevel Quiet
if (-not $testConn) {
    Write-Host "[PostgreSQL Setup] Starting PostgreSQL server on port $Port..."
    & "$pgDir\pg_ctl.exe" -D "$dataDir" -l "$logFile" -o "-p $Port" start
    Start-Sleep -Seconds 2
}

# Verify database exists, if not create it
Write-Host "[PostgreSQL Setup] Verifying database '$DbName'..."
$checkDb = & "$pgDir\psql.exe" -U postgres -h 127.0.0.1 -p $Port -t -c "SELECT 1 FROM pg_database WHERE datname='$DbName';"
if ($checkDb -notmatch "1") {
    Write-Host "[PostgreSQL Setup] Creating database '$DbName'..."
    & "$pgDir\createdb.exe" -U postgres -h 127.0.0.1 -p $Port $DbName
    Write-Host "[PostgreSQL Setup] Database '$DbName' created successfully."
} else {
    Write-Host "[PostgreSQL Setup] Database '$DbName' is ready."
}
