$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot
$runtime = Join-Path $projectRoot '.runtime'
$mysqlHome = Get-ChildItem $runtime -Directory -Filter 'mysql-*-winx64' | Select-Object -First 1
if ($mysqlHome) {
    $mysqlExe = Join-Path $mysqlHome.FullName 'bin/mysqld.exe'
    $dataDir = Join-Path $runtime 'data'
    if (-not (Test-Path (Join-Path $dataDir 'mysql'))) { throw '数据库尚未初始化，请先运行 scripts/setup-db.mjs。' }
    $dbRunning = Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue
    if (-not $dbRunning) {
        $dbProc = Start-Process -FilePath $mysqlExe -ArgumentList @('--no-defaults',"--datadir=`"$dataDir`"",'--port=3307','--bind-address=127.0.0.1','--mysqlx=OFF','--console') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'mysql.log') -RedirectStandardError (Join-Path $runtime 'mysql-error.log')
        $dbProc.Id | Set-Content (Join-Path $runtime 'mysql.pid')
        Start-Sleep -Seconds 3
    }
}
if (-not (Test-Path (Join-Path $projectRoot 'dist/index.html'))) { & npm.cmd run build; if($LASTEXITCODE -ne 0){throw '构建失败'} }
$appRunning = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if (-not $appRunning) {
    $nodeExe = (Get-Command node.exe).Source
    $appProc = Start-Process -FilePath $nodeExe -ArgumentList 'server/index.js' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'app.log') -RedirectStandardError (Join-Path $runtime 'app-error.log')
    $appProc.Id | Set-Content (Join-Path $runtime 'app.pid')
}
Write-Host '拾知已启动：http://127.0.0.1:3000'
