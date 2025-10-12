#!/usr/bin/env python3
"""
Migration: submissions (v1) -> normalized v2 schema

Usage:
  python agents/logic/sqlite-service/migrate_v1_to_v2.py
"""
import json
import os
import sqlite3
import time

BASE = os.path.dirname(__file__)
# Prefer env DB_PATH, else default to db/survey.sqlite, else local data.sqlite
ENV_DB = os.environ.get('SURVEY_DB_PATH') or os.environ.get('DB_PATH')
DEFAULT_DB = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(BASE))), 'db', 'survey.sqlite')
DB_PATH = ENV_DB or (DEFAULT_DB if os.path.exists(DEFAULT_DB) else os.path.join(BASE, 'data.sqlite'))
SCHEMA_V2_PATH = os.path.join(BASE, 'schema_v2.sql') if os.path.exists(os.path.join(BASE, 'schema_v2.sql')) else os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(BASE))), 'db', 'schema_v2.sql')

def read_text(p):
    with open(p, 'r', encoding='utf-8') as f:
        return f.read()

def ensure_schema(conn):
    conn.execute('PRAGMA foreign_keys=ON;')
    sql = read_text(SCHEMA_V2_PATH)
    conn.executescript(sql)

def hex_random_16():
    return os.urandom(16).hex()

def main():
    if not os.path.exists(DB_PATH):
        raise SystemExit(f"DB not found at {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        ensure_schema(conn)

        cur = conn.cursor()
        conn.execute('BEGIN')

        # Upsert survey
        survey_name = 'Amazon_Repricing_Feedback_Survey'
        survey_version = 'v1'
        cur.execute('SELECT id FROM surveys WHERE name = ? AND version = ?', (survey_name, survey_version))
        row = cur.fetchone()
        if row:
            survey_id = row['id']
        else:
            cur.execute('INSERT INTO surveys (name, version, created_at) VALUES (?, ?, ?)',
                        (survey_name, survey_version, int(time.time()*1000)))
            survey_id = cur.lastrowid

        # helpers
        def ensure_question_id(key: str) -> int:
            cur.execute('SELECT id FROM questions WHERE survey_id = ? AND key = ?', (survey_id, key))
            r = cur.fetchone()
            if r:
                return r['id']
            cur.execute('INSERT OR IGNORE INTO questions (survey_id, key, label, type) VALUES (?, ?, ?, ?)',
                        (survey_id, key, key, 'text'))
            cur.execute('SELECT id FROM questions WHERE survey_id = ? AND key = ?', (survey_id, key))
            return cur.fetchone()['id']

        # migrate submissions
        cur.execute('SELECT id, created_at, sanitized FROM submissions ORDER BY created_at ASC')
        subs = cur.fetchall()
        migrated = 0
        skipped = 0
        for s in subs:
            src_id = s['id']
            cur.execute('SELECT id FROM responses WHERE source_submission_id = ?', (src_id,))
            if cur.fetchone():
                skipped += 1
                continue
            try:
                data = json.loads(s['sanitized'] or '{}')
            except Exception:
                data = {}
            respondent_hash = hex_random_16()
            cur.execute('INSERT OR IGNORE INTO respondents (respondent_hash) VALUES (?)', (respondent_hash,))
            cur.execute('SELECT id FROM respondents WHERE respondent_hash = ?', (respondent_hash,))
            respondent_id = cur.fetchone()['id']
            submitted_at = s['created_at'] or int(time.time()*1000)
            cur.execute('INSERT OR IGNORE INTO responses (survey_id, respondent_id, submitted_at, source_submission_id) VALUES (?, ?, ?, ?)',
                        (survey_id, respondent_id, submitted_at, src_id))
            cur.execute('SELECT id FROM responses WHERE source_submission_id = ?', (src_id,))
            response_id = cur.fetchone()['id']
            for k, v in (data or {}).items():
                if not k:
                    continue
                qid = ensure_question_id(k)
                # Normalize arrays to "; " joined for response_values
                value = '' if v is None else ('; '.join(v) if isinstance(v, list) else str(v))
                cur.execute('INSERT OR IGNORE INTO response_values (response_id, question_id, key, value) VALUES (?, ?, ?, ?)',
                            (response_id, qid, k, value))
                # Populate selections for known multi-select keys
                if k in ('features', 'model'):
                    items = v if isinstance(v, list) else str(v or '').split('; ')
                    for it in [i.strip() for i in items if str(i).strip()]:
                        cur.execute('INSERT OR IGNORE INTO response_selections (response_id, question_id, option_key, option_label) VALUES (?, ?, ?, ?)',
                                    (response_id, qid, it, None))
            migrated += 1

        conn.commit()
        print(f"Migration complete: migrated={migrated}, skipped={skipped}, total={len(subs)}")
    except Exception as e:
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    main()
