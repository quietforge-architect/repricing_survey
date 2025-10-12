PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  version TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS respondents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  respondent_hash TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  survey_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  label TEXT,
  type TEXT,
  UNIQUE(survey_id, key),
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  survey_id INTEGER NOT NULL,
  respondent_id INTEGER NOT NULL,
  submitted_at INTEGER,
  source_submission_id TEXT UNIQUE,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
  FOREIGN KEY (respondent_id) REFERENCES respondents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS response_values (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  response_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  UNIQUE(response_id, key),
  FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questions_survey ON questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_values_response ON response_values(response_id);
CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_respondent ON responses(respondent_id);

-- Multi-select option catalog
CREATE TABLE IF NOT EXISTS question_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  label TEXT,
  sort_order INTEGER,
  UNIQUE(question_id, key),
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Normalized selections for multi-select answers
CREATE TABLE IF NOT EXISTS response_selections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  response_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  option_key TEXT NOT NULL,
  option_label TEXT,
  UNIQUE(response_id, question_id, option_key),
  FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qopts_q ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_rsel_resp ON response_selections(response_id);
CREATE INDEX IF NOT EXISTS idx_rsel_q ON response_selections(question_id);
