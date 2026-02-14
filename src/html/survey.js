// Modular JS for survey.html
// Configure this to your Apps Script /exec URL or leave blank and set at runtime.
const SURVEY_ENDPOINT = window.SURVEY_ENDPOINT || '';
const form = document.getElementById('repricing-survey');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new URLSearchParams(new FormData(form));
  const endpoint = SURVEY_ENDPOINT || form.getAttribute('action') || '';
  if (!endpoint) {
    alert('Survey endpoint not configured. Please set SURVEY_ENDPOINT in the page.');
    return;
  }
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: data
    });
    if (!res.ok) throw new Error('Network response was not ok');
    const json = await res.json();
    if (json && json.pubId) {
      // clear draft
      localStorage.removeItem('repricingSurveyDraft');
      // Show pending notice to user — public view requires admin approval.
      const pendingHtml = document.createElement('div');
      pendingHtml.innerHTML = '<h2>Thanks — your response was received</h2><p>Your submission is pending review for public sharing. It has been assigned ID: <code>' + encodeURIComponent(json.pubId) + '</code>.</p><p>If approved, it will appear on the public responses page.</p>';
      form.style.display = 'none';
      document.body.insertBefore(pendingHtml, document.body.firstChild);
    } else {
      alert('Submission saved. Thank you.');
    }
  } catch (err) {
    console.error(err);
    alert('Submission failed: ' + (err.message || 'network error'));
  }
});

// Autosave logic
form.addEventListener('input', () => {
  localStorage.setItem('repricingSurveyDraft', JSON.stringify(Object.fromEntries(new FormData(form))));
});

window.addEventListener('DOMContentLoaded', () => {
  const draft = localStorage.getItem('repricingSurveyDraft');
  if (draft) {
    Object.entries(JSON.parse(draft)).forEach(([k, v]) => {
      if (form[k]) form[k].value = v;
    });
  }
});

const isLocalPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname);

if ('serviceWorker' in navigator && !isLocalPreview) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .catch((err) => console.warn('Service worker registration failed:', err));
  });
} else if (isLocalPreview) {
  console.info('Skipping service worker registration for live preview.');
}
