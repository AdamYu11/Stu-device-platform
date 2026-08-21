# AI 助手模块说明文档

> 项目：谦哥数码数据库（Stu-device-platform）
> 更新日期：2026-08-21（v2：后端已切换为 ivoinkwell/device-platform@server，AI 模块随迁完成）

---

## 一、功能简介

本项目内置**AI 助手**，可在前端窗口直接提问本项目的所有内容：

- **设备库**：所有手机的完整参数（品牌、型号、处理器、屏幕、电池、充电等）
- **测试项目**：所有测试项目及其备注
- **测试记录**：每台设备在各测试项目下的具体数据（剩余电量、温度、续航时长等）

支持自然语言查询、对比、统计、排名，例如「库里有哪些设备？」「续航测试里哪台表现最好？」「对比小米和华为的电池与充电」。

### 工作原理

```
前端 AI 聊天页 ──POST /api/ai/chat──▶ 后端 routes/ai.js
                                        │ 1. 实时读取 SQLite 全量数据，拼成"知识文本"
                                        │ 2. 知识文本 + 对话历史 → 注入 system prompt
                                        │ 3. 调用大模型（OpenAI 兼容接口，key 只存后端）
                                        ◀── {code:0, data:{content: 回答}}
```

- **数据实时**：每次提问实时构建数据库快照，回答永远基于最新数据（新增设备/记录后无需任何额外操作）
- **安全**：API Key 只存后端 `.env`，前端完全无感知
- **防滥用**：每 IP 每分钟 10 次内存限流
- **零新增依赖**：后端用 Node 原生 fetch，未引入任何新 npm 包

---

## 二、当前后端架构（v2 迁移后）

后端已从旧的自研 Express+better-sqlite3+JWT 实现，整体替换为 GitHub 仓库
**`ivoinkwell/device-platform` 的 `server` 分支**：

| 对比项 | 旧后端 | 新后端（当前） |
|---|---|---|
| 入口文件 | `server.js` | `index.js` |
| SQLite 驱动 | `better-sqlite3`（原生编译依赖） | `node:sqlite`（Node ≥22.13 内置，零依赖） |
| 依赖包 | express/cors/better-sqlite3/bcryptjs/jsonwebtoken/multer | 仅 express/cors/multer |
| 鉴权方式 | JWT（jsonwebtoken） | 随机 token 存 `tokens` 表 + scrypt 密码哈希 |
| 表名字段 | camelCase（`devices.updatedAt`、`projects`、`records`） | snake_case（`devices.updated_at`、`test_projects`、`project_records`） |
| 鉴权中间件 | `middleware/auth.js` + `utils/respond.js` | 根目录 `auth.js`（路由内直接 `res.json`，无统一响应工具） |

对外 REST API 契约（路径、请求/响应结构）与前端**完全兼容**，前端零改动。

---

## 三、AI 模块代码改动明细（本次迁移）

### 后端（device-platform-server）

#### 1. 整体替换的文件（来自 GitHub 仓库，非 AI 相关）

| 文件 | 说明 |
|---|---|
| `index.js` | 新入口（替换旧 `server.js`） |
| `db.js` | 内置 SQLite 建表 + 种子数据 + scrypt 密码工具 |
| `auth.js` | token 鉴权中间件（替换旧 `middleware/auth.js`） |
| `routes/auth.js`、`brands.js`、`data.js`、`devices.js`、`projects.js`、`upload.js` | 各业务路由（替换旧同名文件） |
| `package.json`、`package-lock.json` | 依赖精简为 3 个包 |
| `DEPLOY.md` | 仓库自带部署指南 |

已删除：旧 `server.js`、`middleware/`、`utils/` 目录。
已备份：旧数据库 → `data.db.old-bak`（旧库仅有初始演示数据、无录入内容，故未迁移数据，新库自动重新播种）。

#### 2. 修改：`index.js`（2 处，为挂载 AI 路由）

**① 引入路由（brandsRouter 之后）：**

```js
const brandsRouter = require('./routes/brands')
const aiRouter = require('./routes/ai')   // ← 新增
```

**② 挂载路由（brands 之后、登录拦截之前）：**

```js
app.use('/api/brands', brandsRouter)
app.use('/api/ai', aiRouter)              // ← 新增，必须放在下面这行之前！
// 以下接口需登录
app.use('/api/upload', auth, uploadRouter)
app.use('/api', auth, dataRouter)
```

> ⚠️ 关键位置说明：新后端用 `app.use('/api', auth, dataRouter)` 对所有未匹配的 `/api/*` 请求强制登录校验。AI 路由**必须挂在这行之前**才不会被 401 拦截。若想反过来要求登录才能用 AI，在 `.env` 设 `AI_REQUIRE_AUTH=1`（ai.js 内部会改用 `auth` 中间件）。

#### 3. 修改：`package.json`（scripts，加载 .env + dev 脚本）

```json
"scripts": {
  "start": "node --env-file-if-exists=.env index.js",
  "dev": "node --env-file-if-exists=.env --watch index.js"
}
```

- `--env-file-if-exists=.env`：启动自动读取 `.env`（文件不存在也不报错）
- 新增 `dev` 脚本：文件修改自动重启

#### 4. 新增：`routes/ai.js`（AI 核心，从旧后端移植并适配）

相比旧版本，为适配新架构做了 4 处适配：

| # | 改动点 | 旧写法 | 新写法 |
|---|---|---|---|
| 1 | 引入数据库 | `const { db } = require('../db')` | `const db = require('../db')`（新 db.js 直接导出 DatabaseSync 实例） |
| 2 | 表名/字段名 | `projects` / `records` / `deviceId` / `createdAt` | `test_projects` / `project_records` / `device_id` / `created_at` 等 snake_case，排序统一 `ORDER BY sort ASC, id ASC` |
| 3 | 鉴权中间件 | `require('../middleware/auth')` 解构 `{ auth }` | `require('../auth')`（新后端 auth.js 直出函数） |
| 4 | 响应格式 | `ok(res,…)` / `fail(res,…)`（utils/respond.js） | 直接 `res.json({ code:0, data })` / `res.json({ code:1, message })`（跟随新后端风格，契约不变） |

其余逻辑保持不变：

1. `buildKnowledge()` —— 读取 6 张表（devices / device_groups / device_items / test_projects / project_records / record_params）拼成中文知识文本
2. `hitLimit(ip)` —— 内存限流：每 IP 每分钟最多 10 次
3. `POST /chat` —— 校验消息 → 组装 system prompt → 转发大模型（60s 超时）→ 返回回答

#### 5. 保留：`.env`（未改动）

```ini
AI_API_KEY=sk-****（DeepSeek）
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
# AI_REQUIRE_AUTH=1   # 可选：置 1 = 需管理员登录才能用 AI
```

### 前端（device-platform）——本次零改动

AI 模块的前端部分沿用旧版，与后端实现无关：

| 文件 | 说明 |
|---|---|
| `src/api/ai.js` | `aiChat(messages)` 接口封装（60s 超时） |
| `src/pages/ai/ai.vue` | 聊天页：欢迎卡片 + 快捷提问 + 气泡对话 + 打字动画 + 本地历史持久化（`ai_chat_history`，最多 50 条） |
| `src/pages.json` | 注册 `pages/ai/ai` 页面 |
| `src/components/tabbar/tabbar.vue` | tabList 第三个 tab「🤖 AI 助手」 |

> 因新后端 REST 契约与旧后端一致（`{code:0,data}` / `{code:!0,message}` / 401 语义），前端无需任何修改。

---

## 四、AI 配置方法

只需配置后端。编辑 `device-platform-server/.env`，保存后重启后端生效：

```ini
AI_API_KEY=你的Key
```

可选配置（都有默认值）：

```ini
# 接口地址（当前 DeepSeek；智谱为 https://open.bigmodel.cn/api/paas/v4）
AI_BASE_URL=https://api.deepseek.com/v1

# 模型名（DeepSeek 用 deepseek-chat；智谱免费版 glm-4-flash）
AI_MODEL=deepseek-chat

# 置 1 = 必须管理员登录后才能使用 AI（公开部署建议开启）
# AI_REQUIRE_AUTH=1
```

> 未配置 Key 时提问返回提示「AI 未配置：……」，属正常现象。

---

## 五、启动方式

**后端**（终端 1）：

```powershell
cd D:\Stu-device-platform\device-platform-server
npm run dev        # 或 npm start；需 Node ≥ 22.13（内置 SQLite）
```

**前端**（终端 2）：

```powershell
cd D:\Stu-device-platform\device-platform
npm run dev:h5
```

访问 http://localhost:5173 → 底部导航「🤖 AI 助手」。

> 新后端首次启动自动创建默认管理员 **admin / admin123**（scrypt 哈希存 `users` 表），并播种演示数据（3 台设备：小米 15 Ultra / 苹果 iPhone 16 Pro Max / 华为 Mate 70 Pro；3 个测试项目：续航 / 充电 / 信号测试）。请登录管理后台后尽快修改密码。

---

## 六、接口契约

### POST /api/ai/chat

**请求**（最多携带 20 条历史，单条 ≤4000 字符）：

```json
{
  "messages": [
    { "role": "user", "content": "库里有哪些设备？" },
    { "role": "assistant", "content": "……" },
    { "role": "user", "content": "电池最大的是哪台？" }
  ]
}
```

**响应**：

```json
{ "code": 0, "data": { "content": "根据数据库快照，共有 3 台设备……" } }
{ "code": 1, "message": "AI 未配置：请在 device-platform-server/.env 中设置 AI_API_KEY 后重启服务" }
{ "code": 429, "message": "提问太频繁，请稍后再试" }   // HTTP 429
```

---

## 七、已验证事项（2026-08-21，迁移后实测）

- ✅ 新后端启动正常（Node 内置 SQLite，默认管理员 admin 已创建）
- ✅ `GET /api/projects`：3 个项目（续航/充电/信号测试）
- ✅ `GET /api/devices`：3 台设备（含新种子数据华为 Mate 70 Pro）
- ✅ `POST /api/ai/chat` 真实对话（DeepSeek）：正确回答「3 台设备，电池最大为小米 15 Ultra 6000mAh」
- ✅ 浏览器端到端：AI 页多轮对话正常，「全部对比」输出完整 Markdown 对比表（基于新库数据）
- ✅ 前端 5173 运行正常，与旧页面（测试数据/手机参数/管理后台）兼容

---

## 八、注意事项与后续建议

1. **API Key 安全**：key 已在对话中暴露过，若是付费账户建议去 platform.deepseek.com 重新生成，替换 `.env` 的 `AI_API_KEY` 后重启后端。
2. **旧数据**：旧库仅演示数据已弃用（备份在 `data.db.old-bak`）；如需找回可用任意 SQLite 工具打开导出。
3. **AI 超时**：DeepSeek 偶发网络抖动会触发 60s 超时提示「AI 响应超时，请重试」，重试即可，属上游问题非代码问题。
4. **升级方向**：流式输出（SSE + `onChunkReceived` 打字机效果）、Markdown 渲染（markdown-it）、数据量大后改 Function Calling 按需查库、公开部署开启 `AI_REQUIRE_AUTH=1`。
