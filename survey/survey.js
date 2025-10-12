const STORAGE_KEY = 'repricing_survey_state_v2';
const form = document.getElementById('surveyForm');
const pages = Array.from(document.querySelectorAll('.page'));
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const submitBtn = document.getElementById('submitBtn');
const progressEl = document.getElementById('progress');
const statusEl = document.getElementById('status');
const ACTION_URL = form.dataset.action;

let currentPage = 0;
let answers = loadState();
let sending = false;

prefillForm();
updateProgress();
refreshButtons();

prevBtn.addEventListener('click', () => {
  if (currentPage === 0 || sending) return;
  persistPage(currentPage);
  currentPage -= 1;
  showPage(currentPage);
});

nextBtn.addEventListener('click', async () => {
  if (sending) return;
  if (!(await validatePage(currentPage))) return;
  const payload = persistPage(currentPage);
  const isLast = currentPage >= pages.length - 1;
  if (!isLast) {
    await submitProgress(payload, { partial: true });
    currentPage += 1;
    showPage(currentPage);
  } else {
    // last page falls back to full submit
    submitBtn.click();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (sending) return;
  if (!(await validatePage(currentPage))) return;
  const payload = persistPage(currentPage);
  await submitProgress(payload, { partial: false });
});

function showPage(index) {
  pages.forEach((page, i) => page.classList.toggle('active', i === index));
  updateProgress();
  refreshButtons();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
  progressEl.textContent = `${currentPage + 1} / ${pages.length}`;
}

function refreshButtons() {
  prevBtn.disabled = currentPage === 0 || sending;
  const isLast = currentPage === pages.length - 1;
  nextBtn.hidden = isLast;
  submitBtn.hidden = !isLast;
  nextBtn.disabled = sending;
  submitBtn.disabled = sending;
}

async function validatePage(index) {
  const page = pages[index];
  const requiredInputs = Array.from(page.querySelectorAll('[required]'));
  for (const input of requiredInputs) {
    if (!input.value) {
      input.reportValidity();
      input.focus();
      return false;
    }
  }
  return true;
}

function persistPage(index) {
  const data = collectPageData(pages[index]);
  answers = { ...answers, ...data };
  saveState(answers);
  return { ...answers };
}

function collectPageData(page) {
  const data = {};
  const elements = Array.from(page.querySelectorAll('input, select, textarea'));
  const multiMap = {};

  elements.forEach((el) => {
    const name = el.name;
    if (!name) return;

    if (el.type === 'checkbox') {
      if (!multiMap[name]) multiMap[name] = [];
      if (el.checked) multiMap[name].push(el.value);
      data[name] = multiMap[name];
    } else if (el.type === 'radio') {
      if (el.checked) data[name] = el.value;
    } else {
      const value = typeof el.value === 'string' ? el.value.trim() : el.value;
      if (value !== '') data[name] = value;
      else delete data[name];
    }
  });

  return data;
}

async function submitProgress(payload, { partial }) {
  if (!ACTION_URL) {
    announce('No submission endpoint configured.');
    return;
  }

  sending = true;
  refreshButtons();
  announce(partial ? 'Saving progress…' : 'Sending final answers…');

  const submission = {
    ...payload,
    partial,
    page_index: currentPage,
    submitted_at: Date.now(),
  };

  try {
    const response = await fetch(ACTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json().catch(() => ({}));
    if (!partial) {
      announce('Thanks! Your answers are in. You can close this tab.');
      form.reset();
      answers = {};
      saveState(answers);
      currentPage = 0;
      showPage(currentPage);
    } else {
      announce('Progress saved. Keep going!');
    }
    return json;
  } catch (err) {
    console.warn('Survey submission failed:', err);
    announce('Could not reach the server. Your answers are saved locally—try again soon.', true);
  } finally {
    sending = false;
    refreshButtons();
  }
}

function announce(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle('status-error', isError);
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    // ignore storage errors (e.g., private mode)
  }
}

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) || {};
  } catch (_) {
    return {};
  }
}

function prefillForm() {
  if (!answers || typeof answers !== 'object') return;
  const elements = Array.from(form.querySelectorAll('input, select, textarea'));
  elements.forEach((el) => {
    const name = el.name;
    if (!name) return;
    const value = answers[name];
    if (value == null) return;

    if (el.type === 'checkbox') {
      el.checked = Array.isArray(value) ? value.includes(el.value) : Boolean(value);
    } else if (el.type === 'radio') {
      el.checked = el.value === value;
    } else {
      el.value = value;
    }
  });
}
