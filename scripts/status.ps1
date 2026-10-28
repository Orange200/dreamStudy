$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $projectRoot
Write-Host '拾知运行检查（不会修改笔记或启动/停止服务）' -ForegroundColor Cyan
Write-Host "项目位置：$projectRoot"
Write-Host '正确网址：http://127.0.0.1:3000/'
Write-Host ''

$node = Get-Command node.exe -ErrorAction SilentlyContinue
$hasConfig = Test-Path -LiteralPath '.env'
$hasDependencies = Test-Path -LiteralPath 'node_modules/mysql2'
$hasBuild = Test-Path -LiteralPath 'dist/index.html'
Write-Host "Node.js 已安装：$([bool]$node)；连接配置存在：$hasConfig；依赖存在：$hasDependencies；网页已构建：$hasBuild"

foreach ($port in @(3000, 3307)) {
    $listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
    if ($listeners.Count -eq 0) {
        Write-Host "端口 ${port}：未运行。" -ForegroundColor Yellow
    } else {
        foreach ($listener in $listeners) {
            $owner = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
            Write-Host "端口 ${port}：正在监听，进程 $($owner.ProcessName)，进程编号 $($listener.OwningProcess)。"
        }
    }
}

$dbOk = $false
$webOk = $false
if ($node -and $hasConfig -and $hasDependencies) {
    & $node.Source scripts/check-local.mjs db
    $dbOk = $LASTEXITCODE -eq 0
    & $node.Source scripts/check-local.mjs health
    $webOk = $LASTEXITCODE -eq 0
}
Write-Host ''
if ($dbOk -and $webOk -and $hasBuild) {
    Write-Host '结论：服务正常。如果浏览器打不开，请使用上方正确网址，Ctrl+F5 刷新，并让代理绕过 127.0.0.1 / localhost。' -ForegroundColor Green
    exit 0
}
Write-Host '下一步：双击启动拾知.cmd。启动失败时，按错误提示查看下面的日志。' -ForegroundColor Yellow
foreach ($name in @('app-error.log', 'mysql-error.log')) {
    $file = Join-Path $projectRoot ".runtime/$name"
    if (Test-Path -LiteralPath $file) {
        $item = Get-Item -LiteralPath $file
        Write-Host "日志：$file （更新于 $($item.LastWriteTime)）"
    }
}
Write-Host "详细排查：$(Join-Path $projectRoot 'docs/troubleshooting.md')"
exit 1
