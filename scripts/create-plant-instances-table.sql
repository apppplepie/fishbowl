-- 创建植物实例表（plant_instances）
-- 用于存储用户种植的植物，包含位置信息和DNA数据

CREATE TABLE IF NOT EXISTS plant_instances (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  page_id VARCHAR(36) DEFAULT NULL,
  position_x_ratio DECIMAL(5,4) NOT NULL COMMENT 'X位置相对宽度（0-1，如0.3表示30%宽度处）',
  position_y_offset DECIMAL(10,2) NOT NULL COMMENT '从基准线向上的偏移（像素，负数表示向上，如-50表示基准线上方50px）',
  dna_json LONGTEXT NOT NULL COMMENT '完整DNA（PlantSettings的JSON格式）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '种植时间',
  INDEX idx_user_id (user_id),
  INDEX idx_page_id (page_id),
  INDEX idx_user_page (user_id, page_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

