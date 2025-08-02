# 时间追踪应用

一个部署在 Cloudflare Workers 上的极简时间追踪应用，具有持久化计时器和可视化日历功能。

## 功能特点

- **三个核心按钮**：
  - 开始任务：创建并命名新任务
  - 暂停/恢复：控制当前任务的计时器
  - 停止并记录：结束任务并保存数据

- **持久化计时器**：
  - 使用 Web Workers API 实现精确计时
  - 页面刷新后自动恢复状态
  - 本地存储和服务器同步双重保障

- **可视化日历**：
  - 月视图显示每日任务
  - 彩色条形图表示不同任务
  - 悬停显示任务详情和持续时间
  - 支持月份导航

- **数据存储**：
  - 使用 Cloudflare KV 存储所有任务数据
  - UTC 时间戳存储，本地时区显示

## 调试功能

应用包含详细的调试日志系统，可以追踪以下问题：

### 1. Cloudflare Workers 环境限制
- **日志位置**：`[WORKER]` 标签
- **监控内容**：Worker 初始化、API 限制、静态文件处理
- **常见问题**：某些浏览器 API 在 Workers 环境中不可用

### 2. 计时器状态持久化
- **日志位置**：`[STATE]`、`[RESTORE]`、`[TIMER]` 标签
- **监控内容**：
  - localStorage 保存/恢复
  - 服务器状态同步
  - Web Worker 计时器状态
- **验证点**：
  - 页面刷新时检查控制台日志
  - 查看调试面板中的状态恢复信息

### 3. KV 存储操作
- **日志位置**：`[TASK]`、`[CALENDAR]` 标签
- **监控内容**：任务创建、更新、查询操作
- **错误处理**：网络失败时的降级策略

### 4. 时区处理
- **日志位置**：时间相关的所有操作
- **验证**：检查存储的 UTC 时间和显示的本地时间

## 安全配置 (重要)

为了保护您的凭据安全，该应用使用 Cloudflare Workers 的环境变量进行身份验证，而不是将密码硬编码在代码中。

**请在 Cloudflare Dashboard 中设置以下环境变量：**

1.  登录到您的 Cloudflare 账户并导航到 Workers & Pages。
2.  选择 `time-tracker` Worker。
3.  进入 **Settings** -> **Variables**。
4.  添加以下两个环境变量：
    *   **`AUTH_USERNAME`**: 您的登录用户名 (例如：`admin`)
    *   **`AUTH_PASSWORD`**: 您的登录密码 (例如：`wearefamily114514`)

**注意**: 请务必使用强密码，并定期更换。

## 部署步骤

1. **安装依赖**：
   ```bash
   cd time-tracker
   npm install
   ```

2. **创建 KV 命名空间**：
   ```bash
   wrangler kv:namespace create "TIME_TRACKER_KV"
   wrangler kv:namespace create "TIME_TRACKER_KV" --preview
   ```

3. **更新 wrangler.toml**：
   将生成的 KV namespace ID 替换到配置文件中：
   ```toml
   [[kv_namespaces]]
   binding = "TIME_TRACKER_KV"
   id = "your-actual-kv-namespace-id"
   preview_id = "your-preview-kv-namespace-id"
   ```

4. **本地开发**：
   ```bash
   npm run dev
   ```

5. **部署到 Cloudflare**：
   ```bash
   npm run deploy
   ```

## 调试模式

应用默认启用调试模式，会在页面顶部显示调试面板。要禁用调试模式：

1. 在 `public/app.js` 中设置 `DEBUG = false`
2. 在 `wrangler.toml` 中移除或设置 `DEBUG = "false"`

## 故障排除

### 计时器不准确
- 检查 `[WORKER]` 日志确认 Web Worker 是否正常初始化
- 验证浏览器是否支持 Web Workers API
- 查看是否降级到 setInterval 备用方案

### 状态未恢复
- 检查 `[RESTORE]` 日志查看恢复过程
- 验证 localStorage 是否被清除
- 确认服务器端 KV 存储是否有数据

### 日历显示问题
- 检查 `[CALENDAR]` 日志确认数据加载
- 验证时区转换是否正确
- 查看任务颜色生成算法

## 技术栈

- **后端**：Cloudflare Workers
- **存储**：Cloudflare KV
- **前端**：原生 JavaScript + Tailwind CSS
- **计时器**：Web Workers API
- **持久化**：localStorage + KV 双重保障

## 注意事项

1. Cloudflare Workers 免费版有请求限制（每日 100,000 次）
2. KV 存储有大小限制（单个值最大 25MB）
3. Web Workers 在某些旧浏览器中可能不支持
4. 确保浏览器允许 localStorage 访问

## 许可证

MIT License