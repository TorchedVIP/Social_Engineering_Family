const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Track failed attempts per session (in-memory, resets on server restart)
// Key: accountId, Value: { login: number, security: number }
const attempts = {};

function getAttempts(id) {
  if (!attempts[id]) {
    attempts[id] = { login: 0, security: 0 };
  }
  return attempts[id];
}

// Load accounts data
function loadAccounts() {
  const data = fs.readFileSync(path.join(__dirname, 'data', 'accounts.json'), 'utf8');
  return JSON.parse(data);
}

// Load player-facing clue artifacts (social posts + research papers)
function loadClues() {
  const data = fs.readFileSync(path.join(__dirname, 'data', 'clues.json'), 'utf8');
  return JSON.parse(data);
}

// API: Get player-facing clue artifacts for the Clue Browser.
// Never includes answers or the operator-only hints — just the "found" content.
app.get('/api/clues', (req, res) => {
  const accounts = loadAccounts();
  const clues = loadClues();
  const order = { easy: 0, medium: 1, hard: 2 };

  const feed = accounts.map(account => {
    const entry = (clues.accounts && clues.accounts[account.id]) || {};
    return {
      id: account.id,
      name: account.name,
      difficulty: account.difficulty,
      artifacts: entry.artifacts || []
    };
  }).sort((a, b) => (order[a.difficulty] ?? 9) - (order[b.difficulty] ?? 9));

  res.json(feed);
});

// API: Get all accounts (without sensitive info)
app.get('/api/accounts', (req, res) => {
  const accounts = loadAccounts();
  const safeAccounts = accounts.map(account => ({
    id: account.id,
    name: account.name,
    difficulty: account.difficulty,
    hint: account.hint || ''
  }));
  res.json(safeAccounts);
});

// API: Reset attempts for an account (when they go back to target list)
app.post('/api/reset-attempts', (req, res) => {
  const { id } = req.body;
  if (id && attempts[id]) {
    delete attempts[id];
  }
  res.json({ success: true });
});

// API: Attempt login
app.post('/api/login', (req, res) => {
  const { id, username, password } = req.body;
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === id);

  if (!account) {
    return res.json({ success: false, message: 'Account not found.' });
  }

  if (account.username.toLowerCase() === username.toLowerCase() &&
      account.password.toLowerCase() === password.toLowerCase()) {
    // Reset login attempts on success, keep security attempts
    const att = getAttempts(id);
    att.login = 0;
    // Return security questions (without answers)
    const questions = account.securityQuestions.map(q => ({
      question: q.question
    }));
    return res.json({ success: true, questions });
  }

  // Failed login — increment attempts and return hint
  const att = getAttempts(id);
  att.login++;

  const hintIndex = Math.min(att.login, 3) - 1; // 0, 1, or 2
  const loginHints = account.loginHints || [];
  const hint = loginHints[hintIndex] || null;

  res.json({
    success: false,
    message: 'Incorrect username or password. Try again!',
    hint: hint,
    attemptNumber: att.login
  });
});

// API: Verify security questions
app.post('/api/verify', (req, res) => {
  const { id, answers } = req.body;
  const accounts = loadAccounts();
  const account = accounts.find(a => a.id === id);

  if (!account) {
    return res.json({ success: false, message: 'Account not found.' });
  }

  // Check which answers are correct and which are wrong
  const results = account.securityQuestions.map((q, index) => {
    const correct = q.answer.toLowerCase() === (answers[index] || '').toLowerCase();
    return { correct, questionIndex: index };
  });

  const allCorrect = results.every(r => r.correct);

  if (allCorrect) {
    // Reset attempts on success
    delete attempts[id];
    return res.json({ success: true, message: 'ACCESS GRANTED!' });
  }

  // Failed — increment attempts and return per-question hints
  const att = getAttempts(id);
  att.security++;

  const hintIndex = Math.min(att.security, 3) - 1; // 0, 1, or 2

  // Build per-question hints for wrong answers only
  const questionHints = account.securityQuestions.map((q, index) => {
    const isCorrect = q.answer.toLowerCase() === (answers[index] || '').toLowerCase();
    if (isCorrect) {
      return { questionIndex: index, correct: true, hint: null };
    }
    const hints = q.hints || [];
    return {
      questionIndex: index,
      correct: false,
      hint: hints[hintIndex] || null
    };
  });

  res.json({
    success: false,
    message: 'Some security answers are incorrect. Keep trying!',
    questionHints: questionHints,
    attemptNumber: att.security
  });
});

app.listen(PORT, () => {
  console.log(`\n🔓 Social Engineering Booth is running!`);
  console.log(`🌐 Open your browser to: http://localhost:${PORT}`);
  console.log(`\n📁 Accounts loaded from: data/accounts.json`);
  console.log(`   Edit that file to add/remove/modify accounts.\n`);
});
