-- 创建 media 表
CREATE TABLE IF NOT EXISTS `media` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `url` TEXT NOT NULL COMMENT '原始文件 URL 或 存储 key',
  `mime` VARCHAR(100) DEFAULT NULL,
  `width` INT DEFAULT NULL,
  `height` INT DEFAULT NULL,
  `aspect_ratio` DECIMAL(10,6) DEFAULT NULL COMMENT 'width/height',
  `size_bytes` BIGINT DEFAULT NULL,
  `sha256` VARCHAR(64) DEFAULT NULL,
  `variants` JSON DEFAULT NULL COMMENT '{"thumb": "...","small":"...","large":"..."}',
  `orientation` SMALLINT DEFAULT NULL COMMENT 'EXIF orientation if available',
  `source` VARCHAR(50) DEFAULT NULL COMMENT 'local|cdn|external|base64',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sha256` (`sha256`(32)),
  INDEX `idx_mime` (`mime`),
  INDEX `idx_source` (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 在 blocks 表中添加 media_id 列（如果不存在）
ALTER TABLE `blocks`
  ADD COLUMN IF NOT EXISTS `media_id` VARCHAR(36) NULL AFTER `content`,
  ADD KEY IF NOT EXISTS `idx_media_id` (`media_id`);
