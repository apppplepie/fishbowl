# Fishbowl + ChatGPT tools v4

实现三个内容操作：GPT 判断语义，Fishbowl 执行有权限、有版本检查的数据库写入。不在服务端自动调用模型，不需要新增 OpenAI API key。

| 核心 tool | 接口 | 作用 |
|---|---|---|
| curateArticle | POST /api/gpt/curate | tags、summary、excerpt、有限 metadata、block 重排/无损拆段 |
| saveRatedArticle | POST /api/gpt/save-rated | 按 block 分级新建草稿/发布；已有文章发布/撤回 |
| attachArticleImages | POST /api/gpt/illustrate | 在指定 block 后关联已有 media，可选择封面 |

辅助操作复用/扩展已有 API：getArticle、searchArticles、getCategories；新增 getEditorialContext（tags、评级、身份能力）、registerImage（HTTPS 图片登记）。旧 upload 保留。

## 部署

1. 在目标 **light 已有数据库**执行 [增量迁移](../../scripts/migrations/20260906-gpt-content-tools.sql)。只新增 gpt_article_details 和 gpt_requests，不改旧文章。
   - 仓库 db:init 是早期结构，不包含完整 users/tags/media/访问等级，不能当作当前项目全量迁移。
   - 外键要求 articles.id 为 VARCHAR(36)、utf8mb4_unicode_ci，与仓库基础结构一致。先 SHOW FULL COLUMNS FROM articles；若线上使用其他字符集/排序规则，使迁移中的 article_id 与其一致后执行。不要因此批量修改线上文章表。
2. 沿用 Bearer key：GPT_API_KEYS=key:userId，或 GPT_PUBLISH_TOKEN + GPT_AUTHOR_USER_ID。用户必须真实存在、status=active，角色 admin/moderator。
   - admin 可管理其他作者旧文；moderator 只管理自己的文章，沿用 canEditArticle。
   - 都受 max_access_level 限制。整理全站 A/R 文章需显式绑定合适用户；不会自动升级 GPT 用户。
3. 设置 GPT_SITE_URL=https://creepender.top（代理后的公开地址）。远程图片需设置 GPT_IMAGE_ALLOWED_HOSTS=实际生成服务图片域名,实际CDN域名，不支持通配符。为空时禁止远程导入，仍可关联已上传 media。
4. 安装依赖、构建，按现有方式部署分支。本任务没有部署服务器或修改生产文章。
5. 更新 Actions OpenAPI 和 [Instructions](instructions.md)。导入完整 /api/gpt/openapi（JSON OpenAPI），或独立版本：

| 用途 | YAML | 动态地址 |
|---|---|---|
| 整理 | [curate-tool.yaml](curate-tool.yaml) | /api/gpt/openapi?tool=curate |
| 分级发布 | [publish-tool.yaml](publish-tool.yaml) | /api/gpt/openapi?tool=publish |
| 配图 | [illustrate-tool.yaml](illustrate-tool.yaml) | /api/gpt/openapi?tool=illustrate |
| 全部 | [openapi.yaml](openapi.yaml) | /api/gpt/openapi |

每份独立 YAML 包含一个核心写操作和必要 helper；重复 helper 不必在同一 GPT 中重复导入。静态模板使用 creepender.top，其他部署请替换 servers.url 或用动态导入。

## 最短调用例子

先 GET /api/gpt/articles/文章ID，获取 revision、block IDs、tags、status；按 next 读完正文。

整理（tags 默认追加）：

```json
{"article_ref":"文章ID","expected_revision":"读取到的revision","request_id":"curate-unique-001","tags":["Docker","后端"],"summary":"中性简介"}
```

分级保存（省略 status 创建 draft）：

```json
{"request_id":"publish-unique-001","title":"一篇文章","summary":"公开可展示的简介","rating_reason":"第一段一般内容，第二段需要成人访问权限。","tags":["故事"],"blocks":[{"type":"text","content":"引言","access_level":1},{"type":"text","content":"需要分级的原文内容","access_level":4}]}
```

发布已有草稿，不新建第二篇：

```json
{"article_ref":"草稿ID","expected_revision":"最新revision","request_id":"status-unique-001","status":"published"}
```

图片生成服务返回真实 URL，POST /api/gpt/media {"url":"https://已配置域名/image.png"} 得到 media_id，然后：

```json
{"article_ref":"文章ID","expected_revision":"最新revision","request_id":"image-unique-001","images":[{"media_id":"登记返回的ID","after_block_id":"已有block的ID","description":"这幅图说明什么","prompt":"实际生成描述","access_level":4}]}
```

新文章图片块也传 media_id、type=image、access_level。生成属于外部能力；Actions 不能凭空取得 ChatGPT 附件字节或稳定公网 URL。旧 upload 支持 data URL，但大图 base64 往往超过 Actions 请求限制，不能让模型手写 base64。

## 兼容性变化

- 保留 POST /moments、/publish、/articles、/upload。旧发布未指定评级仍为 1，保持原发布行为；新 GPT 应用明确评级、默认 draft 的 saveRatedArticle。
- GET /articles 和 /articles/{id} 复用路径，升级为 v4：角色/作者/等级检查、精简结果、分页和 revision。旧 limit/category/sort 不属 v4 列表契约；详情改为原始 JSON 分页。旧消费者需更新，不能把切片当全文。
- 原 /articles/today、评论接口仍在，没有纳入新 schema；本次未重做评论系统。
- 旧远程图片发布同样受 HTTPS、域名和 5 MB 限制。站内完整 URL 由 GPT_SITE_URL 识别，不下载自己。旧 upload 的 filename 不作为磁盘路径。
- summary 在旁表独立保存，前端仍用 excerpt。旧文初次读取 summary 可为 null。
- 静态/动态 schema 源是 lib/gptOpenapi.ts；npm run gpt:schema 生成文件。publish-article.yaml 是旧协议参考，不是新发布 tool。

## 测试

```powershell
npm ci
npm run gpt:schema
npm run test:gpt          # 无测试库时只运行契约测试，明确 skip 集成测试
.\scripts\test-gpt.ps1   # Docker MySQL 8.4，随机本机端口，独立测试库，自动清理容器
npx tsc --noEmit
npm run build
```

Linux/CI 可启动独立 MySQL，把 FISHBOWL_TEST_DB=1、DB_HOST=127.0.0.1、DB_NAME=fishbowl_tools_test 和测试凭据/端口传给 npm run test:gpt。测试拒绝其他库名和远程主机。fixture 仅供测试，**不是生产 schema**。

边界和花园方向见 [设计文档](DESIGN.md)，进度见 [YAML](../tasks/chatgpt-content-tools.yaml)。
