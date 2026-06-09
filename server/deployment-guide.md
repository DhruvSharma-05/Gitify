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
GITIFY_DB_PATH=/tmp/gitify.db
GITIFY_SESSION_ROOT=/tmp/gitify-sessions
GITIFY_CORS_ORIGINS=https://your-vercel-app.vercel.app
```

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
POST /api/terminal/execute
POST /api/exercises/reset
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
