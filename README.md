# 拾知：云端副本

本副本用于 Render + Aiven MySQL，独立于本地版本。不要上传本地 `.env`、数据库文件或任何密码。

1. 创建 Aiven 免费 MySQL，记录主机、端口、用户名、密码、数据库名和 CA 证书。使用已有数据时先备份本地数据库，再导入云数据库；导入会将笔记等数据上传至 Aiven。
2. 将此副本上传到私有代码仓库，在 Render 中连接仓库并使用 `render.yaml` 创建 Blueprint。选择 Free 方案。
3. 在 Render 环境变量中填写 `AUTH_USER`、`AUTH_PASSWORD` 和 `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`、`DB_CA`。`DB_CA` 是 Aiven CA 证书全文，可输入真实换行或用 `\n` 表示换行。选用随机且足够长的访问密码，不要提交真实凭据。
4. 部署后用 Render 地址访问；页面和 API 均受浏览器密码保护。`/healthz` 不要求认证，仅返回应用存活状态，不包含数据库信息。检查笔记读取、保存和删除，并验证未经认证的 API 被拒绝。

Render 免费服务可能休眠，Aiven 免费数据库可能因长期不活跃而停止。云端和本地数据不会自动同步，请单独备份。
