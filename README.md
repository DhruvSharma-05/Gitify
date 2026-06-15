# Gitify - GitHub Visual Learning App

Gitify is an interactive Web + API learning application designed to teach Git and GitHub concepts visually. It translates command-line workflows into animated simulations so learners can see files, commits, branches, conflicts, remotes, stashes, cherry-picks, and rebases in action on a real, sandboxed Git repository.

## Key Features

- **Interactive Git Journey Stepper:** A compact, animated stepper on the landing page (Workspace ✏️ → Staging 📦 → Local Repo 💾 → Remote Repo ☁️ → Flow 🏁) illustrating how code travels from your computer to GitHub.
- **Vibrant Visualizations:** Live animated commit trees, branching structures, and merging operations.
- **Dual Runtime Modes (Online & Offline):**
  - **Online Mode:** Uses a FastAPI backend to spin up isolated sandbox environments. Real shell commands are executed on actual Git repositories.
  - **Offline Fallback:** Continues simulation using an in-memory client-side Git flow if the server goes offline.
- **Editable File Inspector:** Click **✏️ Edit** in the visual workspace viewer to modify files directly and resolve conflicts through the UI.
- **Interactive Rebase Modal:** Intercepts `git rebase -i` terminal commands and launches a glassmorphic interactive sequence editor to pick, squash, drop, or reword commits.
- **Smart Contextual Hints:** Injects actionable troubleshooting tips (e.g. suggesting staging before committing or outlining conflict resolution steps) directly below command errors.
- **Connection Status Badge:** Glowing indicator pills showing server connection state (🟢 Connected / 🟡 Offline Mode).

## Lessons

- **Lesson 0: Git Basics** - Introduces version control and the edit -> stage -> commit -> push flow.
- **Lesson 1: Visual Playground** - Practice core CLI commands in the sandbox terminal.
- **Lesson 2: Advanced Branching** - Diverge and merge main, feature, and bugfix branches.
- **Lesson 3: Merge Conflicts** - Resolve markers, add files, and perform merge commits.
- **Lesson 4: Git History & Time Travel** - Traverse timelines with `git revert` and `git reset` (soft, mixed, hard).
- **Lesson 5: Stash & Cherry-Pick** - Save uncommitted work and harvest specific commits.
- **Lesson 6: Remote Collaboration** - Manage clones, forks, fetch vs pull, and rejected pushes.
- **Lesson 7: Rebase & Clean History** - Streamline branches with standard and interactive rebases.

## Commands Covered

```text
git init                  git status                git log
git add <file>            git commit -m <msg>       git push
git branch <name>         git checkout <branch>     git merge <branch>
git diff                  git revert <hash>         git reset (--soft/--mixed/--hard)
git stash                 git stash pop             git cherry-pick <hash>
git fetch                 git pull                  git pull --rebase
git rebase <branch>       git rebase -i HEAD~N      git push --force-with-lease
```

## Quick Start

### 1. Backend API Server Setup

The backend manages the secure virtualized shell sandbox environments for students.

Prerequisites:
- Python 3.10 or newer

Initialize backend environment:
```powershell
cd server
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Start the FastAPI application:
```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
The API server will run at `http://127.0.0.1:8000`.

> **Run single-worker.** Each student's per-lesson sandbox lives in the server process's
> memory (it maps a session to a temp git repo on disk). A restart drops live sandboxes,
> and running multiple workers (`--workers N` / multiple Gunicorn/Uvicorn processes) would
> route a session to a process that doesn't hold its sandbox. Scaling horizontally would
> require moving the sandbox registry to a shared store (e.g. Redis + a shared volume).
> Idle sandboxes are auto-reclaimed (`GITIFY_SANDBOX_TTL`, default 30 min) and capped
> (`GITIFY_SANDBOX_MAX`, default 300).

### 2. Frontend React Web App Setup

Prerequisites:
- Node.js 16 or newer
- npm

Install dependencies:
```powershell
npm install
```
*(If PowerShell blocks execution policies, use `npm.cmd install`)*

Run the development server:
```powershell
npm run dev
```
Open the visual playground interface in your browser:
`http://localhost:5173/`

## Project Structure

```text
├── .vscode/               # Workspace interpreter & linter configs
├── server/                # FastAPI Application Backend
│   ├── .venv/             # Python Virtual Environment
│   ├── main.py            # API routes and terminal commands sandbox handler
│   ├── verifier.py        # Lesson criteria verification algorithms
│   ├── database.py        # SQL database logger (attempt histories & progress)
│   ├── lint_backend.py    # Backend lint checks
│   ├── test_smoke.py      # Backend smoke tests
│   └── requirements.txt   # Pinned Python package dependencies
├── src/                   # React Frontend Web Application
│   ├── App.jsx            # Main app router, header controls, and rebase modals
│   ├── styles.css         # Shared premium dark glassmorphism styling
│   ├── api.js             # Terminal execute, write-file, and progress clients
│   ├── offlineGit.js      # In-memory client-side Git flow (offline fallback)
│   └── components/
│       ├── Intro.jsx      # Interactive stepper landing page tour
│       ├── TerminalShell.jsx  # Interactive shell with autocomplete & hints
│       ├── FileInspector.jsx  # Monospace file text viewer and visual editor
│       ├── Flow.jsx       # Interactive stage visualizer layout
│       └── ...            # Individual lesson scenario files
```

## Development & Testing

Run frontend lints and unit sanity checks:
```powershell
npm run lint
npm run test
```

Run backend lints and smoke tests:
```powershell
cd server
.venv\Scripts\python.exe lint_backend.py
.venv\Scripts\python.exe test_smoke.py
```

Build production static assets:
```powershell
npm run build
```

## License

MIT
