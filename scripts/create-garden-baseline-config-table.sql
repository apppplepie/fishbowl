-- 创建花园基准线配置表（garden_baseline_config）
-- 用于存储全局基准线配置，只有用户、版主、管理员可以修改

CREATE TABLE IF NOT EXISTS garden_baseline_config (
  id VARCHAR(36) PRIMARY KEY,
  baseline_y_ratio DECIMAL(5,4) NOT NULL DEFAULT 0.6 COMMENT '基准线相对高度（0-1，如0.6表示60%高度处）',
  updated_by VARCHAR(36) NOT NULL COMMENT '最后更新者用户ID',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认配置（如果表为空）
INSERT INTO garden_baseline_config (id, baseline_y_ratio, updated_by)
SELECT 'default-baseline-config', 0.6, 'system'
WHERE NOT EXISTS (SELECT 1 FROM garden_baseline_config);

