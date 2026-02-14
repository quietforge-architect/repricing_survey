# Items & Metrics Schema

Tables
- `items`
  - `sku` (unique), `asin`, `title`, `condition`, `fulfillment`, `created_at`
- `item_metrics`
  - `item_id` (FK), `key`, `value`, `num_value`, `updated_at`
  - Unique per (`item_id`, `key`)

Loader
- `agents/logic/load_items.py` ingests CSV with columns:
  - `SKU`, `ASIN`, `Title`, `Condition`, `Fulfillment`, optional `Rank`, `Price`
- Upserts basic item fields; writes `rank` and `price` to `item_metrics` when present.

Usage
- Initialize DB: `npm run db:init`
- Load CSV: `python agents/logic/load_items.py path/to/listing.csv`
- Query joins:
  - Example: `SELECT i.sku, m.num_value AS rank FROM items i JOIN item_metrics m ON m.item_id=i.id AND m.key='rank'`

