#!/usr/bin/env python3
"""
Insert N synthetic responses directly into the v2 sqlite DB used by the project.
This mirrors sqlite-service insert logic but uses Python's sqlite3 to avoid native Node deps.
"""
import sqlite3, time, os

DB = os.path.join(os.path.dirname(__file__), '..', 'db', 'survey.sqlite')
DB = os.path.normpath(DB)
N = int(os.environ.get('N', '30'))

def ensure_conn():
    if not os.path.exists(DB):
        raise SystemExit('DB not found: ' + DB)
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def insert_one(conn, i):
    cur = conn.cursor()
    created_at = int(time.time() * 1000)
    # survey
    cur.execute("SELECT id FROM surveys WHERE name=? AND version=?", ('Amazon_Repricing_Feedback_Survey','v1'))
    row = cur.fetchone()
    if row is None:
        cur.execute("INSERT INTO surveys (name, version, created_at) VALUES (?, ?, ?)", ('Amazon_Repricing_Feedback_Survey','v1', created_at))
        survey_id = cur.lastrowid
    else:
        survey_id = row['id']

    # respondent
    respondent_hash = ('r%016x' % (i + int(time.time())))[:16]
    cur.execute('INSERT OR IGNORE INTO respondents (respondent_hash) VALUES (?)', (respondent_hash,))
    cur.execute('SELECT id FROM respondents WHERE respondent_hash=?', (respondent_hash,))
    respondent_id = cur.fetchone()['id']

    # response
    source_id = 'py_' + str(int(time.time()*1000)) + '_' + str(i)
    cur.execute('INSERT OR IGNORE INTO responses (survey_id, respondent_id, submitted_at, source_submission_id) VALUES (?, ?, ?, ?)', (survey_id, respondent_id, created_at, source_id))
    cur.execute('SELECT id FROM responses WHERE source_submission_id=?', (source_id,))
    response_id = cur.fetchone()['id']

    # questions/values
    def ensure_question(key):
        cur.execute('SELECT id FROM questions WHERE survey_id=? AND key=?', (survey_id, key))
        r = cur.fetchone()
        if r: return r['id']
        cur.execute('INSERT INTO questions (survey_id, key, label, type) VALUES (?, ?, ?, ?)', (survey_id, key, key, 'text'))
        return cur.lastrowid

    fields = {
        'experience': ['1–3 years','3–5 years','5+ years'][i % 3],
        'sku_count': str(100 + i),
        'model': 'Wholesale',
        'model_other': 'py stress ' + str(i),
        'repricer': 'py repricer ' + str(i),
        'keepa': 'Paid Plan',
        'satisfaction': str((i % 5) + 1),
        'painpoint': 'pain ' + str(i),
        'glitch': 'No',
        'glitch_details': 'none',
        'style': 'Hybrid',
        'features': 'Speed; Profit',
        'valuable_features': 'valuable ' + str(i),
        'ai_used': 'No',
        'ai_improvement': 'No',
        'trust_ai': 'Maybe',
        'trust_ai_reason': 'reason ' + str(i),
        'missing_data': 'missing ' + str(i),
        'trust_features': 'audit log',
        'local_tool': 'Maybe',
        'privacy': str((i % 5) + 1),
        'monitoring': 'monitor ' + str(i),
        'feature_request': 'request ' + str(i),
        'anon_data': 'Yes',
        'contact': 'py' + str(i) + '@example.com'
    }

    for k, v in fields.items():
        qid = ensure_question(k)
        cur.execute('INSERT OR IGNORE INTO response_values (response_id, question_id, key, value) VALUES (?, ?, ?, ?)', (response_id, qid, k, v))

    conn.commit()

def main():
    conn = ensure_conn()
    for i in range(N):
        insert_one(conn, i)
        if i and i % 10 == 0:
            print('inserted', i)
    print('done inserted', N)

if __name__ == '__main__':
    main()
