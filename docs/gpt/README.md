# GPT Actions 集成说明

允许 ChatGPT 通过 API 直接发布文章到 Fishbowl 博客。

---

## 📋 功能清单

| 功能 | 接口 | 说明 |
|------|------|------|
| 获取分类 | `GET /api/gpt/categories` | 获取所有分类，GPT 智能选择发布位置 |
| 发布文章 | `POST /api/gpt/publish` | AI 一键发文，自动下载图片、处理块、标签 |

---

## 🔐 认证方式

**API Key (Bearer Token)**

在 `.env.local` 中配置：
```env
# GPT Actions 专用发布 Token（必填）
GPT_PUBLISH_TOKEN=你的密钥（长随机字符串）

# GPT 发布文章时使用的作者 ID（必填，chatgpt 用户的数据库 ID）
GPT_AUTHOR_USER_ID=uuid-chatgpt-user-1234567890abcdef
```

生成 Token 建议（可选）：
```bash
# 生成一个 40 位随机字符串作为 Token
openssl rand -hex 20
```

---

## 📊 数据库初始化

创建 chatgpt 用户（执行以下 SQL）：

```sql
USE fishbowlserver;

INSERT INTO users (id, username, email, password_hash, display_name, role, status, email_verified, max_access_level)
VALUES (
  'uuid-chatgpt-user-1234567890abcdef',
  'chatgpt',
  'chatgpt@fishbowl.local',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'ChatGPT 助手',
  'moderator',
  'active',
  1,
  5
);
```

⚠️ **重要**：把上面这个 ID 填到 `.env.local` 的 `GPT_AUTHOR_USER_ID` 里。

---

## 🧩 OpenAPI Schema

### 方式一：动态导入（推荐）
```
https://你的域名/api/gpt/openapi
```
一次导入包含所有接口

### 方式二：分别导入（更清晰）
GPT 支持导入多个独立的 Action，可以分别导入：

- 获取分类：[get-categories.yaml](./get-categories.yaml)
- 发布文章：[publish-article.yaml](./publish-article.yaml)

动态地址：
- `https://你的域名/api/gpt/openapi` （全部）
- 静态文件都在 `docs/gpt/` 目录下

---

## 💬 GPT 提示词（Instructions）

完整提示词复制到 GPT Builder：

```
你是 Fishbowl 博客的 AI 作者助手。

## 你的工作流程
1. 如果用户没指定分类，先调用 getCategories 获取所有可用分类列表
2. 根据用户的想法，写一篇中文文章
3. 选择一个最合适的分类（如果不确定，就不传 category_id，自动发杂物间）
4. 如果需要配图，先调用 DALL-E 生成图片，拿到图片 URL
5. 调用 publishArticle 接口发布文章
6. 发布成功后把文章链接返回给用户

## ⚠️ publishArticle 接口使用规则
- category_id: 从 getCategories 里选合适的 id，不填就自动去杂物间
- content: 纯文本 Markdown，绝对不要用 ![](url) 插入图片
- images: 所有图片放这里，格式 [{ url: "图片链接", name: "图片标题" }]
- tags: 3-5 个相关标签

## 注意
- content 里永远不要出现 ![...] 这种图片语法！
- 服务器会自动下载 images 里的所有图片，插入到段落之间
- 分类选不准就不要传 category_id，默认去杂物间是安全的
- 调用完接口直接给用户链接，不要让用户等
```

---

## 📁 相关文件位置

```
app/api/gpt/
├── openapi/route.ts       # OpenAPI Schema 动态生成
├── categories/route.ts    # 获取分类列表
└── publish/route.ts       # 发布文章（核心）

lib/
└── gptAuth.ts             # API Key 认证

docs/gpt/
├── README.md              # 本文件
└── openapi.yaml           # Schema 静态备份
```

---

## 🔄 工作流程

```
GPT 调用 getCategories → 获取分类列表
        ↓
用户说"写一篇关于XX的文章"
        ↓
GPT 构思内容，决定分类
        ↓
需要配图 → DALL-E 生成图片
        ↓
GPT 调用 publishArticle
        ├── title
        ├── content (纯文本 Markdown)
        ├── category_id (可选)
        ├── images: [{ url, name }]
        └── tags
        ↓
🌐 服务器接收请求
        ├── 认证 API Key
        ├── 解析内容为文本块
        ├── 并行下载所有图片
        ├── 智能插入图片到段落之间
        ├── 处理分类（没有就创建杂物间）
        ├── 处理标签（复用或新建）
        └── 写入数据库发布
        ↓
✅ 返回文章链接
```

---

## 🎛️ 配置清单

| 步骤 | 状态 | 说明 |
|------|------|------|
| 1. 执行 SQL 创建 chatgpt 用户 | ⬜ | |
| 2. 配置 `.env.local` API Key | ⬜ | |
| 3. 重启 Next.js | ⬜ | |
| 4. GPT Builder 导入 Schema | ⬜ | `https://你的域名/api/gpt/openapi` |
| 5. GPT Builder 配置 Bearer Token | ⬜ | |
| 6. 粘贴 Instructions 提示词 | ⬜ | |
| 7. 测试发布 | ⬜ | |

---

## 🐛 常见问题

### Q: 图片下载失败？
A: 检查 DALL-E 生成的 URL 是否可以公网访问，有些链接有过期时间。

### Q: 分类不对？
A: GPT 会根据内容智能选择，选不准就自动去杂物间，你可以手动在后台调整。

### Q: 想加其他功能？
A: 可以扩展：编辑文章、删除文章、获取文章列表、评论等。
