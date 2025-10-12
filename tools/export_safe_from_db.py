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
from datetime import datetime

BASE = os.path.dirname(__file__)
# Resolve DB path: prefer env DB_PATH or SURVEY_DB_PATH, else db/survey.sqlite, else legacy path
ENV_DB = os.environ.get('SURVEY_DB_PATH') or os.environ.get('DB_PATH')
DEFAULT_DB = os.path.join(BASE, '..', 'db', 'survey.sqlite')
LEGACY_DB = os.path.join(BASE, '..', 'agents', 'logic', 'sqlite-service', 'data.sqlite')
DB_PATH = ENV_DB or (DEFAULT_DB if os.path.exists(DEFAULT_DB) else LEGACY_DB)
OUT_DIR = os.path.join(BASE, '..', 'public', 'export')
OUT_SUMMARY = os.path.join(OUT_DIR, 'survey_summary.json')
OUT_RESPONSES = os.path.join(OUT_DIR, 'survey_responses.json')

EXCLUDE_FIELDS = { 'contact', 'email', 'phone' }

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

def features_counts(conn, responses):
    if table_exists(conn, 'response_selections'):
        cur = conn.cursor()
        cur.execute("""
            SELECT rs.option_key, COUNT(*) as c
            FROM response_selections rs
            JOIN questions q ON q.id = rs.question_id
            WHERE q.key = 'features'
            GROUP BY rs.option_key
        """)
        return Counter({ row[0]: row[1] for row in cur.fetchall() })
    # Fallback to splitting response values
    features = Counter()
    for r in responses:
        feats = r.get('features')
        if feats:
            for item in str(feats).split('; '):
                item = item.strip()
                if item:
                    features[item] += 1
    return features

def aggregate(conn, responses):
    by_experience = Counter()
    glitch_counts = Counter()
    features = Counter()
    free_text_counts = Counter()
    sat_sum = 0.0
    sat_count = 0

    for r in responses:
        exp = (r.get('experience') or '').strip()
        if exp:
            by_experience[exp] += 1
        g = (r.get('glitch') or '').strip()
        if g:
            glitch_counts[g] += 1
        s = to_number(r.get('satisfaction'))
        if s is not None:
            sat_sum += s
            sat_count += 1
        # features counted later from DB (selections) or fallback
    for f in ['painpoint', 'valuable_features', 'trust_ai_reason', 'feature_request', 'monitoring']:
        if r.get(f):
            free_text_counts[f] += 1

    # compute features counts
    features = features_counts(conn, responses)

    summary = {
        'generatedAt': datetime.utcnow().isoformat() + 'Z',
        'totalResponses': len(responses),
        'byExperience': dict(by_experience),
        'avgSatisfaction': round(sat_sum / sat_count, 2) if sat_count else None,
        'glitchCounts': dict(glitch_counts),
        'topFeatures': [
            {'name': name, 'count': count}
            for name, count in features.most_common(15)
        ],
        'freeTextCounts': dict(free_text_counts),
    }
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
