// === STATIC (serverless) build for GitHub Pages ===
// All logic that used to live in server.js now runs in the browser against
// window.GAME_DATA (see data.js). Attempt counts are tracked in-memory here.

// === STATE ===
let currentAccount = null;   // full account object (with answers) for the active target
let accounts = [];           // safe list for the grid (no answers)
const attempts = {};         // { [id]: { login, security } }

// === DOM ELEMENTS ===
const introSection = document.getElementById('intro-section');
const accountsSection = document.getElementById('accounts-section');
const loginSection = document.getElementById('login-section');
const securitySection = document.getElementById('security-section');
const winSection = document.getElementById('win-section');
const accountsGrid = document.getElementById('accounts-grid');
const loginForm = document.getElementById('login-form');
const securityForm = document.getElementById('security-form');
const loginError = document.getElementById('login-error');
const securityError = document.getElementById('security-error');

// Admin (VIP) elements
const adminLoginSection = document.getElementById('admin-login-section');
const adminSecuritySection = document.getElementById('admin-security-section');
const adminWinSection = document.getElementById('admin-win-section');
const adminLoginForm = document.getElementById('admin-login-form');
const adminSecurityForm = document.getElementById('admin-security-form');
const adminLoginError = document.getElementById('admin-login-error');
const adminSecurityError = document.getElementById('admin-security-error');

// === DATA HELPERS (replace the old /api calls) ===
function allAccounts() {
  return (window.GAME_DATA && window.GAME_DATA.accounts) || [];
}
function findAccount(id) {
  return allAccounts().find(a => a.id === id);
}
function getAttempts(id) {
  if (!attempts[id]) attempts[id] = { login: 0, security: 0 };
  return attempts[id];
}
function norm(s) {
  return (s || '').trim().toLowerCase();
}

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
  loadAccounts();
  setupForms();
});

function loadAccounts() {
  // Build the safe (no-answers) list, excluding the admin account.
  accounts = allAccounts()
    .filter(a => !a.isAdmin)
    .map(a => ({ id: a.id, name: a.name, difficulty: a.difficulty, hint: a.hint || '' }));
  renderAccounts();
}

function renderAccounts() {
  accountsGrid.innerHTML = accounts.map(account => `
    <div class="account-card" onclick="selectAccount('${account.id}')">
      <div class="card-name">${account.name}</div>
      <span class="card-difficulty difficulty-${account.difficulty}">${account.difficulty}</span>
    </div>
  `).join('');
}

// === NAVIGATION ===
function showSection(section) {
  [introSection, accountsSection, loginSection, securitySection, winSection,
   adminLoginSection, adminSecuritySection, adminWinSection].forEach(s => {
    if (s) s.classList.add('hidden');
  });
  section.classList.remove('hidden');

  if (section === accountsSection) {
    introSection.classList.remove('hidden');
  }
}

function goBack() {
  // Reset attempts for the current target when leaving.
  if (currentAccount) {
    delete attempts[currentAccount.id];
  }
  currentAccount = null;
  loginError.classList.add('hidden');
  securityError.classList.add('hidden');
  clearHints();
  loginForm.reset();
  securityForm.reset();
  if (adminLoginForm) adminLoginForm.reset();
  if (adminSecurityForm) adminSecurityForm.reset();
  if (adminLoginError) adminLoginError.classList.add('hidden');
  if (adminSecurityError) adminSecurityError.classList.add('hidden');
  introSection.classList.remove('hidden');
  accountsSection.classList.remove('hidden');
  loginSection.classList.add('hidden');
  securitySection.classList.add('hidden');
  winSection.classList.add('hidden');
  if (adminSecuritySection) adminSecuritySection.classList.add('hidden');
  if (adminWinSection) adminWinSection.classList.add('hidden');
  if (adminLoginSection) adminLoginSection.classList.remove('hidden');
}

function resetToAccounts() {
  goBack();
}

// === ACCOUNT SELECTION ===
function selectAccount(id) {
  currentAccount = findAccount(id);
  if (!currentAccount) return;

  delete attempts[id]; // fresh start for this target

  document.getElementById('target-name').textContent = currentAccount.name;
  document.getElementById('target-hint').textContent = currentAccount.hint || '';
  loginForm.reset();
  loginError.classList.add('hidden');
  clearHints();

  showSection(loginSection);
}

// === FORM HANDLING ===
function setupForms() {
  loginForm.addEventListener('submit', handleLogin);
  securityForm.addEventListener('submit', handleSecurity);
  if (adminLoginForm) adminLoginForm.addEventListener('submit', handleAdminLogin);
  if (adminSecurityForm) adminSecurityForm.addEventListener('submit', handleAdminSecurity);
}

function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    showError(loginError, 'Please enter both username and password.');
    return;
  }

  const account = currentAccount;
  if (!account) {
    showError(loginError, 'Account not found.');
    return;
  }

  if (norm(account.username) === norm(username) && norm(account.password) === norm(password)) {
    const att = getAttempts(account.id);
    att.login = 0;
    loginError.classList.add('hidden');
    clearHints();
    const questions = account.securityQuestions.map(q => ({ question: q.question }));
    showSecurityQuestions(questions);
    return;
  }

  // Failed login
  const att = getAttempts(account.id);
  att.login++;

  let hint;
  if (account.difficulty === 'hard') {
    // No hint for the first 3 attempts, then exactly ONE vague hint.
    hint = att.login >= 4 ? (account.vagueHint || null) : null;
  } else {
    const hintIndex = Math.min(att.login, 3) - 1;
    const loginHints = account.loginHints || [];
    hint = loginHints[hintIndex] || null;
  }

  showError(loginError, 'Incorrect username or password. Try again!');
  if (hint) showLoginHint(hint, att.login);
}

function showSecurityQuestions(questions) {
  document.getElementById('security-target-name').textContent = currentAccount.name;

  const container = document.getElementById('questions-container');
  container.innerHTML = questions.map((q, index) => `
    <div class="form-group" id="question-group-${index}">
      <label for="answer-${index}">${q.question}</label>
      <input type="text" id="answer-${index}" placeholder="Enter answer..." autocomplete="off">
      <div class="question-hint hidden" id="hint-${index}"></div>
      <div class="question-status" id="status-${index}"></div>
    </div>
  `).join('');

  securityError.classList.add('hidden');
  showSection(securitySection);
}

function handleSecurity(e) {
  e.preventDefault();

  const inputs = document.querySelectorAll('#questions-container input');
  const answers = Array.from(inputs).map(input => input.value.trim());

  if (answers.some(a => !a)) {
    showError(securityError, 'Please answer all security questions.');
    return;
  }

  const account = currentAccount;
  const results = account.securityQuestions.map((q, index) =>
    norm(q.answer) === norm(answers[index])
  );
  const allCorrect = results.every(Boolean);

  if (allCorrect) {
    delete attempts[account.id];
    securityError.classList.add('hidden');
    showWinScreen();
    return;
  }

  // Failed — build per-question hints (same timing rules as the server had)
  const att = getAttempts(account.id);
  att.security++;

  const isHard = account.difficulty === 'hard';
  const hardHintUnlocked = att.security >= 4;
  const hintIndex = Math.min(att.security, 3) - 1;

  const questionHints = account.securityQuestions.map((q, index) => {
    const isCorrect = norm(q.answer) === norm(answers[index]);
    if (isCorrect) {
      return { questionIndex: index, correct: true, hint: null };
    }
    let hint;
    if (isHard) {
      hint = hardHintUnlocked ? (q.vagueHint || null) : null;
    } else {
      const hints = q.hints || [];
      hint = hints[hintIndex] || null;
    }
    return { questionIndex: index, correct: false, hint };
  });

  showError(securityError, 'Some security answers are incorrect. Keep trying!');
  showSecurityHints(questionHints, att.security);
}

// === HINTS ===
function showLoginHint(hint, attemptNumber) {
  let hintBox = document.getElementById('login-hint-box');
  if (!hintBox) {
    hintBox = document.createElement('div');
    hintBox.id = 'login-hint-box';
    hintBox.className = 'hint-box';
    loginForm.parentNode.insertBefore(hintBox, loginError.nextSibling);
  }

  hintBox.innerHTML = `
    ${hintHeaderHtml(attemptNumber)}
    <p class="hint-text-content">${hint}</p>
  `;
  hintBox.classList.remove('hidden');
  hintBox.style.animation = 'none';
  hintBox.offsetHeight;
  hintBox.style.animation = 'hint-appear 0.4s ease forwards';
}

// Hint header varies by difficulty:
// - hard: a single "Final Hint" (there is only ever one)
// - easy/medium: escalating "Hint X/3" with progress dots
function hintHeaderHtml(attemptNumber) {
  if (currentAccount && currentAccount.difficulty === 'hard') {
    return `
      <div class="hint-header">
        <span class="hint-icon">💡</span>
        <span>Final Hint</span>
        <span class="hint-level-dots">★</span>
      </div>
    `;
  }
  const hintLevel = Math.min(attemptNumber, 3);
  return `
    <div class="hint-header">
      <span class="hint-icon">💡</span>
      <span>Hint ${hintLevel}/3</span>
      <span class="hint-level-dots">${'●'.repeat(hintLevel)}${'○'.repeat(3 - hintLevel)}</span>
    </div>
  `;
}

function showSecurityHints(questionHints, attemptNumber) {
  questionHints.forEach((qh) => {
    const hintEl = document.getElementById(`hint-${qh.questionIndex}`);
    const statusEl = document.getElementById(`status-${qh.questionIndex}`);
    const groupEl = document.getElementById(`question-group-${qh.questionIndex}`);

    if (!hintEl || !statusEl || !groupEl) return;

    if (qh.correct) {
      hintEl.classList.add('hidden');
      hintEl.innerHTML = '';
      statusEl.innerHTML = '<span class="status-correct">✓ Correct!</span>';
      groupEl.classList.add('question-correct');
      groupEl.classList.remove('question-wrong');
    } else {
      statusEl.innerHTML = '<span class="status-wrong">✗ Incorrect</span>';
      groupEl.classList.add('question-wrong');
      groupEl.classList.remove('question-correct');

      if (qh.hint) {
        hintEl.innerHTML = `
          ${hintHeaderHtml(attemptNumber)}
          <p class="hint-text-content">${qh.hint}</p>
        `;
        hintEl.classList.remove('hidden');
        hintEl.style.animation = 'none';
        hintEl.offsetHeight;
        hintEl.style.animation = 'hint-appear 0.4s ease forwards';
      }
    }
  });
}

function clearHints() {
  const loginHintBox = document.getElementById('login-hint-box');
  if (loginHintBox) loginHintBox.remove();
}

// === ADMIN (VIP) FLOW ===
function handleAdminLogin(e) {
  e.preventDefault();
  const username = document.getElementById('admin-username').value.trim();

  if (!username) {
    showError(adminLoginError, 'Please enter the admin username.');
    return;
  }

  const admin = allAccounts().find(a => a.isAdmin);
  if (!admin) {
    showError(adminLoginError, 'Admin account not configured.');
    return;
  }

  if (norm(username) === norm(admin.username)) {
    adminLoginError.classList.add('hidden');
    currentAccount = admin; // so navigation resets cleanly
    document.getElementById('admin-name').textContent = admin.name;
    renderAdminQuestions(admin.securityQuestions.map(q => ({ question: q.question })));
    showSection(adminSecuritySection);
  } else {
    showError(adminLoginError, 'Invalid admin username.');
  }
}

function renderAdminQuestions(questions) {
  const container = document.getElementById('admin-questions-container');
  // No per-question status/hint elements — intentionally bare.
  container.innerHTML = questions.map((q, index) => `
    <div class="form-group">
      <label for="admin-answer-${index}">${q.question}</label>
      <input type="text" id="admin-answer-${index}" placeholder="Enter answer..." autocomplete="off">
    </div>
  `).join('');
  adminSecurityError.classList.add('hidden');
}

function handleAdminSecurity(e) {
  e.preventDefault();
  const inputs = document.querySelectorAll('#admin-questions-container input');
  const answers = Array.from(inputs).map(input => input.value.trim());

  if (answers.some(a => !a)) {
    showError(adminSecurityError, 'Please answer all questions.');
    return;
  }

  const admin = allAccounts().find(a => a.isAdmin);
  const allCorrect = admin.securityQuestions.every((q, index) =>
    norm(q.answer) === norm(answers[index])
  );

  if (allCorrect) {
    adminSecurityError.classList.add('hidden');
    showSection(adminWinSection);
    launchConfetti();
    playWinSound();
  } else {
    // Generic failure only — no per-question highlighting, no hints.
    showError(adminSecurityError, 'Access denied. One or more answers are incorrect.');
  }
}

// === WIN SCREEN ===
function showWinScreen() {
  document.getElementById('win-target').textContent = currentAccount.name;
  showSection(winSection);
  launchConfetti();
  playWinSound();
}

function launchConfetti() {
  const colors = ['#00ff41', '#00d4ff', '#b44dff', '#ffcc00', '#ff3355', '#ffffff'];

  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.width = Math.random() * 10 + 5 + 'px';
      confetti.style.height = Math.random() * 10 + 5 + 'px';
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      confetti.style.animationDuration = Math.random() * 2 + 2 + 's';
      confetti.style.animationDelay = Math.random() * 0.5 + 's';
      document.body.appendChild(confetti);
      setTimeout(() => confetti.remove(), 4000);
    }, i * 30);
  }
}

function playWinSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, index) => {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + index * 0.15);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime + index * 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + index * 0.15 + 0.3);
      oscillator.start(audioCtx.currentTime + index * 0.15);
      oscillator.stop(audioCtx.currentTime + index * 0.15 + 0.3);
    });
  } catch (e) {
    // Audio not supported, skip silently
  }
}

// === UTILITY ===
function showError(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');
  element.style.animation = 'none';
  element.offsetHeight;
  element.style.animation = 'shake 0.5s ease';
}
