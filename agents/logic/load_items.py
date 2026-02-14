#!/usr/bin/env python3
"""
Load item attributes from a CSV into the survey DB.

CSV columns (header, case-insensitive; extras ignored):
  SKU, ASIN, Title, Condition, Fulfillment, Rank, Price

Usage:
  python agents/logic/load_items.py path/to/listing.csv
"""
import csv
import os
import sqlite3
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
DB_PATH = os.environ.get('SURVEY_DB_PATH') or os.path.join(ROOT, 'db', 'survey.sqlite')
SCHEMA_ITEMS = os.path.join(ROOT, 'db', 'schema_items.sql')

def read_text(p):
    with open(p, 'r', encoding='utf-8') as f:
        return f.read()

def ensure_schema(conn):
    conn.executescript(read_text(SCHEMA_ITEMS))

def upsert_item(cur, sku, asin, title, condition, fulfillment):
    now = int(time.time()*1000)
    cur.execute('INSERT OR IGNORE INTO items (sku, asin, title, condition, fulfillment, created_at) VALUES (?,?,?,?,?,?)',
                (sku, asin, title, condition, fulfillment, now))
    cur.execute('UPDATE items SET asin=COALESCE(?,asin), title=COALESCE(?,title), condition=COALESCE(?,condition), fulfillment=COALESCE(?,fulfillment) WHERE sku=?',
                (asin, title, condition, fulfillment, sku))
    cur.execute('SELECT id FROM items WHERE sku=?', (sku,))
    return cur.fetchone()[0]

def upsert_metric(cur, item_id, key, value):
    try:
        num = float(value)
    except Exception:
        num = None
    now = int(time.time()*1000)
    cur.execute('INSERT OR IGNORE INTO item_metrics (item_id, key, value, num_value, updated_at) VALUES (?,?,?,?,?)',
                (item_id, key, str(value) if value is not None else None, num, now))
    cur.execute('UPDATE item_metrics SET value=?, num_value=?, updated_at=? WHERE item_id=? AND key=?',
                (str(value) if value is not None else None, num, now, item_id, key))

def main():
    if len(sys.argv) < 2:
        print('Usage: python agents/logic/load_items.py path/to/listing.csv')
        sys.exit(1)
    csv_path = sys.argv[1]
    if not os.path.exists(csv_path):
        print('CSV not found:', csv_path)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_schema(conn)
        cur = conn.cursor()
        with open(csv_path, newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                sku = (row.get('SKU') or row.get('sku') or '').strip()
                if not sku:
                    continue
                asin = (row.get('ASIN') or row.get('asin') or '').strip() or None
                title = (row.get('Title') or row.get('title') or '').strip() or None
                condition = (row.get('Condition') or row.get('condition') or '').strip() or None
                fulfillment = (row.get('Fulfillment') or row.get('fulfillment') or '').strip() or None
                item_id = upsert_item(cur, sku, asin, title, condition, fulfillment)
                # Optional metrics
                rank = (row.get('Rank') or row.get('rank'))
                price = (row.get('Price') or row.get('price'))
                if rank not in (None, ''):
                    upsert_metric(cur, item_id, 'rank', rank)
                if price not in (None, ''):
                    upsert_metric(cur, item_id, 'price', price)
                count += 1
        conn.commit()
        print('Imported items:', count)
    finally:
        conn.close()

if __name__ == '__main__':
    main()

