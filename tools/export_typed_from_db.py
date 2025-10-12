#!/usr/bin/env python3
"""
Export typed JSON using a schema generated from survey/index.html.

Reads:
  schema/survey_schema.json
  db/survey.sqlite (or SURVEY_DB_PATH/DB_PATH)

Writes:
  public/export/survey_typed_responses.json
  public/export/survey_typed_summary.json
"""
import json
import os
import sqlite3
from collections import Counter
from datetime import datetime, timezone

BASE = os.path.dirname(__file__)
SCHEMA_PATH = os.path.join(BASE, '..', 'schema', 'survey_schema.json')
ENV_DB = os.environ.get('SURVEY_DB_PATH') or os.environ.get('DB_PATH')
DEFAULT_DB = os.path.join(BASE, '..', 'db', 'survey.sqlite')
DB_PATH = ENV_DB or DEFAULT_DB
OUT_DIR = os.path.join(BASE, '..', 'public', 'export')
OUT_RESP = os.path.join(OUT_DIR, 'survey_typed_responses.json')
OUT_SUM = os.path.join(OUT_DIR, 'survey_typed_summary.json')
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

def load_schema():
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_rows(conn, sql, params=()):
    cur = conn.cursor()
    cur.execute(sql, params)
    cols = [c[0] for c in cur.description]
    for r in cur.fetchall():
        yield dict(zip(cols, r))

def table_exists(conn, name: str) -> bool:
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,))
    return cur.fetchone() is not None

def question_id_by_key(conn):
    cur = conn.cursor()
    cur.execute("SELECT id, key FROM questions")
    return { row[1]: row[0] for row in cur.fetchall() }

def get_response_map(conn):
    sql = (
        "SELECT r.id AS response_id, r.submitted_at, v.key, v.value "
        "FROM responses r JOIN response_values v ON v.response_id = r.id ORDER BY r.id"
    )
    m = {}
    ts = {}
    for row in load_rows(conn, sql):
        rid = row['response_id']
        ts[rid] = row['submitted_at']
        if rid not in m: m[rid] = {}
        m[rid][row['key']] = row['value'] or ''
    return m, ts

def coerce_value(v, typ):
    if v is None: return None
    s = str(v).strip()
    if typ in ('numeric', 'ordinal'):
        try:
            f = float(s)
            return int(f) if f.is_integer() else f
        except Exception:
            return None
    elif typ == 'multiselect':
        return [p for p in [x.strip() for x in s.split(';')] if p]
    else:
        return s

def typed_exports(conn, schema):
    fields = schema.get('fields', [])
    field_types = { f['key']: f.get('type') for f in fields }
    qids = question_id_by_key(conn)
    selections_available = table_exists(conn, 'response_selections')

    rmap, tmap = get_response_map(conn)
    items = []
    for rid, rec in rmap.items():
        out = {}
        ts = tmap.get(rid)
        if ts:
            try:
                out['Timestamp'] = datetime.fromtimestamp(int(ts)/1000.0, tz=timezone.utc).isoformat()
            except Exception:
                out['Timestamp'] = str(ts)
        for key, typ in field_types.items():
            if typ == 'multiselect' and selections_available and key in qids:
                qid = qids[key]
                vals = [row['option_key'] for row in load_rows(conn,
                        'SELECT option_key FROM response_selections WHERE response_id=? AND question_id=?',
                        (rid, qid))]
                out[key] = sorted(list(set(vals)))
            else:
                raw = rec.get(key)
                out[key] = coerce_value(raw, typ)
        items.append(out)

    # typed summary
    total = len(items)
    typed_summary = {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'totalResponses': total,
        'counts': {key: {} for key in COUNT_KEYS},
        'averages': {key: {'mean': None, 'count': 0} for key in NUMERIC_KEYS},
        'multiSelectTop': {key: [] for key in MULTI_KEYS},
        'textResponseCounts': {key: 0 for key in TEXT_KEYS},
    }

    numeric_stats = {key: {'sum': 0.0, 'count': 0} for key in NUMERIC_KEYS}
    multi_counters = {key: Counter() for key in MULTI_KEYS}

    for it in items:
        for key in COUNT_KEYS:
            val = it.get(key)
            if isinstance(val, str):
                val = val.strip()
            if val:
                typed_summary['counts'][key][val] = typed_summary['counts'][key].get(val, 0) + 1

        for key in NUMERIC_KEYS:
            val = it.get(key)
            if isinstance(val, (int, float)):
                numeric_stats[key]['sum'] += float(val)
                numeric_stats[key]['count'] += 1

        for key in TEXT_KEYS:
            raw = it.get(key)
            if isinstance(raw, str) and raw.strip():
                typed_summary['textResponseCounts'][key] += 1

        for key in MULTI_KEYS:
            vals = it.get(key)
            if isinstance(vals, list):
                for entry in vals:
                    entry_str = str(entry).strip()
                    if entry_str:
                        multi_counters[key][entry_str] += 1

    for key, stat in numeric_stats.items():
        if stat['count']:
            mean = round(stat['sum'] / stat['count'], 2)
            typed_summary['averages'][key] = {'mean': mean, 'count': stat['count']}
        else:
            typed_summary['averages'][key] = {'mean': None, 'count': 0}

    for key, counter in multi_counters.items():
        typed_summary['multiSelectTop'][key] = [
            {'name': name, 'count': count}
            for name, count in counter.most_common(15)
        ]

    return items, typed_summary

def main():
    if not os.path.exists(DB_PATH):
        raise SystemExit(f"DB not found at {DB_PATH}")
    if not os.path.exists(SCHEMA_PATH):
        raise SystemExit(f"Schema not found at {SCHEMA_PATH}. Run: node tools/generate-schema-from-html.js")
    schema = load_schema()
    conn = sqlite3.connect(DB_PATH)
    try:
        items, summary = typed_exports(conn, schema)
        ensure_dir(OUT_DIR)
        with open(OUT_RESP, 'w', encoding='utf-8') as f:
            json.dump({ 'generatedAt': summary['generatedAt'], 'items': items }, f, indent=2)
        with open(OUT_SUM, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
        print(f"Wrote {OUT_RESP} and {OUT_SUM}")
    finally:
        conn.close()

if __name__ == '__main__':
    main()
