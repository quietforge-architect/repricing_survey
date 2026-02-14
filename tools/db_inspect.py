import sqlite3
import json
import os
from datetime import datetime

DB = os.path.join(os.path.dirname(__file__), '..', 'db', 'survey.sqlite')

def to_iso(ms):
    try:
        return datetime.fromtimestamp(ms/1000).isoformat()
    except Exception:
        return str(ms)

def main():
    if not os.path.exists(DB):
        print(json.dumps({'error': 'db not found', 'path': DB}))
        return
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("SELECT id, submitted_at FROM responses ORDER BY id DESC LIMIT 5")
    rows = c.fetchall()
    out = []
    for rid, submitted_at in rows:
        c.execute("SELECT key, value FROM response_values WHERE response_id=?", (rid,))
        vals = {k: v for k, v in c.fetchall()}
        out.append({'response_id': rid, 'submitted_at': to_iso(submitted_at), 'values': vals})
    print(json.dumps({'count': len(out), 'items': out}, indent=2))
    conn.close()

if __name__ == '__main__':
    main()
