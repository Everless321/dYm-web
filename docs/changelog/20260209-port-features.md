# 2026-02-09 从 dYmanager 移植三项功能

## 待办
- [x] Feature 1: 删除用户时可选同时删除已下载文件
- [x] Feature 2: 新增文件管理页面
- [x] Feature 3: 系统设置下拉框改为自由输入

## 变更

### Feature 1: 删除用户 + 文件清理
- `packages/server/src/database/index.ts`: `deleteUser` 级联删除 posts/task_users 并返回 sec_uid
- `packages/server/src/routes/users.ts`: DELETE 接受 `?deleteFiles=true` 参数，删除用户文件目录
- `packages/web/src/api/client.ts`: `usersApi.delete` 支持 deleteFiles 参数
- `packages/web/src/pages/settings/UsersPage.tsx`: 新增删除确认弹窗 + "同时删除已下载文件"复选框

### Feature 2: 文件管理页
- `packages/server/src/database/index.ts`: `getPostsByUserId` 改为分页查询，新增 `deletePost`/`deletePostsByUserId`
- `packages/server/src/routes/files.ts`: 新建文件管理路由（用户作品列表、目录大小、单条/批量删除）
- `packages/server/src/index.ts`: 注册 files 路由
- `packages/web/src/api/client.ts`: 新增 `filesApi`
- `packages/web/src/pages/settings/FilesPage.tsx`: 新建文件管理页面（用户列表、视频预览、无限滚动、批量删除）
- `packages/web/src/routes/index.tsx`: 添加 `/files` 路由
- `packages/web/src/components/AppLayout.tsx`: 添加"文件管理"导航项

### Feature 3: 下拉框改输入
- `packages/web/src/pages/settings/SystemPage.tsx`: 并发下载数、AI模型、分析并发数、视频切片数 全部从下拉选择器改为自由输入框；移除所有 dropdown state、options 数组和 ChevronDown import

## 结果
- TypeScript 编译零错误
- 8 个文件修改 + 2 个新建文件
