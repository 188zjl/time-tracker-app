# 部署指南

## 快速开始

### 1. 前置要求
- Node.js 16+ 已安装
- Cloudflare 账号
- Wrangler CLI（会自动安装）

### 2. 安装步骤

```bash
# 1. 进入项目目录
cd time-tracker

# 2. 安装依赖
npm install

# 3. 登录 Cloudflare
npx wrangler login

# 4. 创建 KV 命名空间
npx wrangler kv:namespace create "TIME_TRACKER_KV"
# 记录输出的 id

npx wrangler kv:namespace create "TIME_TRACKER_KV" --preview
# 记录输出的 preview_id
```

### 3. 配置 KV 命名空间

编辑 `wrangler.toml`，替换 KV namespace IDs：

```toml
[[kv_namespaces]]
binding = "TIME_TRACKER_KV"
id = "你的实际ID"
preview_id = "你的预览ID"
```

### 4. 本地测试

```bash
# 启动开发服务器
npm run dev

# 在浏览器中访问 http://localhost:8787
# 打开 test-debug.html 进行调试测试
```

### 5. 部署到生产环境

```bash
npm run deploy
```

## 调试诊断

### 问题诊断流程

1. **打开调试页面**
   - 访问 `http://localhost:8787/test-debug.html`
   - 运行所有测试，确认环境支持

2. **检查主要问题源**
   
   **问题源 1: Cloudflare Workers 环境限制**
   - 症状：某些 API 调用失败
   - 验证：查看 Worker 日志中的 `[WORKER]` 标签
   - 解决：使用兼容的 API 或降级方案

   **问题源 2: 计时器状态持久化**
   - 症状：刷新页面后计时器重置
   - 验证：
     ```javascript
     // 在控制台检查
     localStorage.getItem('currentTask')
     // 查看 [RESTORE] 日志
     ```
   - 解决：确保 localStorage 未被禁用

3. **查看实时日志**
   - 应用页面顶部的黄色调试面板
   - 浏览器控制台的详细日志
   - Wrangler 开发服务器的输出

### 常见问题解决

#### 1. KV 存储连接失败
```bash
# 检查 KV 绑定
npx wrangler kv:namespace list

# 验证配置
cat wrangler.toml | grep TIME_TRACKER_KV
```

#### 2. 静态文件 404 错误
```bash
# 确保文件在 public 目录
ls public/

# 检查 wrangler.toml 的 site 配置
[site]
bucket = "./public"
```

#### 3. Web Worker 不支持
- 降级到 setInterval（自动）
- 查看 `[WORKER]` 日志确认降级

#### 4. 时区显示错误
- 检查浏览器时区设置
- 验证 UTC 存储是否正确

## 生产环境配置

### 1. 禁用调试模式

编辑 `public/app.js`:
```javascript
const DEBUG = false; // 改为 false
```

编辑 `wrangler.toml`:
```toml
[env.production]
vars = { DEBUG = "false" }
```

### 2. 设置自定义域名

```bash
# 添加自定义域名
npx wrangler domains add your-domain.com
```

### 3. 监控和日志

- 访问 Cloudflare Dashboard 查看：
  - Workers 分析
  - KV 存储使用情况
  - 错误日志

### 4. 性能优化

- 启用 Cloudflare 缓存
- 压缩静态资源
- 使用 Workers 路由优化

## 备份和恢复

### 导出数据
```bash
# 列出所有任务
npx wrangler kv:key list --namespace-id=your-namespace-id

# 导出特定数据
npx wrangler kv:key get "tasks" --namespace-id=your-namespace-id > backup.json
```

### 恢复数据
```bash
# 恢复任务数据
npx wrangler kv:key put "tasks" --namespace-id=your-namespace-id < backup.json
```

## 安全建议

1. **限制 CORS**（生产环境）
   ```javascript
   // 在 worker.js 中修改
   'Access-Control-Allow-Origin': 'https://your-domain.com'
   ```

2. **添加速率限制**
   - 使用 Cloudflare Rate Limiting
   - 或在 Worker 中实现

3. **数据验证**
   - 验证任务名称长度
   - 防止 XSS 攻击

## 故障恢复

如果应用出现问题：

1. **检查 Worker 状态**
   ```bash
   npx wrangler tail
   ```

2. **验证 KV 数据**
   ```bash
   npx wrangler kv:key list --namespace-id=your-namespace-id
   ```

3. **回滚部署**
   ```bash
   # 查看部署历史
   npx wrangler deployments list
   
   # 回滚到之前版本
   npx wrangler rollback
   ```

## 支持

- 查看 README.md 了解功能详情
- 检查 test-debug.html 进行诊断
- Cloudflare Workers 文档：https://developers.cloudflare.com/workers/