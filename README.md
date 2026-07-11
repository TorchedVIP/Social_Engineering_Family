# 🕵️ Social Engineering Lab - Saintcon Family Night

An educational web app that teaches kids about social engineering in cybersecurity. Players attempt to "hack" into fake accounts by figuring out usernames, passwords, and security question answers using provided clues.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Then open your browser to **http://localhost:3000**

## 🎮 How It Works

1. **Read the intro** - Learn what social engineering is
2. **Pick a target** - Choose from easy, medium, or hard accounts
3. **Login** - Figure out the username and password from the hints
4. **Security Questions** - Answer the verification questions
5. **Win!** - Get the ACCESS GRANTED screen with confetti!

## 📁 Adding/Editing Accounts

Edit the file `data/accounts.json` to add or modify accounts. Each account needs:

```json
{
  "id": "unique_id",
  "name": "Display Name",
  "username": "login_username",
  "password": "the_password",
  "difficulty": "easy|medium|hard",
  "hint": "Clue text shown to players",
  "securityQuestions": [
    { "question": "Security question text?", "answer": "correct answer" }
  ]
}
```

### Tips for creating accounts:
- **Easy**: 2 security questions, simple/obvious answers from the hint
- **Medium**: 3 security questions, hints require a bit more thinking
- **Hard**: 4 security questions, hints are more subtle

## 🏗️ Project Structure

```
├── server.js              # Express server
├── package.json           # Dependencies
├── data/
│   └── accounts.json      # All fake account data (edit this!)
└── public/
    ├── index.html         # Main page
    ├── styles.css         # Hacker theme styling
    └── app.js             # Frontend logic
```

## 🎯 For Booth Operators

- Print out hint sheets or "social media profiles" for each account
- Kids can work together or compete for speed
- The hints in the app are intentionally helpful - make physical clue cards harder!
- Accounts are case-insensitive for ease of use
- No real data is used anywhere - all accounts are completely fictional

## 📋 Requirements

- Node.js 16+ 
- A modern web browser (Chrome, Firefox, Edge, Safari)

## 📜 License

MIT - Made with 💚 for Saintcon Family Night
