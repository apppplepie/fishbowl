# Fishbowl + ChatGPT：从发布入口到内容管理工具

基于 `light@17027a53fb0452e262f97948b9b7970ec74a6ea5`，开发分支 `codex/chatgpt-content-tools`。让 GPT 可靠整理旧文、分级发布、配图，不把所有能力塞进一个动作。

## 项目实际结构

Next.js 16 App Router + React 19 + TypeScript；后端就在 `app/api`，`lib/db.ts` 用 mysql2 连接 MySQL，并不是另一个独立后端工程。

- `articles`：标题、excerpt、作者、类型、分类、状态、排序、可见/完整/封面访问等级。
- `blocks`：type、JSON 字符串 content、access_level、media_id。text 内容为 `{content}`，code 为 `{code,language,title}`，image 为 `{url,title,description,media_id}`。
- `article_blocks`：关联和顺序。block 可被其他文章引用，整理一篇不能直接改掉共享原文。
- `tags` / `article_tags`：词表和关联。`categories`：path/depth/order_index 分类树，分类与文章类型不同。
- `media`：URL、SHA256、尺寸、mime、blur，图片卡使用这些字段占位和渲染。
- `lib/gptAuth.ts`：key 映射作者 ID。`canEditArticle`：admin 跨作者编辑，moderator 仅本人，普通 user 不编辑。
- 既有 GPT API：分类、moments/publish/articles 创建、文章列表/详情/今日文章、评论、base64 上传、OpenAPI。用户提供的示例没有展示全部能力。
- `lib/gptPublish.ts`：已有 block 转换、默认分类、标签/media 创建，继续复用它，不从请求里再 HTTP 回调自己的发布接口。

原缺口包括 GPT 发布固定 level=1、summary 只转成 excerpt、多表写入缺少事务。浏览器全量 PUT 又有标签更新与封面处理耦合，不适合自动打 tag。因此新增薄路由和内容操作服务，复用发布/标签/媒体函数，不伪造浏览器 cookie。

## 三个核心操作

### 整理：只表达要改的部分

`curateArticle` 默认追加标签，可明确 replace；补简介和来源/语言/描述。分类、类型、标题、评级、封面不在可写集合。

结构调整采用完整 block ID 排列，或 text block 的精确子串拆分。拆分必须逐字拼回原文，由后端验证，创建新 blocks 后只替换当前文章关联，原 block 留给其他引用者。自动打 tag 不需要提交正文。

没有增加任意 JSON Patch/全文替换：容易把旧文清理变成重写、丢失隐藏块、影响共享内容。合并段落、改标题/分类、重评已有内容可以以后增加明确编辑能力；本次先兑现保留原文。

### 分级发布：GPT 判断语义，后端保证结构

前端实际枚举来自 `app/types/block.ts`：P=1、G=2、M=3、A=4、R=5。旧注释的“1–10”不代表可以发明新等级。

这是访问权限，不是完整内容审核标准：M 是会员，A 是成人，R 是管理员。GPT 提出每块等级和简短依据；后端校验整数、范围、操作者权限，计算 `visible=min(blocks)`、`full=max(blocks)`，封面等级取对应图片。不靠关键词假装准确评级，也不引入隐式付费模型。

新文默认 draft，用户要求发布时可同次指定 published。已有草稿用同一个 tool 的小型状态转换请求发布，保留文章 ID。状态转换不接收正文/分类/评级，减少分支复杂度。

标题、tags、excerpt 是公开预览，Instructions 要求中性、不透露私密/露骨细节。block 评级不会自动清理标题；这属于 GPT 语义工作流。需要强审核时应另加复核队列，不能靠数据库字段冒充内容审核。

### 配图：生成与文章写入分开

读文章 → GPT 选锚点/prompt → 外部能力生成 → 登记资源 → 原子关联。接收实际 media_id，用 after_block_id 定位；null 放开头，同锚点多图按输入顺序，一次最多五张。正文不改，默认不换封面。

图片保存 URL/media_id，沿用既有卡片渲染。实际生成描述可存 image block 的 generation_prompt，不复制到公开封面。图片等级不能低于锚点，GPT 还需依据画面判断是否提高。

没有创建 image_job 或新资源表，因为没有给定生成服务。registerImage、旧 upload、旧远程发布使用统一媒体存储。下载只允许配置过的精确 HTTPS host，DNS 验证后固定连接地址，不跟重定向、不转发 key；限制超时、大小和像素，后端生成文件名。

登记与文章事务分开：关联失败可能留下未引用 media，但不会留下半篇文章/半组插图。以后可按引用数清理资源。尚未接通的生成服务不能在报告里算作已完成生图。

## 数据、一致性、权限

新增 `gpt_article_details` 旁表保存 summary、有限 metadata、评级依据，旧前端继续读 excerpt。`gpt_requests` 保存作者维度 request_id、操作、输入哈希、精简结果。日志和内容同事务提交，重试返回原结果，参数不同返回 409。

revision 是关键文章字段、原始 blocks/顺序/等级、tags、旁表的哈希，不依赖秒级 updated_at。修改先锁文章/blocks，再验证版本。并发 GPT 编辑只有一个能基于同一版本成功。读取用事务快照；多页可能来自不同事务，客户端需检查每页 revision。

浏览器旧 PUT 仍是多步骤自动提交：与 GPT 恰好交错时，不能提供相同的端到端原子保证。下一步应把浏览器编辑也迁入共同事务/版本机制。本次不重写整套编辑器。request 日志不是完整审计/撤销历史。

key 不自动拥有全站权限。新管理读写检查用户 active、角色、作者归属及 max_access_level。整理其他作者旧文需部署时显式绑定合适 admin；不自动升级原 chatgpt moderator。

为使草稿流程可用，修复公开详情/列表的草稿暴露，并排除公开 block 引用搜索里的草稿。旧 GPT 评论/今日文章接口不在新工具管理范围。

## 现实边界

- 图片仍在 `public/uploads`，由 `/api/uploads` 服务。**block/封面分级控制文章展示，不等于受保护文件存储**：持有原图 URL 仍可能下载。不要当作私密媒体保险箱。真正保护需移出 public、处理 Next image optimizer/缓存、按用户权限返回或签发短期 URL；本次不假装一个等级字段能做到。
- GPT 详情/搜索是 v4 契约变化，旧消费者需更新；旧发布保留，新工作流不要把需分级文章交给默认 level 1 的旧动作。
- Actions 不自动提供附件字节，生成能力不天然返回公网 URL。必须有真实 provider URL、已登记 media_id 或上传桥接。测试覆盖了落盘/去重/关联，没有验证未提供的图片模型集成。
- 没有连接生产数据库。完整线上 schema 不在仓库，提供增量迁移及前置检查，测试使用代码所需字段的隔离 MySQL fixture，不冒充线上数据库副本。

## 为什么保留几个小 helper

getArticle 提供正文/锚点/版本；searchArticles 找可管理内容；getEditorialContext 提供 tags/真实评级/身份能力；getCategories 延用分类树；registerImage 把生成资源变成 media。没有 action=任意命令的万能参数。

OpenAPI 单一 TypeScript 源生成独立包/完整包，测试引用和文件一致性。官方 [Actions 生产说明](https://developers.openai.com/api/docs/actions/production) 给出 45 秒超时、请求/响应及 description 长度限制，所以采用分页读块、短响应、生成与写库分开。[Actions 入门](https://developers.openai.com/api/docs/actions/getting-started) 说明 OpenAPI 和接口应分别测试；这里覆盖 schema、服务、真实 MySQL 和路由。

## 下一步 AI 能维护什么

1. **标签清理工作台**：逐篇建议少量 tags，保留旧标签。先有统计和变更记录，再做同义词合并，不急着开放全局删除。
2. **文章配图队列**：记录 revision、anchor、prompt、provider_job_id、资源和状态；生成后重新检查文章版本，失败可重试，取消不改文章。
3. **内容版本/审核**：人工编辑与 GPT 共用事务服务；存修改前后、操作者、来源、评级复核、撤销。定时 AI 不应自动降低已有等级。
4. **动态专题**：维护“最近在研究什么”的指定草稿，从真实文章引用更新，有预算、来源、时间，不无限生成重复文章。
5. **噪声植物花园**：已经有 plant_instances.dna_json、user_garden_configs、PlantSettings 和 plantRenderer.ts。把文章主题映射到 stem 直度、leaf 频率、flower 色彩，存参数让前端生长。

花园未来可做 `plantArticleGarden(article_id, preset, seed, position)`，后端用受限 preset 校验 PlantSettings，约束植物数量、maxLife、growthSpeed、leafFrequency、petalCount，记录来源文章。seed 还需接入 renderer 随机数才能可重复，不能只存未使用数字。不存任意 JS/HTML 让前端执行。

现有 garden 保存是整页植物集合替换；AI 应增添稳定实例 ID 的局部 upsert，不能直接借用它意外清空人的花园。本次花园停留在有代码依据的设计，优先三个核心流程的测试和交付。
