$runtime = Join-Path (Split-Path $PSScriptRoot -Parent) '.runtime'
foreach($name in @('app','mysql')) {
    $pidFile = Join-Path $runtime "$name.pid"
    if(Test-Path $pidFile){
        $processId = [int](Get-Content $pidFile)
        $ownedProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
        $expected = if($name -eq 'mysql'){'mysqld.exe'}else{'node.exe'}
        if($ownedProcess -and $ownedProcess.Name -eq $expected -and ($ownedProcess.CommandLine -like '*server/index.js*' -or $ownedProcess.CommandLine -like '*selfStudyEfficient*.runtime*')) {
            if($name -eq 'mysql'){ & node.exe (Join-Path $PSScriptRoot 'shutdown-db.mjs'); if($LASTEXITCODE -ne 0){throw 'MySQL shutdown failed'} }else{Stop-Process -Id $processId}
        }
        Remove-Item -LiteralPath $pidFile
    }
}
Write-Host '已停止本项目进程。'
