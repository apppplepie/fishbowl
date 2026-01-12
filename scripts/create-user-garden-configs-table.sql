-- 创建用户花园配置表（user_garden_configs）
-- 用于存储每个用户的基准线配置

CREATE TABLE IF NOT EXISTS user_garden_configs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  page_id VARCHAR(36) DEFAULT NULL COMMENT '页面ID（可为NULL表示花园主页）',
  baseline_y_ratio DECIMAL(5,4) NOT NULL DEFAULT 0.6 COMMENT '基准线相对高度（0-1）',
  baseline_color VARCHAR(50) NOT NULL DEFAULT 'rgba(0, 0, 0, 0.1)' COMMENT '基准线颜色',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
  UNIQUE KEY uk_user_page (user_id, page_id),
  INDEX idx_user_id (user_id),
  INDEX idx_page_id (page_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

