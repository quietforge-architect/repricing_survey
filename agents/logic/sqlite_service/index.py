# Small Flask + sqlite3 service to accept survey submissions (v2 schema only)
# Note: Uses built-in sqlite3, no extra deps needed beyond Flask

import os
import re
import sqlite3
import time
from datetime import datetime
from flask import Flask, request, jsonify

app = Flask(__name__)

DB_PATH = os.getenv('DB_PATH', os.path.join(os.path.dirname(__file__), '..', '..', '..', 'db', 'survey.sqlite'))
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
conn.execute('PRAGMA foreign_keys = ON')

ADMIN_TOKEN = os.getenv('API_ADMIN_TOKEN', '').strip()
SUBMIT_TOKEN = os.getenv('API_SUBMIT_TOKEN', '').strip()

# Ensure v2 schema exists
def ensure_schema_v2():
    try:
        schema_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'db', 'schema_v2.sql')
        if os.path.exists(schema_path):
            with open(schema_path, 'r') as f:
                sql = f.read()
            conn.executescript(sql)
            conn.commit()
    except Exception as e:
        print(f'[sqlite-service] ensureSchemaV2 skipped: {e}')

ensure_schema_v2()

def _extract_bearer(header_value):
    if not header_value:
        return ''
    if header_value.lower().startswith('bearer '):
        return header_value[7:].strip()
    return ''

def _match_token(candidate, expected):
    return bool(expected) and candidate == expected

def ensure_admin_auth():
    if not ADMIN_TOKEN:
        return None
    header_token = (
        request.headers.get('X-Admin-Token')
        or request.headers.get('X-Api-Key')
        or _extract_bearer(request.headers.get('Authorization'))
    )
    if _match_token(header_token, ADMIN_TOKEN):
        return None
    return jsonify({'ok': False, 'error': 'Unauthorized'}), 401

def validate_submit_token(payload):
    if not SUBMIT_TOKEN:
        return True
    candidate = (
        request.headers.get('X-Submit-Token')
        or request.headers.get('X-Api-Key')
        or _extract_bearer(request.headers.get('Authorization'))
    )
    if not candidate and isinstance(payload, dict):
        candidate = payload.get('_submit_token') or payload.get('submit_token')
    if not candidate:
        form = getattr(request, 'form', None)
        if form:
            candidate = form.get('_submit_token') or form.get('submit_token')
    return _match_token(candidate, SUBMIT_TOKEN)

def sanitize_value(v, allow_list):
    if v is None:
        return ''
    v = str(v).strip()
    v = re.sub(r'\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b', '<REDACTED>', v, flags=re.IGNORECASE)
    v = re.sub(r'\+?\d[\d\-\s\(\)]{6,}\d', '<REDACTED>', v)
    v = re.sub(r'\b(PO Box|P\.O\. Box)\s*\d+\b', '<REDACTED>', v, flags=re.IGNORECASE)
    v = re.sub(r'\b\d{1,5}\s+([A-Za-z0-9\.]{2,}\s?){1,6}\b(?:St(?:reet)?|Ave(?:nue)?|Blvd|Rd|Road|Lane|Ln|Drive|Dr|Court|Ct|Way|Terrace|Pl|Place)\b', '<REDACTED>', v, flags=re.IGNORECASE)
    for name in allow_list:
        if not name:
            continue
        pattern = r'\b' + re.escape(name) + r'\b'
        if re.search(pattern, v, re.IGNORECASE):
            return v
    v = re.sub(r'\b([A-Z][a-z\'`-]{1,30})\s+([A-Z][a-z\'`-]{1,30})(?:\s+([A-Z][a-z\'`-]{1,30}))?\b', lambda m: '<REDACTED>' if len(m.group(0)) < 60 else m.group(0), v)
    return v

MULTI_KEYS = ['model', 'features']

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
                payload[key] = values[0]
    if not validate_submit_token(payload):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    for token_key in ('_submit_token', 'submit_token'):
        if token_key in payload:
            payload.pop(token_key, None)
    id_ = 's_' + str(int(time.time() * 1000))
    created_at = int(time.time() * 1000)
    allow_list = [s.strip() for s in os.getenv('COMPANY_ALLOWLIST', '').split(',') if s.strip()]

    # Sanitize payload
    sanitized_obj = {}
    for k, val in payload.items():
        if re.search(r'name|email|phone|address|street|city|state|zip|postal', k, re.IGNORECASE):
            if isinstance(val, list):
                sanitized_obj[k] = [sanitize_value(v, allow_list) for v in val]
            else:
                sanitized_obj[k] = sanitize_value(val, allow_list)
        else:
            sanitized_obj[k] = val

    try:
        conn.execute('PRAGMA foreign_keys = ON')
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='responses'")
        has_responses = c.fetchone()
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='response_values'")
        has_values = c.fetchone()
        if not has_responses or not has_values:
            return jsonify({'success': False, 'error': 'v2 schema missing. Run init-db.'}), 503

        # Upsert survey
        survey_name = os.getenv('SURVEY_NAME', 'Amazon_Repricing_Feedback_Survey')
        survey_version = os.getenv('SURVEY_VERSION', 'v1')
        c.execute('SELECT id FROM surveys WHERE name = ? AND version = ?', (survey_name, survey_version))
        srow = c.fetchone()
        if not srow:
            c.execute('INSERT INTO surveys (name, version, created_at) VALUES (?, ?, ?)', (survey_name, survey_version, created_at))
            survey_id = c.lastrowid
        else:
            survey_id = srow[0]

        # Respondent
        import random
        respondent_hash = hex(random.randint(0, 2**64))[2:].zfill(16)[:16]
        c.execute('INSERT OR IGNORE INTO respondents (respondent_hash) VALUES (?)', (respondent_hash,))
        c.execute('SELECT id FROM respondents WHERE respondent_hash = ?', (respondent_hash,))
        respondent_id = c.fetchone()[0]

        # Response
        c.execute('INSERT OR IGNORE INTO responses (survey_id, respondent_id, submitted_at, source_submission_id) VALUES (?, ?, ?, ?)',
                  (survey_id, respondent_id, created_at, id_))
        c.execute('SELECT id FROM responses WHERE source_submission_id = ?', (id_,))
        response_id = c.fetchone()[0]

        # Questions + Values + Selections
        for key, raw_val in sanitized_obj.items():
            if not key:
                continue
            if key in ('_submit_token', 'submit_token'):
                continue
            c.execute('INSERT OR IGNORE INTO questions (survey_id, key, label, type) VALUES (?, ?, ?, ?)', (survey_id, key, key, 'text'))
            c.execute('SELECT id FROM questions WHERE survey_id = ? AND key = ?', (survey_id, key))
            qid = c.fetchone()[0]

            is_array = isinstance(raw_val, list)
            value_for_store = '; '.join(raw_val) if is_array else (str(raw_val) if raw_val is not None else '')
            c.execute('INSERT OR IGNORE INTO response_values (response_id, question_id, key, value) VALUES (?, ?, ?, ?)',
                      (response_id, qid, key, value_for_store))

            if key in MULTI_KEYS:
                items = raw_val if is_array else str(raw_val or '').split('; ')
                for it in items:
                    it = it.strip()
                    if it:
                        c.execute('INSERT OR IGNORE INTO response_selections (response_id, question_id, option_key, option_label) VALUES (?, ?, ?, ?)',
                                  (response_id, qid, str(it), None))

        conn.commit()
        return jsonify({'success': True, 'id': id_})
    except Exception as e:
        print(f'[sqlite-service] v2 insert failed: {e}')
        conn.rollback()
        return jsonify({'success': False, 'error': 'Insert failed'}), 500

@app.route('/public', methods=['GET'])
def public():
    return jsonify({'deprecated': True, 'message': 'Use /api/v2/responses and /api/v2/summary.'}), 410

@app.route('/api/health', methods=['GET'])
def health():
    try:
        c = conn.cursor()
        c.execute('SELECT 1')
        ok = c.fetchone()
        return jsonify({'ok': True, 'db': bool(ok)})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

def table_exists(name):
    try:
        c = conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,))
        return bool(c.fetchone())
    except:
        return False

def to_iso(ms):
    try:
        return datetime.fromtimestamp(ms / 1000).isoformat()
    except:
        return str(ms)

@app.route('/api/v2/responses', methods=['GET'])
def v2_responses():
    auth_error = ensure_admin_auth()
    if auth_error:
        return auth_error
    try:
        limit = max(1, min(1000, int(request.args.get('limit', 100))))
        offset = max(0, int(request.args.get('offset', 0)))
        has_v2 = table_exists('responses') and table_exists('response_values')
        if not has_v2:
            return jsonify({'ok': False, 'error': 'v2 schema missing. Run init-db.'}), 503
        c = conn.cursor()
        c.execute('SELECT id FROM responses ORDER BY id DESC LIMIT ? OFFSET ?', (limit, offset))
        ids = [r[0] for r in c.fetchall()]
        if not ids:
            return jsonify({'items': [], 'count': 0, 'limit': limit, 'offset': offset})
        placeholders = ','.join('?' * len(ids))
        c.execute(f'''
            SELECT r.id AS response_id, r.submitted_at, v.key, v.value
            FROM responses r
            JOIN response_values v ON v.response_id = r.id
            WHERE r.id IN ({placeholders})
            ORDER BY r.id DESC
        ''', ids)
        rows = c.fetchall()
        map_ = {}
        for row in rows:
            response_id, submitted_at, key, value = row
            if response_id not in map_:
                map_[response_id] = {'Timestamp': to_iso(submitted_at)}
            map_[response_id][key] = '' if value is None else str(value)
        items = list(map_.values())
        return jsonify({'items': items, 'count': len(items), 'limit': limit, 'offset': offset})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

@app.route('/api/v2/summary', methods=['GET'])
def v2_summary():
    auth_error = ensure_admin_auth()
    if auth_error:
        return auth_error
    try:
        has_v2 = table_exists('responses') and table_exists('response_values')
        if not has_v2:
            return jsonify({'ok': False, 'error': 'v2 schema missing. Run init-db.'}), 503
        out = {
            'generatedAt': datetime.now().isoformat(),
            'totalResponses': 0,
            'byExperience': {},
            'avgSatisfaction': None,
            'glitchCounts': {},
            'topFeatures': [],
            'freeTextCounts': {}
        }
        c = conn.cursor()
        c.execute('SELECT COUNT(*) FROM responses')
        out['totalResponses'] = c.fetchone()[0]
        c.execute("SELECT value, COUNT(*) FROM response_values WHERE key='experience' GROUP BY value")
        for row in c.fetchall():
            if row[0]:
                out['byExperience'][row[0]] = row[1]
        c.execute("SELECT value FROM response_values WHERE key='satisfaction'")
        sat_rows = c.fetchall()
        s_sum = 0
        s_cnt = 0
        for row in sat_rows:
            try:
                n = float(row[0])
                if n.isfinite():
                    s_sum += n
                    s_cnt += 1
            except:
                pass
        out['avgSatisfaction'] = round(s_sum / s_cnt, 2) if s_cnt else None
        c.execute("SELECT value, COUNT(*) FROM response_values WHERE key='glitch' GROUP BY value")
        for row in c.fetchall():
            if row[0]:
                out['glitchCounts'][row[0]] = row[1]

        # Features
        feat_map = {}
        has_sel = table_exists('response_selections')
        if has_sel:
            c.execute("SELECT option_key, COUNT(*) FROM response_selections rs JOIN questions q ON q.id=rs.question_id WHERE q.key='features' GROUP BY option_key")
            for row in c.fetchall():
                feat_map[str(row[0])] = row[1]
        else:
            c.execute("SELECT value FROM response_values WHERE key='features'")
            for row in c.fetchall():
                parts = [s.strip() for s in str(row[0] or '').split(';') if s.strip()]
                for p in parts:
                    feat_map[p] = feat_map.get(p, 0) + 1
        out['topFeatures'] = [{'name': name, 'count': count} for name, count in sorted(feat_map.items(), key=lambda x: x[1], reverse=True)[:15]]

        free_keys = ['painpoint', 'valuable_features', 'trust_ai_reason', 'feature_request', 'monitoring']
        placeholders = ','.join('?' * len(free_keys))
        c.execute(f"SELECT key, COUNT(*) FROM response_values WHERE key IN ({placeholders}) AND TRIM(COALESCE(value,''))!='' GROUP BY key", free_keys)
        for row in c.fetchall():
            out['freeTextCounts'][row[0]] = row[1]
        return jsonify(out)
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 3001))
    app.run(host='0.0.0.0', port=port, debug=False)
