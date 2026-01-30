# 图片迁移到 media 表说明

## 📋 概述

这个迁移脚本将 `blocks` 表中的图片数据迁移到新的 `media` 表中，实现图片的集中管理和去重。

## 🗄️ 数据库结构

### media 表
存储所有图片的元数据信息：
- `id`: UUID 主键
- `url`: 原始文件 URL 或存储 key
- `mime`: MIME 类型（如 image/jpeg）
- `width`, `height`: 图片尺寸
- `aspect_ratio`: 宽高比
- `size_bytes`: 文件大小（字节）
- `sha256`: 文件 SHA256 哈希值（用于去重）
- `variants`: JSON 格式，存储不同尺寸的 URL
- `orientation`: EXIF 方向信息
- `source`: 来源（local/cdn/external/base64）
- `created_at`: 创建时间

### blocks 表新增字段
- `media_id`: 关联到 `media.id`（可为 NULL，兼容现有数据）

## 🚀 使用步骤

### 1. 创建 media 表和添加 media_id 列

```bash
npm run db:migrate:create-media
```

或直接运行：
```bash
npx ts-node --project tsconfig.node.json scripts/create-media-table.ts
```

这个脚本会：
- 检查并创建 `media` 表（如果不存在）
- 检查并添加 `blocks.media_id` 列（如果不存在）

### 2. 配置环境变量

确保 `.env` 或 `.env.local` 文件中包含数据库配置：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=yourdatabase

# 可选：如果图片是远程 URL，设置 CDN 基础域名
BASE_ORIGIN=https://yourcdn.example.com
```

### 3. 运行迁移脚本

```bash
npm run db:migrate:media
```

或直接运行：
```bash
npx ts-node --project tsconfig.node.json scripts/migrate-to-media.ts
```

## 📝 脚本功能

### 支持的图片格式

1. **远程 URL** (`http://` 或 `https://`)
   - 直接从 URL 下载图片
   - 计算 SHA256、获取尺寸等信息

2. **相对路径** (`/uploads/...` 或 `/...`，含子目录如 `/uploads/2025/12/`、`/uploads/2026/01/`)
   - 优先从本地文件系统读取（`public/uploads/` 及其子目录）
   - 如果本地不存在，尝试从 `BASE_ORIGIN + 路径` 下载

3. **Base64 数据 URI** (`data:image/...;base64,...`)
   - 直接解析 base64 数据
   - 计算 SHA256 和尺寸

### 去重机制

- 脚本会计算每个图片的 SHA256 哈希值
- 如果已存在相同 SHA256 的 `media` 记录，会复用该记录
- 避免重复存储相同的图片

### 批量处理

- 默认批量大小为 200 条
- 每批处理完后会短暂暂停（200ms），避免过载
- 支持断点续传（只处理 `media_id` 为空的记录）

### 错误处理

- 失败的记录会记录到 `scripts/migrate-media-errors.log`
- 日志包含失败原因和错误信息
- 单个记录失败不会中断整个迁移过程

## ⚠️ 注意事项

1. **备份数据库**
   - 运行迁移前，**务必备份数据库**！
   - 建议先在测试环境验证

2. **测试运行**
   - 可以先修改脚本中的 `BATCH_SIZE` 为较小值（如 10）进行测试
   - 或者先手动执行 SQL 限制处理数量：
     ```sql
     SELECT id, content FROM blocks 
     WHERE type='image' AND (media_id IS NULL OR media_id='') 
     LIMIT 10;
     ```

3. **本地文件路径**
   - 脚本会从 `public/uploads/` 目录读取本地文件，**支持任意子目录**
   - 例如：`/uploads/2025/12/xxx.jpg`、`/uploads/2026/01/yyy.png` 会解析到 `public/uploads/2025/12/`、`public/uploads/2026/01/`
   - content 里若存的是相对路径（如 `2025/12/xxx.jpg` 或 `uploads/2025/12/xxx.jpg`），脚本会自动补全为 `/uploads/...` 再解析
   - 确保对应目录存在且有读取权限

4. **网络连接**
   - 如果图片是远程 URL，确保能访问这些 URL
   - 脚本设置了 20 秒超时

5. **内存使用**
   - 脚本会将整个图片加载到内存中
   - 对于大量大图片，可能需要调整批量大小

## 📊 迁移后验证

### 检查迁移结果

```sql
-- 查看迁移统计
SELECT 
  COUNT(*) as total_blocks,
  COUNT(media_id) as migrated_blocks,
  COUNT(*) - COUNT(media_id) as pending_blocks
FROM blocks 
WHERE type = 'image';

-- 查看 media 表统计
SELECT 
  source,
  COUNT(*) as count,
  SUM(size_bytes) as total_size_bytes
FROM media
GROUP BY source;

-- 查看去重效果（SHA256 重复的记录）
SELECT sha256, COUNT(*) as count
FROM media
GROUP BY sha256
HAVING count > 1;
```

### 查看失败记录

```bash
cat scripts/migrate-media-errors.log
```

## 🔧 故障排除

### 问题：本地文件找不到

**原因**：文件路径不正确或文件不存在

**解决**：
- 检查 `public/uploads/` 目录是否存在
- 检查文件路径是否正确
- 如果文件在 CDN，确保 `BASE_ORIGIN` 配置正确

### 问题：远程 URL 下载失败

**原因**：网络问题、URL 失效、超时

**解决**：
- 检查网络连接
- 验证 URL 是否可访问
- 增加超时时间（修改脚本中的 `timeout: 20000`）

### 问题：图片尺寸无法获取

**原因**：文件损坏、格式不支持、非图片文件

**解决**：
- 脚本会继续处理，但 `width`、`height` 等字段可能为 NULL
- 检查文件是否真的是图片文件

### 问题：数据库连接失败

**原因**：数据库配置错误或数据库未启动

**解决**：
- 检查 `.env` 文件中的数据库配置
- 确保数据库服务正在运行
- 测试数据库连接：`npm run db:init`

## 📈 性能优化建议

对于大量图片（> 10000 张），可以考虑：

1. **流式处理 SHA256**
   - 使用 `crypto.createHash().setEncoding('hex')` 和流式读取
   - 避免将整个文件加载到内存

2. **使用 probe-image-size**
   - 只读取图片头部获取尺寸
   - 减少网络传输和内存使用

3. **并行处理**
   - 使用 `Promise.all()` 并行处理多个图片
   - 注意控制并发数量，避免过载

4. **增量迁移**
   - 只处理新添加的图片
   - 使用 `created_at` 字段过滤

## 📞 支持

如有问题，请检查：
1. 错误日志文件：`scripts/migrate-media-errors.log`
2. 数据库连接配置
3. 文件路径和权限
