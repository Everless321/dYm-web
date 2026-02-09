# dYmanager Web

抖音视频管理工具 Web 版 —— 用户同步、批量下载、AI 分析，一键 Docker 部署。

## 功能

- **用户管理** — 添加抖音用户，自动抓取头像 / 签名 / 作品列表
- **定时同步** — Cron 表达式配置，自动同步用户最新作品
- **批量下载** — 创建下载任务，多用户批量下载视频 / 图集
- **作品浏览** — 瀑布流展示，按用户 / 标签 / 类型筛选，内置媒体播放器
- **AI 分析** — 接入 Grok Vision API，自动分析视频内容并生成标签
- **实时推送** — WebSocket 实时推送同步进度、下载状态
- **密码鉴权** — 登录保护，支持环境变量或自动生成密码

## 快速部署 (Docker)

**镜像支持 `linux/amd64` 和 `linux/arm64` (Mac M 系列)。**

```bash
docker run -d \
  --name dym-web \
  -p 4000:4000 \
  -e DYM_PASSWORD=your_password \
  -v /path/to/data:/data \
  everless/dym-web:latest
```

启动后访问 `http://localhost:4000`，输入密码登录。

### 不设置密码

不传 `DYM_PASSWORD` 时，首次启动自动生成随机密码，通过日志查看：

```bash
docker logs dym-web
# ========================================
# [Auth] 自动生成密码: a1b2c3d4e5f6
# ========================================
```

### 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DYM_DATA_DIR` | Docker 内置 | `/data` | 数据存储目录 (SQLite + 下载文件) |
| `DYM_PASSWORD` | 否 | 自动生成 | 登录密码 |
| `PORT` | 否 | `4000` | 服务端口 |

### 数据持久化

所有数据存储在 `/data` 目录下，通过 `-v` 挂载到宿主机：

```
/data/
├── data.db           # SQLite 数据库
└── Download/
    └── post/         # 下载的视频 / 图片文件
        └── {sec_uid}/
            └── {folder_name}/
```

### Docker Compose

```yaml
services:
  dym-web:
    image: everless/dym-web:latest
    ports:
      - "4000:4000"
    environment:
      - DYM_PASSWORD=your_password
    volumes:
      - ./data:/data
    restart: unless-stopped
```

```bash
docker compose up -d
```

## 本地开发

### 环境要求

- Node.js >= 20
- pnpm

### 安装与启动

```bash
# 克隆仓库
git clone https://github.com/Everless321/dYm-web.git
cd dYm-web

# 安装依赖
pnpm install

# 重建原生模块
cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npx node-gyp rebuild && cd -

# 修复 ffmpeg/ffprobe 权限 (macOS)
chmod +x node_modules/.pnpm/@ffprobe-installer+darwin-arm64@*/node_modules/@ffprobe-installer/darwin-arm64/ffprobe
chmod +x node_modules/.pnpm/@ffmpeg-installer+darwin-arm64@*/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg

# 启动后端 (终端 1)
DYM_DATA_DIR=./data pnpm dev:server

# 启动前端 (终端 2)
pnpm dev:web
```

前端默认 `http://localhost:5173`，自动代理 `/api`、`/ws`、`/media` 到后端 4000 端口。

### 构建

```bash
pnpm build
node packages/server/dist/server/src/index.js
```

生产模式下后端同时服务前端静态文件，无需单独部署。

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Fastify 5 + better-sqlite3 + @fastify/websocket + node-cron |
| 前端 | Vite 7 + React 19 + react-router-dom + shadcn/ui + Tailwind CSS 4 |
| 共享 | TypeScript 5, pnpm monorepo |
| 下载 | [dy-downloader](https://github.com/Everless321/dyDownload) |
| 视频处理 | fluent-ffmpeg (ffmpeg/ffprobe 内置) |
| AI | Grok Vision API |

## 项目结构

```
packages/
├── shared/src/
│   └── types.ts                # 共享类型 (DB models, API types, WS events)
├── server/src/
│   ├── index.ts                # Fastify 入口，插件注册，前端静态服务
│   ├── database/index.ts       # SQLite schema, CRUD, migrations
│   ├── services/
│   │   ├── auth.ts             # 密码验证 + Token 管理
│   │   ├── douyin.ts           # 抖音 API 封装 (dy-downloader)
│   │   ├── syncer.ts           # 用户视频列表同步
│   │   ├── downloader.ts       # 批量视频下载
│   │   ├── scheduler.ts        # node-cron 定时任务调度
│   │   └── analyzer.ts         # Grok Vision AI 视频分析
│   ├── routes/
│   │   ├── auth.ts             # 登录 / Token 验证
│   │   ├── users.ts            # 用户 CRUD + 设置
│   │   ├── tasks.ts            # 下载任务 CRUD
│   │   ├── posts.ts            # 作品列表 + 媒体文件
│   │   ├── download.ts         # 下载控制
│   │   ├── sync.ts             # 同步控制 + cron
│   │   ├── analysis.ts         # AI 分析控制
│   │   ├── settings.ts         # 全局设置
│   │   └── system.ts           # 系统信息 + Grok 验证
│   └── ws/index.ts             # WebSocket 广播
└── web/src/
    ├── api/client.ts           # HTTP 客户端 (自动注入 Token)
    ├── hooks/useWebSocket.ts   # WebSocket 单例 + useWsChannel
    ├── pages/
    │   ├── LoginPage.tsx       # 登录页
    │   ├── HomePage.tsx        # 作品瀑布流
    │   └── settings/
    │       ├── UsersPage.tsx   # 用户管理
    │       ├── DownloadPage.tsx# 下载任务
    │       ├── TaskDetailPage.tsx
    │       ├── AnalysisPage.tsx# AI 分析
    │       ├── SystemPage.tsx  # 系统设置
    │       └── LogsPage.tsx    # 调度日志
    └── components/
        ├── AppLayout.tsx       # 侧边栏布局
        ├── MediaViewer.tsx     # 媒体查看器
        └── ui/                 # shadcn/ui 组件库
```

## API 概览

所有接口需要 `Authorization: Bearer <token>` 头，除登录接口外。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录，返回 token |
| GET | `/api/auth/check` | 验证 token |
| GET | `/api/users` | 用户列表 |
| POST | `/api/users` | 添加用户 (传入抖音主页链接) |
| GET | `/api/posts?page=&pageSize=&filters=` | 作品列表 (分页 + 筛选) |
| GET | `/api/tasks` | 下载任务列表 |
| POST | `/api/download/:taskId/start` | 开始下载 |
| POST | `/api/sync/:userId/start` | 开始同步 |
| POST | `/api/analysis/start` | 开始 AI 分析 |
| GET | `/api/settings` | 全局设置 |
| WS | `/ws` | 实时事件推送 |

## 使用流程

1. **设置 Cookie** — 进入 系统设置，填入抖音 Cookie
2. **添加用户** — 粘贴抖音主页链接，自动解析并同步作品列表
3. **浏览作品** — 首页瀑布流查看所有已同步作品
4. **创建下载任务** — 选择用户，创建批量下载任务
5. **定时同步** — 为用户配置 Cron 表达式，自动增量同步
6. **AI 分析** — 配置 Grok API Key，自动分析视频内容生成标签

## License

MIT
