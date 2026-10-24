// ── State ─────────────────────────────────────────────────────────────────────
let lastResults = [];
let currentTab = 'screen';

// ── Preset Data ───────────────────────────────────────────────────────────────
const PRESETS = {
  ml: {
    title: 'Machine Learning Engineer',
    jd: 'We are looking for a Machine Learning Engineer with expertise in Python, TensorFlow, PyTorch, scikit-learn, NLP, deep learning, data preprocessing, model deployment, REST APIs, and SQL databases. Experience with Docker and cloud platforms (AWS/GCP) is a plus.',
    resumes: [
      { name: 'Priya Sharma', text: '5 years experience as ML engineer. Proficient in Python, TensorFlow, PyTorch, scikit-learn. Built NLP pipelines for sentiment analysis. Deployed models using REST APIs and Docker. Worked with AWS S3 and EC2. SQL expert.' },
      { name: 'Ravi Kumar', text: 'Data scientist with 3 years in Python, scikit-learn, and SQL. Familiar with basic deep learning using TensorFlow. Some experience with REST APIs. No cloud experience. Worked mostly in Excel and Tableau.' },
      { name: 'Ananya Singh', text: 'Backend developer specializing in Java and Spring Boot. Familiar with SQL and REST APIs. Recently started learning Python and machine learning basics. No experience with TensorFlow or deep learning.' },
      {name: 'Ayush Mali', text: 'Data Enginner  Specilaizing in AIML '}
    ]
  },
  web: {
    title: 'Full Stack Developer',
    jd: 'Seeking a Full Stack Developer proficient in React, Node.js, TypeScript, REST APIs, PostgreSQL, Redis, Docker, Git, and agile development methodologies.',
    resumes: [
      { name: 'Arjun Mehta', text: 'Full stack developer with 4 years of React and Node.js experience. Expert in TypeScript, PostgreSQL, REST API design. Used Redis for caching. Familiar with Docker and Git. Worked in agile sprints.' },
      { name: 'Deepika Patel', text: 'Frontend developer with 2 years in React and JavaScript. Basic Node.js knowledge. Used Git and worked in agile teams. No experience with TypeScript, Redis, or Docker.' },
      { name: 'Kabir Joshi', text: 'DevOps engineer with Docker, Git, and cloud infrastructure experience. Some REST API knowledge. No frontend or backend web development experience.' }
    ]
  },
  data: {
    title: 'Data Analyst',
    jd: 'Looking for a Data Analyst with skills in SQL, Python, Excel, Tableau, Power BI, data visualization, statistical analysis, and business intelligence reporting.',
    resumes: [
      { name: 'Sneha Iyer', text: 'Data analyst with 3 years using SQL, Python (pandas, matplotlib), Excel, and Tableau. Built Power BI dashboards. Strong statistical analysis background. Created business intelligence reports for C-level stakeholders.' },
      { name: 'Vikram Rao', text: 'Business analyst with strong Excel and SQL skills. Used some Tableau. Familiar with data visualization. No Python or Power BI experience. Focused on process analysis and documentation.' },
      { name: 'Meena Gupta', text: 'Marketing professional with Excel proficiency. Basic SQL for campaign reports. No Python, Tableau, or Power BI experience. Good presentation and storytelling skills.' }
    ]
  },
  pm: {
    title: 'Product Manager',
    jd: 'Hiring a Product Manager with experience in agile, user research, roadmap planning, stakeholder management, Jira, analytics, A/B testing, and cross-functional team leadership.',
    resumes: [
      { name: 'Rohit Nair', text: 'Product manager with 4 years at SaaS companies. Expert in agile and Jira. Conducted user research and usability studies. Led roadmap planning and stakeholder presentations. A/B tested features using Mixpanel analytics.' },
      { name: 'Lakshmi Bose', text: 'Project manager transitioning to product. Familiar with agile, Jira, stakeholder management. No formal user research. Basic analytics experience. Led small cross-functional teams.' },
      { name: 'Aman Verma', text: 'Software engineer with Jira and agile experience. Strong technical background. No product management, user research, or roadmap experience.' }
    ]
  }
};

// ── API Helpers ───────────────────────────────────────────────────────────────
async function api(url, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type + ' show';
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Navigation ────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const tab = item.dataset.tab;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    currentTab = tab;
    if (tab === 'database') loadDatabase();
    if (tab === 'results') renderResults();
    if (tab === 'history') loadHistory();
    if (tab === 'log') loadLog();
  });
});

// ── Sidebar Stats ─────────────────────────────────────────────────────────────
async function refreshSidebarStats() {
  const s = await api('/api/stats');
  document.getElementById('sb-total').textContent = s.total || 0;
  document.getElementById('sb-screenings').textContent = s.screenings || 0;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function closeModal() { document.getElementById('modal').style.display = 'none'; }
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});

// ── Avatar Helper ─────────────────────────────────────────────────────────────
function initials(name) {
  return name.split(' ').map(p => p[0] || '').join('').slice(0, 2).toUpperCase();
}

function scoreClass(score) {
  if (score === null || score === undefined) return 'score-none';
  if (score >= 70) return 'score-high';
  if (score >= 40) return 'score-mid';
  return 'score-low';
}

// ── Load Preset ───────────────────────────────────────────────────────────────
async function loadPreset(key) {
  if (!key) return;
  const p = PRESETS[key];
  document.getElementById('job-title').value = p.title;
  document.getElementById('jd-text').value = p.jd;

  // Clear and re-add preset resumes
  for (const r of p.resumes) {
    await api('/api/candidates', 'POST', { name: r.name, resume_text: r.text });
  }
  toast(`Loaded "${p.title}" preset with ${p.resumes.length} candidates`, 'success');
  await loadQueue();
  await refreshSidebarStats();
}

// ── Add Candidate ─────────────────────────────────────────────────────────────
async function addCandidate() {
  const name = document.getElementById('c-name').value.trim();
  const text = document.getElementById('c-resume').value.trim();
  if (!name || !text) { toast('Enter candidate name and resume text', 'error'); return; }

  const res = await api('/api/candidates', 'POST', { name, resume_text: text });
  if (res.error) { toast(res.error, 'error'); return; }

  toast(`${name} added to database`, 'success');
  clearForm();
  await loadQueue();
  await refreshSidebarStats();
}

function clearForm() {
  document.getElementById('c-name').value = '';
  document.getElementById('c-resume').value = '';
}

// ── Queue ─────────────────────────────────────────────────────────────────────
async function loadQueue() {
  const candidates = await api('/api/candidates');
  const el = document.getElementById('queue-list');
  if (!candidates.length) {
    el.innerHTML = '<div class="empty-state">No candidates yet. Add resumes above or load a preset.</div>';
    return;
  }
  el.innerHTML = candidates.map(c => `
    <div class="candidate-row">
      <div class="c-avatar">${initials(c.name)}</div>
      <div class="c-info">
        <div class="c-name">${c.name}</div>
        <div class="c-meta">${c.resume_text.slice(0, 80)}…</div>
      </div>
      <button class="btn-icon" onclick="removeCandidate(${c.id}, '${c.name.replace(/'/g, "\\'")}')" title="Remove">✕</button>
    </div>
  `).join('');
}

async function removeCandidate(id, name) {
  await api(`/api/candidates/${id}`, 'DELETE');
  toast(`${name} removed`);
  await loadQueue();
  await refreshSidebarStats();
}

// ── Run Screening ─────────────────────────────────────────────────────────────
async function runScreening() {
  const jd = document.getElementById('jd-text').value.trim();
  const title = document.getElementById('job-title').value.trim() || 'Untitled Role';
  if (!jd) { toast('Please enter a job description', 'error'); return; }

  const btn = document.querySelector('.btn-run');
  btn.textContent = '⏳ Screening…';
  btn.disabled = true;

  const res = await api('/api/screen', 'POST', { job_description: jd, job_title: title });
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg> Run Screening';
  btn.disabled = false;

  if (res.error) { toast(res.error, 'error'); return; }

  lastResults = res.results;
  toast(`Screening complete — ${res.results.length} candidates ranked`, 'success');
  await refreshSidebarStats();

  // Switch to results tab
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelector('[data-tab="results"]').classList.add('active');
  document.getElementById('tab-results').classList.add('active');
  renderResults();
}

// ── Render Results ────────────────────────────────────────────────────────────
function renderResults() {
  const el = document.getElementById('results-list');
  if (!lastResults.length) {
    el.innerHTML = '<div class="empty-state panel">Run a screening session to see ranked results here.</div>';
    return;
  }

  el.innerHTML = lastResults.map((r, i) => {
    const rank = i + 1;
    const barColor = r.score >= 70 ? '#34d399' : r.score >= 40 ? '#fbbf24' : '#f87171';
    const pctColor = r.score >= 70 ? '#34d399' : r.score >= 40 ? '#fbbf24' : '#f87171';
    const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';

    return `
      <div class="result-card ${rankClass}">
        <div class="rank-badge">${rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}</div>
        <div class="result-body">
          <div class="result-name">
            ${r.name}
            ${rank === 1 ? '<span class="top-badge">Top Match</span>' : ''}
          </div>
          <div class="score-bar-row">
            <div class="score-bar-wrap">
              <div class="score-bar" style="width:${r.score}%;background:${barColor}"></div>
            </div>
            <span class="score-pct" style="color:${pctColor}">${r.score}%</span>
          </div>
          <div class="kw-section">
            <div class="kw-label">Matched keywords</div>
            <div>${r.matched.map(k => `<span class="kw-match">${k}</span>`).join('')}</div>
          </div>
          ${r.missed.length ? `
          <div class="kw-section" style="margin-top:6px">
            <div class="kw-label">Missing keywords</div>
            <div>${r.missed.map(k => `<span class="kw-miss">${k}</span>`).join('')}</div>
          </div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ── Database Tab ──────────────────────────────────────────────────────────────
async function loadDatabase() {
  const [candidates, stats] = await Promise.all([api('/api/candidates'), api('/api/stats')]);

  // Stats cards
  document.getElementById('db-stats').innerHTML = `
    <div class="stat-card"><span class="stat-val">${stats.total}</span><span class="stat-lbl">Total Candidates</span></div>
    <div class="stat-card"><span class="stat-val">${stats.screened}</span><span class="stat-lbl">Screened</span></div>
    <div class="stat-card"><span class="stat-val">${stats.avg_score !== null ? stats.avg_score + '%' : '—'}</span><span class="stat-lbl">Avg. Match</span></div>
    <div class="stat-card"><span class="stat-val">${stats.screenings}</span><span class="stat-lbl">Screenings Run</span></div>
  `;

  const el = document.getElementById('db-list');
  if (!candidates.length) { el.innerHTML = '<div class="empty-state">Database is empty.</div>'; return; }

  el.innerHTML = candidates.map(c => {
    const sc = c.last_score !== null && c.last_score !== undefined;
    const cls = sc ? scoreClass(c.last_score) : 'score-none';
    const label = sc ? `${c.last_score}% match` : 'Not screened';
    return `
      <div class="candidate-row">
        <div class="c-avatar">${initials(c.name)}</div>
        <div class="c-info">
          <div class="c-name">${c.name}</div>
          <div class="c-meta">Added ${c.added_at}${c.last_screened ? ' · Last screened ' + c.last_screened : ''}</div>
        </div>
        <span class="c-score-badge ${cls}">${label}</span>
        <button class="btn-icon" onclick="viewCandidate(${c.id})" style="margin-left:6px" title="View">👁</button>
        <button class="btn-icon" onclick="removeCandidate(${c.id}, '${c.name.replace(/'/g, "\\'")}')" title="Delete">✕</button>
      </div>
    `;
  }).join('');
}

async function viewCandidate(id) {
  const candidates = await api('/api/candidates');
  const c = candidates.find(x => x.id === id);
  if (!c) return;
  document.getElementById('modal-body').innerHTML = `
    <h2>${c.name}</h2>
    <p style="font-size:13px;color:var(--text2);margin-bottom:12px">Added: ${c.added_at}</p>
    <p style="font-size:14px;line-height:1.8;color:var(--text2)">${c.resume_text}</p>
    ${c.last_score !== null ? `<div style="margin-top:16px;padding:12px 16px;background:var(--bg3);border-radius:8px;font-size:13px">Last match score: <strong style="color:var(--accent)">${c.last_score}%</strong></div>` : ''}
  `;
  document.getElementById('modal').style.display = 'flex';
}

// ── History Tab ───────────────────────────────────────────────────────────────
async function loadHistory() {
  const sessions = await api('/api/screenings');
  const el = document.getElementById('history-list');
  if (!sessions.length) { el.innerHTML = '<div class="empty-state">No screening history yet.</div>'; return; }

  el.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Job Title</th>
          <th>Date</th>
          <th>Candidates</th>
          <th>Top Score</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${sessions.map(s => `
          <tr onclick="viewScreening(${s.id})">
            <td style="color:var(--text3)">${s.id}</td>
            <td style="color:var(--text);font-weight:500">${s.job_title}</td>
            <td>${s.created_at}</td>
            <td>${s.candidate_count}</td>
            <td><span class="c-score-badge ${scoreClass(s.top_score)}">${s.top_score !== null ? s.top_score + '%' : '—'}</span></td>
            <td><span class="view-btn">View →</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function viewScreening(id) {
  const data = await api(`/api/screenings/${id}`);
  const { screening, results } = data;
  document.getElementById('modal-body').innerHTML = `
    <h2>${screening.job_title}</h2>
    <p style="font-size:13px;color:var(--text2);margin-bottom:16px">${screening.created_at}</p>
    <div style="margin-bottom:16px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:6px">Job Description</div>
      <p style="font-size:13px;color:var(--text2);line-height:1.7">${screening.job_description}</p>
    </div>
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:10px">Results</div>
    ${results.map((r, i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="color:var(--text3);min-width:20px;font-size:13px">${i+1}</span>
        <span style="flex:1;font-size:14px;font-weight:500">${r.name}</span>
        <span class="c-score-badge ${scoreClass(r.score)}">${r.score}%</span>
      </div>
    `).join('')}
  `;
  document.getElementById('modal').style.display = 'flex';
}

// ── Activity Log ──────────────────────────────────────────────────────────────
async function loadLog() {
  const logs = await api('/api/log');
  const el = document.getElementById('log-list');
  if (!logs.length) { el.innerHTML = '<div class="empty-state">No activity yet.</div>'; return; }

  el.innerHTML = logs.map(l => `
    <div class="log-entry">
      <span class="log-time">${l.created_at.split(' ')[1]}</span>
      <span class="log-action log-${l.action}">${l.action}</span>
      <span class="log-details">${l.details}</span>
    </div>
  `).join('');
}

// ── Init ──────────────────────────────────────────────────────────────────────
(async function init() {
  await loadQueue();
  await refreshSidebarStats();
})();
