from flask import Flask, request, jsonify
import sqlite3
import os
import time
import re
from datetime import datetime

app = Flask(__name__)

DB_PATH = os.environ.get('DB_PATH', os.path.join(os.path.dirname(__file__), '..', '..', '..', 'db', 'survey.sqlite'))
ADMIN_TOKEN = os.environ.get('API_ADMIN_TOKEN', '').strip()
SUBMIT_TOKEN = os.environ.get('API_SUBMIT_TOKEN', '').strip()

def get_db():
    db = sqlite3.connect(DB_PATH)
    db.execute('PRAGMA foreign_keys = ON')
    return db

def ensure_schema_v2():
    db = get_db()
    schema_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'db', 'schema_v2.sql')
    if os.path.exists(schema_path):
        with open(schema_path, 'r') as f:
            sql = f.read()
        db.executescript(sql)
    db.close()

ensure_schema_v2()

def sanitize_value(v, allow_list):
    if v is None:
        return ''
    v = str(v).strip()
    v = re.sub(r'\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b', '<REDACTED>', v, flags=re.IGNORECASE)
    v = re.sub(r'\+?\d[\d\-\s\(\)]{6,}\d', '<REDACTED>', v)
    v = re.sub(r'\b(PO Box|P\.O\. Box)\s*\d+\b', '<REDACTED>', v, flags=re.IGNORECASE)
    v = re.sub(r'\b\d{1,5}\s+([A-Za-z0-9\.]{2,}\s?){1,6}\b(?:St(?:reet)?|Ave(?:nue)?|Blvd|Rd|Road|Lane|Ln|Drive|Dr|Court|Ct|Way|Terrace|Pl|Place)\b', '<REDACTED>', v, flags=re.IGNORECASE)
    for name in allow_list:
        if name:
            pattern = r'\b' + re.escape(name) + r'\b'
            if re.search(pattern, v, re.IGNORECASE):
                return v
    v = re.sub(r'\b([A-Z][a-z\'`-]{1,30})\s+([A-Z][a-z\'`-]{1,30})(?:\s+([A-Z][a-z\'`-]{1,30}))?\b', lambda m: '<REDACTED>' if len(m.group(0)) < 60 else m.group(0), v)
    return v

MULTI_KEYS = ['model', 'features']
TOKEN_FIELDS = {'_submit_token', 'submit_token'}

def _extract_bearer(header_value):
    if not header_value:
        return ''
    if header_value.lower().startswith('bearer '):
        return header_value[7:].strip()
    return ''

def ensure_admin_auth():
    if not ADMIN_TOKEN:
        return None
    candidate = (
        request.headers.get('X-Admin-Token')
        or request.headers.get('X-Api-Key')
        or _extract_bearer(request.headers.get('Authorization', ''))
    )
    if candidate == ADMIN_TOKEN:
        return None
    return jsonify({'ok': False, 'error': 'Unauthorized'}), 401

def validate_submit_token(payload):
    if not SUBMIT_TOKEN:
        return True
    candidate = (
        request.headers.get('X-Submit-Token')
        or request.headers.get('X-Api-Key')
        or _extract_bearer(request.headers.get('Authorization', ''))
    )
    if not candidate and isinstance(payload, dict):
        candidate = payload.get('_submit_token') or payload.get('submit_token')
    if not candidate and getattr(request, 'form', None):
        candidate = request.form.get('_submit_token') or request.form.get('submit_token')
    if candidate == SUBMIT_TOKEN:
        if isinstance(payload, dict):
            payload.pop('_submit_token', None)
            payload.pop('submit_token', None)
        return True
    return False

@app.route('/submit', methods=['POST'])
def submit():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        payload = {}
    if not payload and request.form:
        payload = {}
        for key in request.form.keys():
            values = request.form.getlist(key)
            if len(values) > 1:
                payload[key] = values
            else:
                payload[key] = request.form.get(key)
    if not validate_submit_token(payload):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    id_ = 's_' + str(int(time.time() * 1000))
    created_at = int(time.time() * 1000)
    allow_list = [s.strip() for s in os.environ.get('COMPANY_ALLOWLIST', '').split(',') if s.strip()]

    sanitized_obj = {}
    for k, val in payload.items():
        if k in TOKEN_FIELDS:
            continue
        if re.search(r'name|email|phone|address|street|city|state|zip|postal', k, re.IGNORECASE):
            if isinstance(val, list):
                sanitized_obj[k] = [sanitize_value(v, allow_list) for v in val]
            else:
                sanitized_obj[k] = sanitize_value(val, allow_list)
        else:
            sanitized_obj[k] = val

    try:
        db = get_db()
        cursor = db.cursor()

        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='responses'")
        if not cursor.fetchone():
            return jsonify({'success': False, 'error': 'v2 schema missing. Run init-db.'}), 503
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='response_values'")
        if not cursor.fetchone():
            return jsonify({'success': False, 'error': 'v2 schema missing. Run init-db.'}), 503

        # Upsert survey
        survey_name = os.environ.get('SURVEY_NAME', 'Amazon_Repricing_Feedback_Survey')
        survey_version = os.environ.get('SURVEY_VERSION', 'v1')
        cursor.execute('SELECT id FROM surveys WHERE name = ? AND version = ?', (survey_name, survey_version))
        row = cursor.fetchone()
        if not row:
            cursor.execute('INSERT INTO surveys (name, version, created_at) VALUES (?, ?, ?)', (survey_name, survey_version, created_at))
            survey_id = cursor.lastrowid
        else:
            survey_id = row[0]

        # Respondent
        import random
        respondent_hash = hex(random.randint(0, 2**64))[2:].zfill(16)[:16]
        cursor.execute('INSERT OR IGNORE INTO respondents (respondent_hash) VALUES (?)', (respondent_hash,))
        cursor.execute('SELECT id FROM respondents WHERE respondent_hash = ?', (respondent_hash,))
        respondent_id = cursor.fetchone()[0]

        # Response
        cursor.execute('INSERT OR IGNORE INTO responses (survey_id, respondent_id, submitted_at, source_submission_id) VALUES (?, ?, ?, ?)',
                       (survey_id, respondent_id, created_at, id_))
        cursor.execute('SELECT id FROM responses WHERE source_submission_id = ?', (id_,))
        response_id = cursor.fetchone()[0]

        # Questions + Values + Selections
        for key, raw_val in sanitized_obj.items():
            if not key:
                continue
            cursor.execute('INSERT OR IGNORE INTO questions (survey_id, key, label, type) VALUES (?, ?, ?, ?)', (survey_id, key, key, 'text'))
            cursor.execute('SELECT id FROM questions WHERE survey_id = ? AND key = ?', (survey_id, key))
            qid = cursor.fetchone()[0]

            is_array = isinstance(raw_val, list)
            value_for_store = '; '.join(raw_val) if is_array else str(raw_val or '')
            cursor.execute('INSERT OR IGNORE INTO response_values (response_id, question_id, key, value) VALUES (?, ?, ?, ?)',
                           (response_id, qid, key, value_for_store))

            if key in MULTI_KEYS:
                items = raw_val if is_array else str(raw_val or '').split('; ')
                items = [s.strip() for s in items if s.strip()]
                for it in items:
                    cursor.execute('INSERT OR IGNORE INTO response_selections (response_id, question_id, option_key, option_label) VALUES (?, ?, ?, ?)',
                                   (response_id, qid, str(it), None))

        db.commit()
        db.close()
        return jsonify({'success': True, 'id': id_})
    except Exception as e:
        print(f'Insert failed: {e}')
        return jsonify({'success': False, 'error': 'Insert failed'}), 500

@app.route('/api/health')
def health():
    try:
        db = get_db()
        db.execute('SELECT 1')
        db.close()
        return jsonify({'ok': True, 'db': True})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

@app.route('/api/v2/responses')
def responses():
    auth_error = ensure_admin_auth()
    if auth_error:
        return auth_error
    try:
        limit = max(1, min(1000, int(request.args.get('limit', 100))))
        offset = max(0, int(request.args.get('offset', 0)))
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='responses'")
        if not cursor.fetchone():
            return jsonify({'ok': False, 'error': 'v2 schema missing. Run init-db.'}), 503
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='response_values'")
        if not cursor.fetchone():
            return jsonify({'ok': False, 'error': 'v2 schema missing. Run init-db.'}), 503

        cursor.execute('SELECT id FROM responses ORDER BY id DESC LIMIT ? OFFSET ?', (limit, offset))
        ids = [r[0] for r in cursor.fetchall()]
        if not ids:
            return jsonify({'items': [], 'count': 0, 'limit': limit, 'offset': offset})

        placeholders = ','.join('?' * len(ids))
        cursor.execute(f'''
            SELECT r.id AS response_id, r.submitted_at, v.key, v.value
            FROM responses r
            JOIN response_values v ON v.response_id = r.id
            WHERE r.id IN ({placeholders})
            ORDER BY r.id DESC
        ''', ids)
        rows = cursor.fetchall()
        map_ = {}
        for row in rows:
            rid = row[0]
            if rid not in map_:
                map_[rid] = {'Timestamp': datetime.fromtimestamp(row[1] / 1000).isoformat()}
            map_[rid][row[2]] = str(row[3] or '')
        items = list(map_.values())
        db.close()
        return jsonify({'items': items, 'count': len(items), 'limit': limit, 'offset': offset})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

@app.route('/api/v2/summary')
def summary():
    auth_error = ensure_admin_auth()
    if auth_error:
        return auth_error
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='responses'")
        if not cursor.fetchone():
            return jsonify({'ok': False, 'error': 'v2 schema missing. Run init-db.'}), 503
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='response_values'")
        if not cursor.fetchone():
            return jsonify({'ok': False, 'error': 'v2 schema missing. Run init-db.'}), 503

        out = {'generatedAt': datetime.now().isoformat(), 'totalResponses': 0, 'byExperience': {}, 'avgSatisfaction': None, 'glitchCounts': {}, 'topFeatures': [], 'freeTextCounts': {}}
        cursor.execute('SELECT COUNT(*) FROM responses')
        out['totalResponses'] = cursor.fetchone()[0]

        cursor.execute("SELECT value, COUNT(*) FROM response_values WHERE key='experience' GROUP BY value")
        for row in cursor.fetchall():
            if row[0]:
                out['byExperience'][row[0]] = row[1]

        cursor.execute("SELECT value FROM response_values WHERE key='satisfaction'")
        sat_rows = cursor.fetchall()
        s_sum = 0
        s_cnt = 0
        for r in sat_rows:
            try:
                n = float(r[0])
                s_sum += n
                s_cnt += 1
            except:
                pass
        out['avgSatisfaction'] = round(s_sum / s_cnt, 2) if s_cnt else None

        cursor.execute("SELECT value, COUNT(*) FROM response_values WHERE key='glitch' GROUP BY value")
        for row in cursor.fetchall():
            if row[0]:
                out['glitchCounts'][row[0]] = row[1]

        feat_map = {}
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='response_selections'")
        has_sel = cursor.fetchone()
        if has_sel:
            cursor.execute("SELECT rs.option_key, COUNT(*) FROM response_selections rs JOIN questions q ON q.id=rs.question_id WHERE q.key='features' GROUP BY rs.option_key")
            for row in cursor.fetchall():
                feat_map[str(row[0])] = row[1]
        else:
            cursor.execute("SELECT value FROM response_values WHERE key='features'")
            for row in cursor.fetchall():
                parts = str(row[0] or '').split('; ')
                for p in parts:
                    p = p.strip()
                    if p:
                        feat_map[p] = feat_map.get(p, 0) + 1

        out['topFeatures'] = sorted(feat_map.items(), key=lambda x: x[1], reverse=True)[:15]
        out['topFeatures'] = [{'name': k, 'count': v} for k, v in out['topFeatures']]

        free_keys = ['painpoint', 'valuable_features', 'trust_ai_reason', 'feature_request', 'monitoring']
        placeholders = ','.join('?' * len(free_keys))
        cursor.execute(f"SELECT key, COUNT(*) FROM response_values WHERE key IN ({placeholders}) AND TRIM(COALESCE(value,''))!='' GROUP BY key", free_keys)
        for row in cursor.fetchall():
            out['freeTextCounts'][row[0]] = row[1]

        db.close()
        return jsonify(out)
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=port, debug=False)
