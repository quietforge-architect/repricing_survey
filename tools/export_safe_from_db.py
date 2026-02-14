#!/usr/bin/env python3
"""
Export safe JSON from normalized SQLite (v2 schema).
Writes:
  public/export/survey_summary.json
  public/export/survey_responses.json

Usage:
  python tools/export_safe_from_db.py
"""
import json
import os
import sqlite3
from collections import Counter, defaultdict
from datetime import datetime, timezone

BASE = os.path.dirname(__file__)
# Resolve DB path: prefer env DB_PATH or SURVEY_DB_PATH, else db/survey.sqlite, else legacy path
ENV_DB = os.environ.get('SURVEY_DB_PATH') or os.environ.get('DB_PATH')
DEFAULT_DB = os.path.join(BASE, '..', 'db', 'survey.sqlite')
LEGACY_DB = os.path.join(BASE, '..', 'agents', 'logic', 'sqlite-service', 'data.sqlite')
DB_PATH = ENV_DB or (DEFAULT_DB if os.path.exists(DEFAULT_DB) else LEGACY_DB)
OUT_DIR = os.path.join(BASE, '..', 'public', 'export')
OUT_SUMMARY = os.path.join(OUT_DIR, 'survey_summary.json')
OUT_RESPONSES = os.path.join(OUT_DIR, 'survey_responses.json')

EXCLUDE_FIELDS = {'contact', 'email', 'phone'}
COUNT_KEYS = [
    'years_selling',
    'selling_commitment',
    'risk_posture',
    'price_check_frequency',
    'experiment_cadence',
    'ai_trust_temperature',
    'community_interest',
]
NUMERIC_KEYS = ('weekly_hours', 'inventory_anxiety', 'privacy_rating')
MULTI_KEYS = ('sourcing_style', 'signal_menu', 'safety_nets', 'learning_sources')
TEXT_KEYS = ('repricing_stack', 'memorable_glitch', 'wishlist_feature')

def ensure_dir(p):
    os.makedirs(p, exist_ok=True)

def load_rows(conn, sql, params=()):
    cur = conn.cursor()
    cur.execute(sql, params)
    cols = [c[0] for c in cur.description]
    for r in cur.fetchall():
        yield dict(zip(cols, r))

def fetch_responses(conn):
    # Build per-response dict of key->value from response_values
    sql = """
      SELECT r.id AS response_id, r.submitted_at, v.key, v.value
      FROM responses r
      JOIN response_values v ON v.response_id = r.id
      ORDER BY r.id
    """
    responses = defaultdict(dict)
    submitted = {}
    for row in load_rows(conn, sql):
        rid = row['response_id']
        submitted[rid] = row['submitted_at']
        responses[rid][row['key']] = row['value'] or ''
    # convert to list of dicts with Timestamp
    out = []
    for rid, m in responses.items():
        m2 = { k:v for k,v in m.items() if k not in EXCLUDE_FIELDS }
        ts = submitted.get(rid)
        if ts:
            try:
                m2['Timestamp'] = datetime.fromtimestamp(int(ts)/1000.0).isoformat()
            except Exception:
                m2['Timestamp'] = str(ts)
        out.append(m2)
    return out

def to_number(s):
    try:
        return float(str(s).strip())
    except Exception:
        return None

def table_exists(conn, name: str) -> bool:
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,))
    return cur.fetchone() is not None

def multi_counts(conn, responses):
    counters = {key: Counter() for key in MULTI_KEYS}
    if table_exists(conn, 'response_selections'):
        cur = conn.cursor()
        cur.execute("""
            SELECT q.key, rs.option_key, COUNT(*) as c
            FROM response_selections rs
            JOIN questions q ON q.id = rs.question_id
            GROUP BY q.key, rs.option_key
        """)
        for key, option, count in cur.fetchall():
            if key in counters:
                counters[key][str(option)] = count
        return counters

    for r in responses:
        for key in MULTI_KEYS:
            raw = r.get(key)
            if not raw:
                continue
            if isinstance(raw, list):
                items = raw
            else:
                items = [s.strip() for s in str(raw).split(';') if s.strip()]
            for item in items:
                counters[key][item] += 1
    return counters

def aggregate(conn, responses):
    summary = {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'totalResponses': len(responses),
        'counts': {key: {} for key in COUNT_KEYS},
        'averages': {key: {'mean': None, 'count': 0} for key in NUMERIC_KEYS},
        'multiSelectTop': {key: [] for key in MULTI_KEYS},
        'textResponseCounts': {key: 0 for key in TEXT_KEYS},
    }

    numeric_stats = {key: {'sum': 0.0, 'count': 0} for key in NUMERIC_KEYS}

    for r in responses:
        for key in COUNT_KEYS:
            val = (r.get(key) or '').strip()
            if val:
                summary['counts'][key][val] = summary['counts'][key].get(val, 0) + 1

        for key in NUMERIC_KEYS:
            num = to_number(r.get(key))
            if num is not None:
                numeric_stats[key]['sum'] += num
                numeric_stats[key]['count'] += 1

        for key in TEXT_KEYS:
            raw = r.get(key)
            if isinstance(raw, str) and raw.strip():
                summary['textResponseCounts'][key] += 1

    for key, stat in numeric_stats.items():
        if stat['count']:
            mean = round(stat['sum'] / stat['count'], 2)
            summary['averages'][key] = {'mean': mean, 'count': stat['count']}
        else:
            summary['averages'][key] = {'mean': None, 'count': 0}

    counters = multi_counts(conn, responses)
    for key, counter in counters.items():
        summary['multiSelectTop'][key] = [
            {'name': name, 'count': count}
            for name, count in counter.most_common(15)
        ]

    return summary

def main():
    if not os.path.exists(DB_PATH):
        raise SystemExit(f"DB not found at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    try:
        responses = fetch_responses(conn)
        summary = aggregate(conn, responses)
        ensure_dir(OUT_DIR)
        with open(OUT_SUMMARY, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
        with open(OUT_RESPONSES, 'w', encoding='utf-8') as f:
            json.dump({'generatedAt': summary['generatedAt'], 'items': responses}, f, indent=2)
        print(f"Wrote {OUT_SUMMARY} and {OUT_RESPONSES}")
    finally:
        conn.close()

if __name__ == '__main__':
    main()
