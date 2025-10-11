Task: Item Attributes Schema + Loader + Reference Doc

Context: Ingest Amazon listing/Keepa attributes into the DB and document the schema mapping.

10-point prompt:
1) Extend schema with `items` and `item_attributes` (ASIN/SKU keyed).
2) Define indices for ASIN/SKU lookups and joins.
3) Create `agents/logic/load_items.py` to parse listing reports and Keepa JSON.
4) Normalize attributes (rank, price, condition) into typed columns.
5) Support idempotent upsert for recurring imports.
6) Validate inputs; log and skip malformed rows with counters.
7) Update exporters to optionally include safe aggregates by item.
8) Write `docs/schema_items.md` explaining tables and fields.
9) Provide sample input files and a load script test case.
10) Keep PII out; do not store sensitive seller/account info.

