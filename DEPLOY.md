# Deploying the static version to GitHub Pages

The `docs/` folder is a **fully static** copy of the game — no Node server needed.
It runs entirely in the browser using `docs/data.js` (generated from
`data/accounts.json` + `data/clues.json`).

Your live URL will be:

**https://torchedvip.github.io/Social_Engineering_Family/**

## One-time deploy (do this tonight)

1. Commit and push the static build:

   ```bash
   git add docs build-static-data.js DEPLOY.md
   git commit -m "Add static GitHub Pages build in docs/"
   git push origin main
   ```

2. On GitHub, go to the repo → **Settings** → **Pages** (left sidebar).

3. Under **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `main`  —  **Folder:** `/docs`
   - Click **Save**.

4. Wait ~1–2 minutes. Refresh the Pages settings screen; it will show
   "Your site is live at https://torchedvip.github.io/Social_Engineering_Family/".
   Open that link. Done.

## If you edit the clues or accounts later

The static site reads from `docs/data.js`, NOT from the `data/*.json` files.
After editing `data/accounts.json` or `data/clues.json`, regenerate the embed:

```bash
node build-static-data.js
git add docs/data.js data/accounts.json data/clues.json
git commit -m "Update clues"
git push origin main
```

GitHub Pages redeploys automatically on push (allow a minute).

## Heads-up on secrecy (expected for a static site)

Because there is no server, the answer-checking happens in the browser, so the
passwords, security answers, and the admin (VIP) answers are present in
`docs/data.js`. Anyone can open it or "View Source" and read them. That is fine
for a learning booth, but don't treat those answers as secret once this is public.

The original server version (in `server.js` + `public/`) still exists and keeps
answers server-side if you ever host it on a Node platform (Render, Railway, etc.).
