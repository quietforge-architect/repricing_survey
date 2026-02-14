const Database = require('better-sqlite3');
const fetch = global.fetch;
const { test, expect } = require('./fixtures');
const { completeSurvey } = require('./helpers');

test.describe('Survey end-to-end workflow', () => {
  test('persists completed submission to sqlite with selections', async ({ page, surveyEnv }) => {
    const { data } = await completeSurvey(page, surveyEnv);

    const db = new Database(surveyEnv.dbPath);
    const latest = db.prepare('SELECT id FROM responses ORDER BY id DESC LIMIT 1').get();
    expect(latest).toBeTruthy();

    const values = db.prepare('SELECT key, value FROM response_values WHERE response_id = ?').all(latest.id);
    const map = {};
    for (const row of values) map[row.key] = row.value;

    expect(map.years_selling).toBe(data.years_selling);
    expect(map.selling_commitment).toBe(data.selling_commitment);
    expect(map.partial).toBe('false');
    expect(map.contact).toBe(data.contact);
    expect(map.sourcing_style).toContain(data.sourcing_style[0]);

    const selections = db.prepare('SELECT option_key FROM response_selections WHERE response_id = ?').all(latest.id);
    const picked = selections.map((row) => String(row.option_key));
    for (const option of data.sourcing_style) {
      expect(picked).toContain(option);
    }
    for (const option of data.safety_nets) {
      expect(picked).toContain(option);
    }

    const partialRows = db
      .prepare("SELECT COUNT(*) AS count FROM response_values WHERE key='partial' AND value='true'")
      .get();
    expect(partialRows.count).toBeGreaterThan(0);

    db.close();
  });

  test('aggregates admin endpoints after submission', async ({ page, surveyEnv }) => {
    const { data } = await completeSurvey(page, surveyEnv, {
      contact: `summary-${Date.now()}@example.com`,
    });

    const responsesRes = await fetch(
      `http://127.0.0.1:${surveyEnv.apiPort}/api/v2/responses?limit=10&offset=0`
    );
    expect(responsesRes.status).toBe(200);
    const responsesJson = await responsesRes.json();
    expect(responsesJson.items.length).toBeGreaterThan(0);
    const target = responsesJson.items.find((item) => item.contact === data.contact);
    expect(target).toBeTruthy();
    expect(target.partial).toBe('false');
    expect(target.years_selling).toBe(data.years_selling);

    const summaryRes = await fetch(`http://127.0.0.1:${surveyEnv.apiPort}/api/v2/summary`);
    expect(summaryRes.status).toBe(200);
    const summary = await summaryRes.json();

    expect(summary.totalResponses).toBeGreaterThan(0);
    expect(summary.counts.years_selling[data.years_selling]).toBeGreaterThan(0);
    expect(summary.counts.selling_commitment[data.selling_commitment]).toBeGreaterThan(0);
    expect(summary.averages.weekly_hours.count).toBeGreaterThan(0);
    expect(summary.averages.weekly_hours.mean).toBeGreaterThan(0);

    const multiNames = summary.multiSelectTop.sourcing_style.map((entry) => entry.name);
    for (const option of data.sourcing_style) {
      expect(multiNames).toContain(option);
    }
  });
});
