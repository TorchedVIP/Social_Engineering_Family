// === STATE ===
let currentAccount = null;
let accounts = [];

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

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
  loadAccounts();
  setupForms();
});

async function loadAccounts() {
  try {
    const response = await fetch('/api/accounts');
    accounts = await response.json();
    renderAccounts();
  } catch (error) {
    console.error('Failed to load accounts:', error);
    accountsGrid.innerHTML = '<p class="error-msg">Failed to load accounts. Make sure the server is running!</p>';
  }
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
  [introSection, accountsSection, loginSection, securitySection, winSection].forEach(s => {
    s.classList.add('hidden');
  });
  section.classList.remove('hidden');
  
  // Keep intro and accounts visible together when on main page
  if (section === accountsSection) {
    introSection.classList.remove('hidden');
  }
}

function goBack() {
  // Reset attempts on server when going back
  if (currentAccount) {
    fetch('/api/reset-attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentAccount.id })
    });
  }
  currentAccount = null;
  loginError.classList.add('hidden');
  securityError.classList.add('hidden');
  clearHints();
  loginForm.reset();
  securityForm.reset();
  introSection.classList.remove('hidden');
  accountsSection.classList.remove('hidden');
  loginSection.classList.add('hidden');
  securitySection.classList.add('hidden');
  winSection.classList.add('hidden');
}

function resetToAccounts() {
  goBack();
}

// === ACCOUNT SELECTION ===
function selectAccount(id) {
  currentAccount = accounts.find(a => a.id === id);
  if (!currentAccount) return;

  document.getElementById('target-name').textContent = currentAccount.name;
  document.getElementById('target-hint').textContent = currentAccount.hint;
  loginForm.reset();
  loginError.classList.add('hidden');
  clearHints();

  showSection(loginSection);
}

// === FORM HANDLING ===
function setupForms() {
  loginForm.addEventListener('submit', handleLogin);
  securityForm.addEventListener('submit', handleSecurity);
}

async function handleLogin(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    showError(loginError, 'Please enter both username and password.');
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: currentAccount.id,
        username,
        password
      })
    });

    const result = await response.json();

    if (result.success) {
      loginError.classList.add('hidden');
      clearHints();
      showSecurityQuestions(result.questions);
    } else {
      showError(loginError, result.message);
      if (result.hint) {
        showLoginHint(result.hint, result.attemptNumber);
      }
    }
  } catch (error) {
    showError(loginError, 'Connection error. Is the server running?');
  }
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

async function handleSecurity(e) {
  e.preventDefault();

  const inputs = document.querySelectorAll('#questions-container input');
  const answers = Array.from(inputs).map(input => input.value.trim());

  if (answers.some(a => !a)) {
    showError(securityError, 'Please answer all security questions.');
    return;
  }

  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: currentAccount.id,
        answers
      })
    });

    const result = await response.json();

    if (result.success) {
      securityError.classList.add('hidden');
      showWinScreen();
    } else {
      showError(securityError, result.message);
      if (result.questionHints) {
        showSecurityHints(result.questionHints, result.attemptNumber);
      }
    }
  } catch (error) {
    showError(securityError, 'Connection error. Is the server running?');
  }
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

  const hintLevel = Math.min(attemptNumber, 3);
  hintBox.innerHTML = `
    <div class="hint-header">
      <span class="hint-icon">💡</span>
      <span>Hint ${hintLevel}/3</span>
      <span class="hint-level-dots">${'●'.repeat(hintLevel)}${'○'.repeat(3 - hintLevel)}</span>
    </div>
    <p class="hint-text-content">${hint}</p>
  `;
  hintBox.classList.remove('hidden');
  hintBox.style.animation = 'none';
  hintBox.offsetHeight;
  hintBox.style.animation = 'hint-appear 0.4s ease forwards';
}

function showSecurityHints(questionHints, attemptNumber) {
  const hintLevel = Math.min(attemptNumber, 3);

  questionHints.forEach((qh) => {
    const hintEl = document.getElementById(`hint-${qh.questionIndex}`);
    const statusEl = document.getElementById(`status-${qh.questionIndex}`);
    const groupEl = document.getElementById(`question-group-${qh.questionIndex}`);
    
    if (!hintEl || !statusEl || !groupEl) return;

    if (qh.correct) {
      // Mark as correct
      hintEl.classList.add('hidden');
      hintEl.innerHTML = '';
      statusEl.innerHTML = '<span class="status-correct">✓ Correct!</span>';
      groupEl.classList.add('question-correct');
      groupEl.classList.remove('question-wrong');
    } else {
      // Show hint for wrong answer
      statusEl.innerHTML = '<span class="status-wrong">✗ Incorrect</span>';
      groupEl.classList.add('question-wrong');
      groupEl.classList.remove('question-correct');
      
      if (qh.hint) {
        hintEl.innerHTML = `
          <div class="hint-header">
            <span class="hint-icon">💡</span>
            <span>Hint ${hintLevel}/3</span>
            <span class="hint-level-dots">${'●'.repeat(hintLevel)}${'○'.repeat(3 - hintLevel)}</span>
          </div>
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
  if (loginHintBox) {
    loginHintBox.remove();
  }
  // Security hints are cleared when questions are re-rendered
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

      // Clean up after animation
      setTimeout(() => confetti.remove(), 4000);
    }, i * 30);
  }
}

function playWinSound() {
  // Create a simple beep sequence for the win
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
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
  
  // Trigger shake animation
  element.style.animation = 'none';
  element.offsetHeight; // Force reflow
  element.style.animation = 'shake 0.5s ease';
}
