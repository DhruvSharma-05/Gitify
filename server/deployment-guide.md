# Deployment Guide

## Architecture

The application is deployed using:

* **Frontend:** React + Vite → Vercel
* **Backend:** FastAPI → Render
* **Database:** SQLite

```text
User
  ↓
Vercel (Frontend)
  ↓
Render (FastAPI Backend)
  ↓
SQLite Database
```

---

## Production URLs

### Frontend

Hosted on Vercel.

```text
https://your-vercel-app.vercel.app
```

### Backend

Hosted on Render.

```text
https://your-render-app.onrender.com
```

---

## Environment Variables

### Vercel

```env
VITE_API_BASE_URL=https://your-render-app.onrender.com
```

### Render

```env
# Persistent disk (see render.yaml: a 1GB disk is mounted at /data).
# Do NOT point this at /tmp — Render wipes /tmp on every restart/deploy,
# which would erase all student progress.
GITIFY_DB_PATH=/data/gitify.db

# Sandboxes are scratch space and can live on ephemeral /tmp.
GITIFY_SESSION_ROOT=/tmp/gitify-sessions

GITIFY_CORS_ORIGINS=https://your-vercel-app.vercel.app
# Optional: regex alternative for preview deploys, e.g. ^https://.*\.vercel\.app$
# GITIFY_CORS_ORIGIN_REGEX=

# Per-lesson sandbox lifecycle (optional; defaults shown):
GITIFY_SANDBOX_TTL=1800     # reclaim a sandbox after 30 min idle
GITIFY_SANDBOX_MAX=300      # hard cap on concurrent sandboxes (LRU-evicted)
GITIFY_SANDBOX_SWEEP=300    # sweep cadence in seconds
```

> **Run the backend single-worker.** Each student's per-lesson sandbox lives in the
> server process's memory (mapping a session to an on-disk git repo). Running multiple
> workers/instances would route a session to a process that doesn't hold its sandbox,
> and every restart drops live sandboxes. Keep the start command to one Uvicorn worker
> (`uvicorn main:app --host 0.0.0.0 --port $PORT` — no `--workers`). Scaling out would
> require moving the sandbox registry to a shared store.

---

## CI/CD Workflow

The project uses GitHub-integrated deployments.

Whenever code is pushed to the main branch:

```text
Local Changes
      ↓
git add .
git commit -m "message"
git push origin main
      ↓
GitHub
      ↓
 ┌───────────────┐
 │               │
 ▼               ▼
Vercel       Render
Frontend     Backend
Redeploy     Redeploy
```

No manual deployment is required.

---

## Updating the Application

### Frontend Changes

After making frontend changes:

```bash
git add .
git commit -m "Update frontend"
git push origin main
```

Vercel automatically rebuilds and deploys the frontend.

---

### Backend Changes

After making backend changes:

```bash
git add .
git commit -m "Update backend"
git push origin main
```

Render automatically redeploys the backend.

---

## When Manual Action Is Required

### Environment Variables

If a new environment variable is introduced, it must be added manually:

* Vercel → Project Settings → Environment Variables
* Render → Environment Variables

### Database Changes

If database schema changes are introduced:

* Update database initialization code or migration scripts.
* Redeploy backend.

### Failed Deployments

If deployment fails:

1. Check GitHub Actions (if enabled).
2. Check Render deployment logs.
3. Check Vercel deployment logs.
4. Fix the issue and push again.

---

## Backend API

```text
GET  /api/progress
POST /api/progress
POST /api/exercises/verify
POST /api/lessons/enter                 # get-or-create a lesson's sandbox, return its state
POST /api/terminal/execute              # run a command in the lesson sandbox
POST /api/terminal/write-file           # save edited file content into the sandbox
POST /api/terminal/commit-details       # git show --stat for a commit
POST /api/terminal/rebase-interactive   # apply an interactive-rebase plan
POST /api/exercises/reset               # tear down and re-seed one lesson sandbox
GET  /api/exercises/checkpoints
GET  /health
```

API documentation:

```text
https://your-render-app.onrender.com/docs
```

---

## Local Development

Frontend:

```bash
npm install
npm run dev
```

Runs on:

```text
http://localhost:5173
```

Backend:

```bash
cd server
pip install -r requirements.txt
uvicorn main:app --reload
```

Runs on:

```text
http://localhost:8000
```

---

## Typical Development Workflow

```bash
# Make changes

git add .
git commit -m "Add new feature"
git push origin main
```

That's all that is required. Vercel and Render automatically redeploy the latest version from GitHub.
