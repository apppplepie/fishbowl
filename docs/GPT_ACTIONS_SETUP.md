# GPT Actions 集成指南

允许 ChatGPT 通过 API 直接发布文章和图片到你的 Fishbowl 博客。

---

## 🚀 快速开始

### 1. 初始化 ChatGPT 用户

运行脚本创建 `chatgpt` 用户并生成 API Key：

```bash
npm run gpt:init
```

脚本会自动：
- 创建 `chatgpt` 用户（moderator 权限）
- 生成随机 API Key
- 自动配置到 `.env.local`

**输出示例：**
```
✅ 新用户创建成功: chatgpt (ID: xxx)
🔑 生成的 API Key 配置:
   GPT_API_KEYS=gpt-sk-xxxxxxxxxx:user-id-here
```

### 2. 重启开发服务器

环境变量变更需要重启 Next.js：

```bash
npm run dev
```

### 3. 验证 API

测试 OpenAPI Schema 是否正常：
```bash
curl http://localhost:3000/api/gpt/openapi
```

---

## 📋 GPT Builder 配置步骤

### 步骤 1：打开 GPT Builder

访问：https://chat.openai.com/gpts

创建新 GPT 或编辑现有 GPT。

### 步骤 2：配置 Actions

1. 点击 **"Configure"** 标签页
2. 找到 **"Actions"** 部分
3. 点击 **"Add an action"**

### 步骤 3：导入 OpenAPI Schema

在 **"Import OpenAPI schema from URL"** 中填入：

```
https://your-domain.com/api/gpt/openapi
```

*(本地测试用 ngrok 等工具转发)*

点击 **"Import"**。

### 步骤 4：配置认证

1. 在 **"Authentication"** 下拉框选择 **"API Key"**
2. **Auth Type**: 选择 **"Bearer"**
3. **API Key**: 填入 `npm run gpt:init` 生成的 Key
4. 点击 **"Save"**

### 步骤 5：配置 GPT Instructions

在 **"Instructions"** 中添加：

```
你是 Fishbowl 博客的 AI 作者助手。你的任务是帮助用户创作和发布文章。

## 能力
- 根据用户的想法撰写完整的中文文章
- 自动为文章生成合适的标签和摘要
- 可以选择合适的分类发布文章
- 可以配合 DALL-E 生成配图并上传发布

## 工作流程
1. 理解用户的文章主题
2. 如果需要配图，先调用 DALL-E 生成图片
3. 将生成的图片转为 Base64 格式调用 uploadImage 上传
4. 获取文章分类列表（如果用户没有指定）
5. 组织内容块，调用 publishArticle 发布
6. 返回文章链接给用户

## 内容规范
- 所有文章使用中文撰写
- 段落清晰，每段不超过 300 字
- 标签应该精准，3-5 个为宜
- 图片要与文章内容相关
- 默认分类根据内容自动选择最合适的

## 重要提示
- 发布前请确认文章标题和内容
- 图片上传后使用返回的 url 字段填入文章
- 始终返回最终文章的访问链接
```

### 步骤 6：测试

在 GPT Builder 中测试：
> "帮我写一篇关于人工智能发展的短文"

GPT 应该会调用 `publishArticle` 接口并返回文章链接。

---

## 🔌 API 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/gpt/openapi` | OpenAPI Schema 定义 |
| `GET` | `/api/gpt/categories` | 获取分类列表 |
| `POST` | `/api/gpt/upload` | 上传图片（Base64） |
| `POST` | `/api/gpt/articles` | 发布文章 |

---

## 📝 请求示例

### 发布文章

```json
POST /api/gpt/articles
Authorization: Bearer gpt-sk-xxxxxxxxxx

{
  "title": "ChatGPT 4o 发布：多模态能力大幅提升",
  "content": [
    {
      "type": "text",
      "content": "OpenAI 于近日正式发布了 ChatGPT 4o，这是迄今为止能力最强的多模态模型..."
    },
    {
      "type": "image",
      "imageUrl": "/uploads/2025/01/xxx.jpg",
      "title": "ChatGPT 4o Logo",
      "description": "全新的多模态界面"
    }
  ],
  "tags": ["AI", "ChatGPT", "技术动态"],
  "category_id": "cat-tech"
}
```

### 上传图片

```json
POST /api/gpt/upload
Authorization: Bearer gpt-sk-xxxxxxxxxx

{
  "base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "filename": "screenshot.png"
}
```

---

## 🔐 安全说明

1. **API Key 保密**：不要将 API Key 提交到 Git 或公开分享
2. **最小权限**：GPT 用户仅授予 `moderator` 权限，不是管理员
3. **环境变量**：密钥存储在 `.env.local`，已在 `.gitignore` 中排除
4. **请求日志**：所有 GPT 操作都会记录日志，便于审计

### 轮换 API Key

重新运行初始化脚本即可生成新 Key：
```bash
npm run gpt:init
```

### 多 GPT 配置

支持多个 GPT 实例使用不同的 API Key（对应不同用户）：

```env
# .env.local
GPT_API_KEYS=key1:user-id-1,key2:user-id-2,key3:user-id-3
```

---

## 🐛 故障排查

### 问题：GPT 不调用 Action

**解决方案：**
1. 检查 Schema 是否正确导入
2. 检查 API Key 认证配置
3. 在 Instructions 中明确说明可以调用这些功能

### 问题：图片上传失败

**原因：** GPT Actions JSON 大小有限制，大图片 Base64 编码后会超限

**解决方案：**
- 压缩图片后再上传
- 建议图片尺寸不超过 1024x1024
- 使用 WebP 格式

### 问题：认证失败

**检查：**
1. `.env.local` 中的 `GPT_API_KEYS` 格式正确
2. 用户 ID 存在于数据库
3. 用户角色是 `moderator` 或 `admin`

### 问题：本地测试无法访问

ChatGPT 无法直接访问 `localhost`。解决方案：
- 使用 `ngrok` 或类似工具转发
- 部署到可公开访问的服务器

```bash
# 使用 ngrok
ngrok http 3000
```

然后使用 ngrok 提供的 HTTPS URL。

---

## 📚 文件清单

新增/修改的文件：

```
lib/
├── gptAuth.ts           # GPT 认证逻辑
└── articleUtils.ts      # 文章发布公共逻辑

app/api/gpt/
├── openapi/route.ts     # OpenAPI Schema
├── categories/route.ts  # 分类列表
├── upload/route.ts      # 图片上传
└── articles/route.ts    # 文章发布

scripts/
└── init-gpt-user.ts     # 初始化脚本

docs/
└── GPT_ACTIONS_SETUP.md # 本说明文档
```

---

## ✨ 高级特性

### 自定义 GPT 用户

可以为不同的 GPT 创建不同的用户账号，便于区分作者：

```sql
INSERT INTO users (id, username, email, ...) VALUES
('user-id-1', 'gpt-writer', 'gpt-writer@...', ...),
('user-id-2', 'gpt-artist', 'gpt-artist@...', ...);
```

然后配置多个 API Key：
```env
GPT_API_KEYS=key-for-writer:user-id-1,key-for-artist:user-id-2
```

### 草稿模式

让 GPT 先存为草稿，人工审核后再发布：

```json
{
  "title": "...",
  "content": [...],
  "status": "draft"
}
```

---

## 📄 License

本功能是 Fishbowl Blog 的内置扩展，遵循主项目协议。
