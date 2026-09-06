-- Additive migration. Run against the existing light production schema before deploying.
-- Existing article/block/media/user tables are prerequisites; db:init is only a legacy baseline.
CREATE TABLE IF NOT EXISTS gpt_article_details (
  article_id VARCHAR(36) PRIMARY KEY,
  summary TEXT NULL,
  metadata JSON NULL,
  rating_reason VARCHAR(2000) NULL,
  updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gpt_requests (
  author_id VARCHAR(36) NOT NULL,
  request_id VARCHAR(80) NOT NULL,
  operation VARCHAR(32) NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  result JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (author_id, request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
