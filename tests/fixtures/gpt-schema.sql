-- Minimal light-compatible schema for an isolated integration database, never production.
CREATE TABLE IF NOT EXISTS users (
 id VARCHAR(36) PRIMARY KEY, username VARCHAR(100), email VARCHAR(255), role VARCHAR(20), status VARCHAR(20), max_access_level INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS categories (
 id VARCHAR(36) PRIMARY KEY, name VARCHAR(255), parent_id VARCHAR(36), order_index INT, depth INT, path VARCHAR(1000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS articles (
 id VARCHAR(36) PRIMARY KEY, title VARCHAR(255), author VARCHAR(100), author_id VARCHAR(36), excerpt TEXT,
 type VARCHAR(20), status VARCHAR(20), category_id VARCHAR(36), order_index INT, published_at DATETIME,
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 visible_access_level INT, full_access_level INT NOT NULL, cover_image JSON, cover_access_level INT,
 likes INT DEFAULT 0, shares INT DEFAULT 0, comments INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS media (
 id VARCHAR(36) PRIMARY KEY, url VARCHAR(2048), mime VARCHAR(100), width INT, height INT, aspect_ratio DOUBLE,
 size_bytes BIGINT, sha256 CHAR(64), source VARCHAR(100), blur_data_url TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS blocks (
 id VARCHAR(36) PRIMARY KEY, type VARCHAR(20), content LONGTEXT, author VARCHAR(100), access_level INT, media_id VARCHAR(36),
 created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS article_blocks (
 article_id VARCHAR(36), block_id VARCHAR(36), `order` INT, PRIMARY KEY(article_id,block_id),
 FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE,
 FOREIGN KEY(block_id) REFERENCES blocks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS tags (id VARCHAR(36) PRIMARY KEY, name VARCHAR(80) UNIQUE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS article_tags (
 article_id VARCHAR(36), tag_id VARCHAR(36), PRIMARY KEY(article_id,tag_id),
 FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE,
 FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
