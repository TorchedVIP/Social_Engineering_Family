// === CLUE BROWSER ===
let feedData = [];
let activeFilter = 'easy';

const feedEl = document.getElementById('feed');
const hardNoteEl = document.getElementById('hard-note');

document.addEventListener('DOMContentLoaded', () => {
  loadFeed();
  setupFilters();
});

function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderFeed();
    });
  });
}

async function loadFeed() {
  feedEl.innerHTML = '<p class="loading">Loading feed…</p>';
  try {
    const res = await fetch('/api/clues');
    feedData = await res.json();
    renderFeed();
  } catch (err) {
    console.error('Failed to load clues:', err);
    feedEl.innerHTML = '<p class="loading">Could not load the feed. Make sure the server is running!</p>';
  }
}

function renderFeed() {
  const groups = feedData.filter(g => g.difficulty === activeFilter);

  // Show the "hard = no hints" note only when hard targets are visible
  const showHardNote = groups.some(g => g.difficulty === 'hard');
  hardNoteEl.style.display = showHardNote ? 'block' : 'none';

  if (!groups.length) {
    feedEl.innerHTML = '<p class="loading">No targets match this filter.</p>';
    return;
  }

  // Organize the feed by difficulty: all Easy posts first, then Medium, then Hard.
  const levels = [
    { key: 'easy', label: 'Easy Targets', icon: '🟢' },
    { key: 'medium', label: 'Medium Targets', icon: '🟡' },
    { key: 'hard', label: 'Hard Targets', icon: '🔴' }
  ];

  feedEl.innerHTML = levels.map(level => {
    const levelGroups = groups.filter(g => g.difficulty === level.key);
    if (!levelGroups.length) return '';

    const posts = levelGroups.map(group => `
      ${group.artifacts.map(renderArtifact).join('')}
    `).join('');

    return `
      <div class="level-section">
        <div class="level-header">
          <span class="level-icon">${level.icon}</span>
          <span class="level-label">${level.label}</span>
          <span class="badge badge-${level.key}">${level.key}</span>
        </div>
        <div class="target-group">
          ${posts}
        </div>
      </div>
    `;
  }).join('');
}

function renderArtifact(a) {
  if (a.type === 'paper') return renderPaper(a);
  return renderSocial(a);
}

function renderSocial(a) {
  return `
    <div class="card">
      <div class="post-header">
        <div class="avatar">${escapeHtml(a.avatar || '👤')}</div>
        <div class="post-meta">
          <div class="post-name">${escapeHtml(a.displayName || '')}</div>
          <div class="post-sub">${escapeHtml(a.handle || '')} · ${escapeHtml(a.time || '')}</div>
        </div>
        <span class="platform-tag">${escapeHtml(a.platform || 'Social')}</span>
      </div>
      <div class="post-body">${formatText(a.body || '')}</div>
      <div class="post-actions">
        <span>❤️ ${a.likes ?? 0}</span>
        <span>💬 ${a.comments ?? 0}</span>
        <span>🔁 Share</span>
      </div>
    </div>
  `;
}

function renderPaper(a) {
  return `
    <div class="paper">
      <span class="paper-tag">📄 Research Paper</span>
      <div class="paper-title">${formatText(a.title || '')}</div>
      <div class="paper-authors">${escapeHtml(a.authors || '')}</div>
      <div class="paper-journal">${escapeHtml(a.journal || '')}</div>
      <div class="paper-abstract-label">Abstract</div>
      <div class="paper-abstract">${formatText(a.abstract || '')}</div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Escapes HTML first (safe), then turns **text** into bold.
// Use this in JSON clue text to emphasize a word, e.g. "my cat is named **One**".
function formatText(str) {
  return escapeHtml(str).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
