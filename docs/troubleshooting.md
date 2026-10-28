# 本地启动与故障排查

拾知运行在你的电脑上。浏览器打开 `http://127.0.0.1:3000/` 时，需要本机的网页服务（3000 端口）和 MySQL（3307 端口）都在运行。GitHub 保存项目代码，不会替你运行本机服务。

## 这次为什么打不开

2026-10-28 的现场检查确认：**3000 和 3307 端口均没有监听进程**；绕过代理访问 3000 得到连接被拒绝（connection refused）。因此当时打不开的直接原因是本机服务没有运行。

目前没有证据确定两个进程具体因何退出，不能据此断言当天重启了电脑。系统记录的最近启动时间为 2026-10-04。关闭或退出相关进程等情况，也可能让本地网页无法访问。

当前部署不注册 Windows 服务、不设置开机自启，所以每次开机后需要手动启动一次。启动后关闭浏览器不会停止后台服务。

如果服务由临时开发工具的命令会话启动，该工具清理会话时也可能结束关联进程。日常请从资源管理器双击项目里的启动入口，避免依赖助手或开发终端。此次复查中确实观察到两个服务在成功运行后同时消失，但日志没有记录是谁结束了进程。

## 日常使用

1. 打开 `D:\Study\selfStudyEfficient`，双击 `启动拾知.cmd`。
2. 等待数据库和网页服务准备好，浏览器会打开正确地址。不要连续双击多个启动窗口。
3. 在浏览器使用拾知；关闭浏览器后，后台服务继续运行。
4. 需要停止时，双击 `停止拾知.cmd`。

可以把 `启动拾知.cmd` 的快捷方式放在桌面，方便每天使用。项目文件和数据库仍留在原目录。

也可在 PowerShell 中直接启动：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Study\selfStudyEfficient\scripts\start.ps1"
```

这条命令启动服务后，手动打开 [http://127.0.0.1:3000/](http://127.0.0.1:3000/)。地址末尾不要附加中文说明文字。`npm start` 只启动网页/API，不负责启动数据库；日常使用完整启动脚本更方便。

## 再次打不开时，按这个顺序检查

### 1. 双击“检查运行状态”

项目根目录的 `检查运行状态.cmd` 只读检查，不会删除数据或重建数据库，检查完会保留窗口。

也可以在 PowerShell 中运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Study\selfStudyEfficient\scripts\status.ps1"
```

| 检查结果或现象 | 含义与处理 |
| --- | --- |
| 3000 和 3307 均未监听 | 网页服务和数据库没有运行。双击“启动拾知”，等启动完成。 |
| 3307 已运行，3000 未监听 | 数据库已启动，网页服务没有运行或启动失败。再运行“启动拾知”；失败时查看应用错误日志。 |
| 3000 已监听，但健康检查失败 | 可能是数据库不可用，或端口被其他程序占用。查看检查结果中的进程和错误信息；不要直接结束不认识的程序。 |
| 端口被其他程序占用 / `EADDRINUSE` | 关闭你确认不再需要的占用程序，再启动拾知。不要只凭端口号批量结束进程。 |
| 数据库连接被拒绝 / `ECONNREFUSED`，目标为 3307 | 数据库未就绪或启动失败。查看数据库错误日志。增强后的启动脚本会等待数据库查询成功，再启动网页服务。 |
| `Access denied` 或数据库账号认证失败 | 本地账号与配置可能不一致。保留 `.env` 和数据，检查是否改过配置；不要通过重新初始化修复。 |
| 找不到 `node.exe` 或 `npm.cmd` | 检查 Node.js 是否仍安装，重新打开终端；项目要求 Node.js 22 或更新版本。 |
| 找不到 `.env`、MySQL 程序或数据目录 | 检查项目目录是否完整，是否只下载了 GitHub 代码。GitHub 不包含本机数据库和密码；应恢复自己的备份。 |
| 健康检查成功，但浏览器仍打不开 | 使用下方正确地址，检查代理是否绕过 `127.0.0.1`/`localhost`。若页面显示旧内容，按 `Ctrl+F5` 强制刷新。 |

### 2. 绕过代理确认服务是否可用

在 PowerShell 中运行：

```powershell
curl.exe --noproxy "*" http://127.0.0.1:3000/api/health
```

返回 `{"ok":true,"database":"MySQL"}` 表示网页服务和数据库都可用。此时打开 [http://127.0.0.1:3000/](http://127.0.0.1:3000/)。

如果提示无法连接 3000，说明该地址当时没有可访问的服务，先检查启动结果。如果无代理检查成功，普通请求却报 `127.0.0.1:7890` 等代理端口错误，检查代理软件的本地地址绕过设置。启动脚本的健康检查已绕过代理，避免把代理故障误报为项目故障。

### 3. 按失败环节查看日志

| 日志文件 | 用途 |
| --- | --- |
| `.runtime/app-error.log` | 网页服务启动失败、数据库连接等错误。 |
| `.runtime/app.log` | 网页服务运行和请求记录。 |
| `.runtime/mysql-error.log` | 数据库启动、恢复和运行错误。 |
| `.runtime/mysql.log` | 数据库标准输出。 |

在 PowerShell 中查看最近 40 行：

```powershell
Get-Content -LiteralPath "D:\Study\selfStudyEfficient\.runtime\app-error.log" -Tail 40
Get-Content -LiteralPath "D:\Study\selfStudyEfficient\.runtime\mysql-error.log" -Tail 40
```

错误日志为空不代表服务一定在运行，要同时看端口和健康检查。日志通常不能完整说明进程被外部程序结束的原因。

## 更新代码后

如果已经更新代码但页面仍是旧版，先停止拾知，再在项目目录重新构建并启动：

```powershell
Set-Location "D:\Study\selfStudyEfficient"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\stop.ps1"
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw '构建失败，请先处理构建错误。' }
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\scripts\start.ps1"
```

如果更新涉及依赖变化，先按项目更新说明安装依赖。服务恢复后在浏览器按 `Ctrl+F5`。

## 保留数据

日常排查**不要删除 `.runtime`，不要重新运行 `scripts/setup-db.mjs`，不要初始化数据库**。这些操作不是普通重启步骤；本地笔记、复习和待办数据都依赖现有数据库。

需要备份时，先用“停止拾知”正常关闭服务，再备份 `.runtime/data`、`.env` 和 `.runtime/admin.env` 到自己的安全位置。不要把这些文件上传 GitHub 或公开给他人；对外提供日志前也应检查是否包含个人内容或连接信息。
