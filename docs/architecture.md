# 未遇：代码结构与阅读顺序

## 从哪里开始

从 `app.tsx` 的页面选择进入对应 `pages/`。界面调用 `store.ts`，服务端在 `worker.tsx` 和 `auth-routes.ts` 处理；动态和账户的边界不要放进展示组件。

## 目录职责

- `src/client.tsx`：客户端入口与水合。
- `src/app.tsx`：导航外壳、页面选择、账户同步与标题更新。
- `src/navigation.ts`：路径跳转和导航菜单。
- `src/pages/Square.tsx`：动态列表、卡片、场景与右栏。
- `src/pages/Match.tsx`、`Messages.tsx`、`Profile.tsx`：匹配、消息与个人页。
- `src/components/Avatar.tsx`、`Brand.tsx`：共用头像与品牌组件。
- `src/components/Modals.tsx`：发帖、评论、资料与账户弹窗入口。
- `src/auth-ui.tsx`：认证表单与账户管理界面。
- `src/store.ts`：页面状态、请求与刷新；`src/data.ts`：演示数据和领域规则。
- `src/server/worker.tsx`：SSR、访客空间、状态接口。
- `src/server/auth-routes.ts`、`auth.ts`：认证路由、密码、会话与恢复码。
- `migrations/`：数据库迁移；`tests/`：SSR、访客隔离与账户生命周期。

## 修改约定

- 页面入口负责组合，功能放在对应组件或模块；共享规则放到领域/状态层。
- 浏览器操作在事件或客户端初始化中执行，保证服务端渲染时可安全导入。
- 每个请求或应用实例保有自己的状态；不要引入跨用户的全局可变状态。
- 保持现有接口、持久化键、权限和业务行为；数据库变化新增迁移。
- 修改源码后运行 `npm run format`；提交前运行 `npm run format:check`、`npm run build` 和 `npm test`。
- 格式由 `.prettierrc.json` 与 `.editorconfig` 统一，生成资源不手工编辑。
