# 拾知 · 个人学习与主动回忆博客

Vue 3 + Vite 前端，Fastify API，MySQL 8.4 数据库。生产环境由一个 Node.js 进程同时提供网页和 API，适合本地个人使用。

## 本地使用

部署完成后打开 http://127.0.0.1:3000 。

Windows 启动：`powershell -ExecutionPolicy Bypass -File scripts/start.ps1`

停止：`powershell -ExecutionPolicy Bypass -File scripts/stop.ps1`

MySQL 便携程序位于 `.runtime/mysql-8.4.11-winx64`，数据目录 `.runtime/data`，端口 3307。数据库仅监听 127.0.0.1。应用账号和随机密码保存在 `.env`，请勿公开。启动不需要管理员权限，也不注册 Windows 服务。

## 学习流程

1. 新建笔记，输入学习日期、标题、分类和内容。
2. 用 `# 小标题` 或 `## 小标题` 分组，自动生成可折叠知识地图。
3. 用 `[[关键词]]` 标记需要掌握的概念，自动生成填空题。
4. 在每日复习选择填空或完整回忆，提交后保存答案与关键词覆盖反馈。
5. 发布到个人知识博客，阅读知识地图或导出 Markdown。这里的“发布”指展示到本地博客，不上传互联网。

完整回忆的反馈采用关键词匹配，不使用 AI，不是语义理解评分。未标记关键词时仍可记录完整回忆，但不计算关键词覆盖。复习提醒按距上次复习超过一天筛选。

## 开发

需要 Node.js 22 或更新版本与 MySQL 8。`npm install`，复制 `.env.example` 为 `.env` 并填写连接配置。先创建 utf8mb4 的数据库，应用启动自动创建数据表。

`npm start` 启动 API；另一个终端 `npm run dev` 启动 Vue 开发服务器。`npm run build` 生成生产文件，之后只运行 `npm start` 即可。`npm test` 验证笔记解析规则。

API：`GET /api/health`、`GET/POST /api/entries`、`PUT/DELETE /api/entries/:id`、`POST /api/entries/:id/reviews`、`GET /api/reviews`。所有写入通过参数化 SQL 执行。

## 备份

停止程序后复制 `.runtime/data` 和 `.env` 可保留本地数据库与连接配置；也可用 MySQL 的 mysqldump 导出 `study_garden`。Markdown 导出不包括复习历史。数据库数据与程序依赖都被 Git 忽略。

当前版本是单人本地系统，没有登录与公网访问配置。
