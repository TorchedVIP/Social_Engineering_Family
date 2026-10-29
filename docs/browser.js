// === CLUE BROWSER (static build) ===
// Reads window.GAME_DATA (see data.js) instead of fetching /api/clues.
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

// Build the feed locally from embedded data (mirrors the old /api/clues).
function loadFeed() {
  feedEl.innerHTML = '<p class="loading">Loading feed…</p>';
  try {
    const data = window.GAME_DATA || {};
    const accounts = data.accounts || [];
    const clues = data.clues || { accounts: {} };
    const order = { easy: 0, medium: 1, hard: 2 };

    feedData = accounts
      .filter(account => !account.isAdmin)
      .map(account => {
        const entry = (clues.accounts && clues.accounts[account.id]) || {};
        return {
          id: account.id,
          name: account.name,
          difficulty: account.difficulty,
          artifacts: entry.artifacts || []
        };
      })
      .sort((a, b) => (order[a.difficulty] ?? 9) - (order[b.difficulty] ?? 9));

    renderFeed();
  } catch (err) {
    console.error('Failed to load clues:', err);
    feedEl.innerHTML = '<p class="loading">Could not load the feed. Is data.js present?</p>';
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
  switch (a.type) {
    case 'paper':      return renderPaper(a);
    case 'blog':       return renderBlog(a);
    case 'news':       return renderNews(a);
    case 'mention':    return renderMention(a);
    case 'review':     return renderReview(a);
    case 'forum':      return renderForum(a);
    case 'event':      return renderEvent(a);
    case 'profile':    return renderProfile(a);
    case 'classified': return renderClassified(a);
    case 'social':
    default:           return renderSocial(a);
  }
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

// C — Personal blog post.
function renderBlog(a) {
  return `
    <div class="blog">
      <span class="src-tag src-blog">✍️ Blog · ${escapeHtml(a.site || 'Personal Blog')}</span>
      <div class="blog-title">${formatText(a.title || '')}</div>
      <div class="blog-byline">by ${escapeHtml(a.author || '')}${a.date ? ' · ' + escapeHtml(a.date) : ''}</div>
      <div class="blog-body">${formatText(a.body || '')}</div>
    </div>
  `;
}

// A — News article.
function renderNews(a) {
  return `
    <div class="news">
      <div class="news-masthead">${escapeHtml(a.outlet || 'The Daily Standard')}</div>
      <span class="src-tag src-news">📰 ${escapeHtml(a.section || 'News')}</span>
      <div class="news-headline">${formatText(a.headline || '')}</div>
      <div class="news-byline">${escapeHtml(a.byline || '')}${a.date ? ' · ' + escapeHtml(a.date) : ''}</div>
      <div class="news-preview">${formatText(a.preview || '')}</div>
      <div class="news-paywall">Subscribe to continue reading this article.</div>
    </div>
  `;
}

// B — Mention from a different character.
function renderMention(a) {
  return `
    <div class="card mention-card">
      <div class="mention-tag">💬 Mentioned by someone else</div>
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

// D — Product review.
function renderReview(a) {
  const n = Math.max(0, Math.min(5, a.stars ?? 5));
  const stars = '★'.repeat(n) + '☆'.repeat(5 - n);
  return `
    <div class="review">
      <span class="src-tag src-review">🛒 ${escapeHtml(a.store || 'ShopEZ')} · Verified Review</span>
      <div class="review-product">${escapeHtml(a.product || '')}</div>
      <div class="review-stars">${stars}</div>
      <div class="review-title">${formatText(a.title || '')}</div>
      <div class="review-body">${formatText(a.body || '')}</div>
      <div class="review-author">— ${escapeHtml(a.author || 'Anonymous')}${a.date ? ', ' + escapeHtml(a.date) : ''}</div>
    </div>
  `;
}

// E — Forum / Q&A thread.
function renderForum(a) {
  const replies = (a.replies || []).map(r => `
    <div class="forum-reply">
      <span class="forum-user">${escapeHtml(r.user || 'user')}</span>
      <span class="forum-reply-body">${formatText(r.body || '')}</span>
    </div>
  `).join('');
  return `
    <div class="forum">
      <span class="src-tag src-forum">🧵 ${escapeHtml(a.board || 'Forum')}</span>
      <div class="forum-title">${formatText(a.title || '')}</div>
      <div class="forum-op">
        <span class="forum-user">${escapeHtml(a.op || 'original poster')}</span>
        <span class="forum-op-body">${formatText(a.body || '')}</span>
      </div>
      ${replies}
    </div>
  `;
}

// F — Event / RSVP listing.
function renderEvent(a) {
  const going = (a.attendees || []).map(n => escapeHtml(n)).join(', ');
  return `
    <div class="event">
      <span class="src-tag src-event">📅 Event</span>
      <div class="event-title">${formatText(a.title || '')}</div>
      <div class="event-meta">
        ${a.when ? '<span>🕒 ' + escapeHtml(a.when) + '</span>' : ''}
        ${a.where ? '<span>📍 ' + escapeHtml(a.where) + '</span>' : ''}
      </div>
      ${a.body ? '<div class="event-body">' + formatText(a.body) + '</div>' : ''}
      ${going ? '<div class="event-going"><strong>Going:</strong> ' + going + '</div>' : ''}
    </div>
  `;
}

// H — Job listing / professional profile.
function renderProfile(a) {
  const items = (a.timeline || []).map(t => `<li>${formatText(t)}</li>`).join('');
  return `
    <div class="profile">
      <span class="src-tag src-profile">💼 ${escapeHtml(a.site || 'WorkLink')}</span>
      <div class="profile-head">
        <div class="avatar">${escapeHtml(a.avatar || '🧑')}</div>
        <div>
          <div class="profile-name">${escapeHtml(a.name || '')}</div>
          <div class="profile-headline">${formatText(a.headline || '')}</div>
          ${a.location ? '<div class="profile-loc">📍 ' + escapeHtml(a.location) + '</div>' : ''}
        </div>
      </div>
      ${a.about ? '<div class="profile-about">' + formatText(a.about) + '</div>' : ''}
      ${items ? '<ul class="profile-timeline">' + items + '</ul>' : ''}
    </div>
  `;
}

// I — Classified / lost-and-found ad.
function renderClassified(a) {
  return `
    <div class="classified">
      <span class="src-tag src-classified">📌 ${escapeHtml(a.section || 'Classifieds')}</span>
      <div class="classified-title">${formatText(a.title || '')}</div>
      <div class="classified-body">${formatText(a.body || '')}</div>
      ${a.contact ? '<div class="classified-contact">Contact: ' + escapeHtml(a.contact) + '</div>' : ''}
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
function formatText(str) {
  return escapeHtml(str).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
