# Cloudflare Dashboard 部署指南（网页端）

## 简单三步部署

### 步骤 1：创建 Worker

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择您的账户
3. 点击左侧菜单的 "Workers & Pages"
4. 点击 "Create application" → "Create Worker"
5. 给您的 Worker 起个名字（例如：`time-tracker`）
6. 点击 "Deploy"

### 步骤 2：粘贴代码

1. 在 Worker 详情页面，点击 "Quick edit" 按钮
2. 删除编辑器中的所有默认代码
3. 复制 `cloudflare-dashboard-version.js` 文件的全部内容
4. 粘贴到编辑器中
5. 点击 "Save and deploy"

### 步骤 3：创建 KV 存储

1. 返回 Cloudflare Dashboard 主页
2. 点击 "Workers & Pages" → "KV"
3. 点击 "Create a namespace"
4. 命名为 `TIME_TRACKER_KV`
5. 点击 "Add"

### 步骤 4：绑定 KV 到 Worker

1. 回到您的 Worker 页面
2. 点击 "Settings" 标签
3. 向下滚动到 "Variables" 部分
4. 点击 "KV Namespace Bindings" 的 "Add binding"
5. 设置：
   - Variable name: `TIME_TRACKER_KV`
   - KV namespace: 选择刚创建的 `TIME_TRACKER_KV`
6. 点击 "Save"

### 完成！

现在您可以访问您的 Worker URL 使用时间追踪应用了：
`https://time-tracker.YOUR-SUBDOMAIN.workers.dev`

## 功能验证

1. **测试计时器**：
   - 点击"开始任务"，输入任务名称
   - 观察计时器开始运行
   - 刷新页面，确认计时器继续运行

2. **测试暂停功能**：
   - 点击"暂停"按钮
   - 计时器应该停止
   - 点击"恢复"继续计时

3. **测试日历**：
   - 完成一个任务
   - 查看日历中是否显示彩色条形图
   - 鼠标悬停查看任务详情

## 注意事项

- 首次部署后可能需要等待几分钟让 KV 绑定生效
- 如果遇到错误，检查 Worker 日志（在 Worker 页面的 "Logs" 标签）
- 免费版每天有 100,000 次请求限制

## 故障排除

### 问题：页面显示但功能不工作
**解决**：确认 KV namespace 已正确绑定，变量名必须是 `TIME_TRACKER_KV`

### 问题：任务无法保存
**解决**：检查 KV 存储是否创建成功，在 KV 页面查看是否有数据

### 问题：时间显示不正确
**解决**：这是正常的，应用会自动转换为您的本地时区

## 可选：自定义域名

1. 在 Worker 页面点击 "Triggers"
2. 点击 "Add Custom Domain"
3. 输入您的域名
4. 按照提示完成 DNS 配置