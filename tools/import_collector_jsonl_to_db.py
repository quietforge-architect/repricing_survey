#!/usr/bin/env python3
"""
Import submissions from agents/logic/local-collector/data/submissions.jsonl into db/survey.sqlite

Usage:
  python tools/import_collector_jsonl_to_db.py [path-to-jsonl]

If no path provided, defaults to agents/logic/local-collector/data/submissions.jsonl
"""
import os
import sys
import sqlite3
import json
import time
import random

ROOT = os.path.dirname(os.path.dirname(__file__))
DEFAULT_JSONL = os.path.join(ROOT, 'agents', 'logic', 'local-collector', 'data', 'submissions.jsonl')
DB_PATH = os.path.join(ROOT, 'db', 'survey.sqlite')

MULTI_KEYS = ['sourcing_style', 'signal_menu', 'safety_nets', 'learning_sources']

def millis_from_iso(ts):
    # parse ISO timestamp to milliseconds since epoch
    try:
        # Python 3.11 supports fromisoformat with Z? we'll fallback
        from datetime import datetime, timezone
        if ts.endswith('Z'):
            ts = ts[:-1] + '+00:00'
        dt = datetime.fromisoformat(ts)
        return int(dt.replace(tzinfo=timezone.utc).timestamp() * 1000)
    except Exception:
        try:
            return int(time.time() * 1000)
        except:
            return int(time.time() * 1000)

def ensure_survey(conn, name='Amazon_Repricing_Feedback_Survey', version='v1'):
    cur = conn.cursor()
    cur.execute('SELECT id FROM surveys WHERE name=? AND version=?', (name, version))
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute('INSERT INTO surveys (name, version, created_at) VALUES (?, ?, ?)', (name, version, int(time.time()*1000)))
    return cur.lastrowid

def ensure_respondent(conn, respondent_hash):
    cur = conn.cursor()
    cur.execute('INSERT OR IGNORE INTO respondents (respondent_hash) VALUES (?)', (respondent_hash,))
    cur.execute('SELECT id FROM respondents WHERE respondent_hash=?', (respondent_hash,))
    return cur.fetchone()[0]

def upsert_response(conn, survey_id, respondent_id, submitted_at, source_submission_id):
    cur = conn.cursor()
    cur.execute('INSERT OR IGNORE INTO responses (survey_id, respondent_id, submitted_at, source_submission_id) VALUES (?, ?, ?, ?)', (survey_id, respondent_id, submitted_at, source_submission_id))
    cur.execute('SELECT id FROM responses WHERE source_submission_id=?', (source_submission_id,))
    return cur.fetchone()[0]

def import_one(conn, data_ts, payload):
    cur = conn.cursor()
    source_id = 's_' + str(millis_from_iso(data_ts))
    submitted_at = millis_from_iso(data_ts)
    # simple respondent hash: random hex
    respondent_hash = '%016x' % random.getrandbits(64)
    survey_id = ensure_survey(conn)
    respondent_id = ensure_respondent(conn, respondent_hash)
    # Skip if response already exists
    cur.execute('SELECT id FROM responses WHERE source_submission_id=?', (source_id,))
    if cur.fetchone():
        print('Skipping existing source', source_id)
        return False
    response_id = upsert_response(conn, survey_id, respondent_id, submitted_at, source_id)

    # Questions and values
    for key, val in payload.items():
        if key is None or key == 'Timestamp':
            continue
        # ensure question
        cur.execute('INSERT OR IGNORE INTO questions (survey_id, key, label, type) VALUES (?, ?, ?, ?)', (survey_id, key, key, 'text'))
        cur.execute('SELECT id FROM questions WHERE survey_id=? AND key=?', (survey_id, key))
        qid = cur.fetchone()[0]

        # value normalization
        if isinstance(val, list):
            value_for_store = '; '.join(map(str, val))
        else:
            value_for_store = '' if val is None else str(val)

        cur.execute('INSERT OR REPLACE INTO response_values (response_id, question_id, key, value) VALUES (?, ?, ?, ?)', (response_id, qid, key, value_for_store))

        if key in MULTI_KEYS:
            items = val if isinstance(val, list) else [s.strip() for s in str(val).split(';') if s.strip()]
            for it in items:
                cur.execute('INSERT OR IGNORE INTO response_selections (response_id, question_id, option_key, option_label) VALUES (?, ?, ?, ?)', (response_id, qid, it, None))

    conn.commit()
    print('Imported', source_id)
    return True

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_JSONL
    if not os.path.exists(path):
        print('JSONL file not found:', path)
        sys.exit(1)
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute('PRAGMA foreign_keys = ON;')

    imported = 0
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            try:
                obj = json.loads(line)
                ts = obj.get('ts') or obj.get('timestamp') or None
                data = obj.get('data') or obj
                if not ts:
                    ts = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                ok = import_one(conn, ts, data)
                if ok: imported += 1
            except Exception as e:
                print('Failed to import line:', e)

    print('Imported total:', imported)

if __name__ == '__main__':
    main()
