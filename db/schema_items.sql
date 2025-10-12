PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE,
  asin TEXT,
  title TEXT,
  condition TEXT,
  fulfillment TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS item_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  num_value REAL,
  updated_at INTEGER,
  UNIQUE(item_id, key),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_asin ON items(asin);
CREATE INDEX IF NOT EXISTS idx_metrics_item ON item_metrics(item_id);

