#!/usr/bin/env python3
"""
Initialize the survey SQLite database under db/survey.sqlite using schema_v2.sql.

Usage:
  python tools/init_survey_db.py
"""
import os
import sqlite3

ROOT = os.path.dirname(os.path.dirname(__file__))
DB_DIR = os.path.join(ROOT, 'db')
DB_PATH = os.path.join(DB_DIR, 'survey.sqlite')

SCHEMA_CANDIDATES = [
    os.path.join(ROOT, 'db', 'schema_v2.sql'),
    os.path.join(ROOT, 'agents', 'logic', 'sqlite-service', 'schema_v2.sql'),
]

def read_first_exists(paths):
    for p in paths:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                return f.read()
    raise SystemExit('schema_v2.sql not found in db/ or sqlite-service folder')

def main():
    os.makedirs(DB_DIR, exist_ok=True)
    sql = read_first_exists(SCHEMA_CANDIDATES)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute('PRAGMA foreign_keys=ON;')
        conn.executescript(sql)
        print('Initialized schema at', DB_PATH)
    finally:
        conn.close()

if __name__ == '__main__':
    main()

