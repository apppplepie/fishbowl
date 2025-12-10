-- 数据库重构：统一 articles 表的时间字段
-- 1. 删除冗余的 last_modified 字段（用 updated_at 替代）
-- 2. 将 publish_date (DATE) 改为 published_at (DATETIME) 以获得更高精度

-- 开始事务
START TRANSACTION;

-- 步骤 1: 添加新的 published_at 字段（DATETIME类型）
ALTER TABLE `articles` 
ADD COLUMN `published_at` datetime DEFAULT NULL AFTER `author`;

-- 步骤 2: 将现有的 publish_date 数据迁移到 published_at
-- 如果 publish_date 存在，则转换为 datetime（时间部分设为 00:00:00）
UPDATE `articles` 
SET `published_at` = CONCAT(publish_date, ' 00:00:00')
WHERE `publish_date` IS NOT NULL;

-- 步骤 3: 删除旧的 publish_date 字段
ALTER TABLE `articles` 
DROP COLUMN `publish_date`;

-- 步骤 4: 删除冗余的 last_modified 字段（改用 updated_at）
ALTER TABLE `articles` 
DROP COLUMN `last_modified`;

-- 步骤 5: 删除旧的索引
DROP INDEX IF EXISTS `idx_publish_date` ON `articles`;

-- 步骤 6: 创建新的索引
ALTER TABLE `articles` 
ADD INDEX `idx_published_at` (`published_at`);

-- 提交事务
COMMIT;

-- 验证结果
SELECT 'Migration completed successfully!' AS status;
SHOW COLUMNS FROM `articles`;

