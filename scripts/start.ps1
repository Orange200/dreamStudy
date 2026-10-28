param([switch]$Rebuild)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot
$runtime = Join-Path $projectRoot '.runtime'

function Backup-Log([string]$Name) {
    $log = Join-Path $runtime $Name
    if (Test-Path -LiteralPath $log) { Copy-Item -LiteralPath $log -Destination "$log.previous" -Force }
}

try {
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $node) { throw '找不到 Node.js。请安装 Node.js 22 或更新版本，然后重新打开启动入口。' }
    if (-not (Test-Path -LiteralPath '.env')) { throw '缺少 .env 连接配置，请从自己的备份恢复；不要重新初始化已有数据库。' }
    if (-not (Test-Path -LiteralPath 'node_modules/mysql2')) { throw '缺少程序依赖，请在项目文件夹执行 npm.cmd install 后重试。' }
    New-Item -ItemType Directory -Path $runtime -Force | Out-Null

    $appListener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if ($appListener) {
        & $node.Source scripts/check-local.mjs health
        if ($LASTEXITCODE -eq 0) {
            if ($Rebuild) { throw '服务正在运行。请先运行 scripts/stop.ps1，再带 -Rebuild 启动，以更新网页文件。' }
            Write-Host '拾知已经在运行：http://127.0.0.1:3000/' -ForegroundColor Green
            exit 0
        }
        $owners = ($appListener.OwningProcess | Sort-Object -Unique) -join ', '
        throw "3000 端口已被进程 $owners 使用，但拾知健康检查失败。请先双击检查运行状态.cmd；本脚本不会关闭未知进程。"
    }

    $mysqlHome = Get-ChildItem -LiteralPath $runtime -Directory -Filter 'mysql-*-winx64' | Select-Object -First 1
    if ($mysqlHome) {
        $dataDir = Join-Path $runtime 'data'
        if (-not (Test-Path -LiteralPath (Join-Path $dataDir 'mysql'))) {
            throw '未找到已有数据库目录 .runtime/data/mysql，请检查项目位置或恢复备份；不要运行 setup-db.mjs 修复。'
        }
        $dbListener = Get-NetTCPConnection -LocalPort 3307 -State Listen -ErrorAction SilentlyContinue
        if (-not $dbListener) {
            Write-Host '[1/3] 正在启动本地数据库…'
            Backup-Log 'mysql.log'
            Backup-Log 'mysql-error.log'
            $mysqlExe = Join-Path $mysqlHome.FullName 'bin/mysqld.exe'
            $dbArgs = @('--no-defaults', ('--datadir="{0}"' -f $dataDir), '--port=3307', '--bind-address=127.0.0.1', '--mysqlx=OFF', '--console')
            $dbProc = Start-Process -FilePath $mysqlExe -ArgumentList $dbArgs -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'mysql.log') -RedirectStandardError (Join-Path $runtime 'mysql-error.log')
            $dbProc.Id | Set-Content (Join-Path $runtime 'mysql.pid')
        }
    }
    Write-Host '[1/3] 等待数据库可用，首次恢复可能需要一些时间…'
    & $node.Source scripts/check-local.mjs db --wait=60
    if ($LASTEXITCODE -ne 0) { throw '数据库未就绪。请查看 .runtime/mysql-error.log；先解决数据库问题，再启动网页。' }

    if ($Rebuild -or -not (Test-Path -LiteralPath 'dist/index.html')) {
        Write-Host '[2/3] 正在生成网页…'
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw '网页构建失败，请查看上方错误。' }
    }
    Write-Host '[2/3] 正在启动网页服务…'
    Backup-Log 'app.log'
    Backup-Log 'app-error.log'
    $appProc = Start-Process -FilePath $node.Source -ArgumentList 'server/index.js' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'app.log') -RedirectStandardError (Join-Path $runtime 'app-error.log')
    $appProc.Id | Set-Content (Join-Path $runtime 'app.pid')
    Write-Host '[3/3] 检查网页与数据库连接…'
    & $node.Source scripts/check-local.mjs health --wait=20
    if ($LASTEXITCODE -ne 0) { throw '网页启动失败。请查看 .runtime/app-error.log，或双击检查运行状态.cmd。' }
    Write-Host '拾知已启动：http://127.0.0.1:3000/' -ForegroundColor Green
    Write-Host '关闭浏览器不会停止服务。下次开机后，请先双击启动拾知.cmd。'
} catch {
    Write-Host "启动失败：$($_.Exception.Message)" -ForegroundColor Red
    Write-Host "排查说明：$(Join-Path $projectRoot 'docs/troubleshooting.md')"
    exit 1
}
