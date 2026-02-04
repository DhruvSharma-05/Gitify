# GitHub Visual — Interactive React Demo

A small, local React demo that visualizes the core Git workflow: working directory → staging area → local repository → remote. It's intended for teaching and quick demos.

## Features
- Visual boards for each stage of the Git workflow
- Buttons that simulate `git add`, `git commit`, and `git push`
- Activity log showing recent actions
- Lightweight Vite + React scaffold so you can run locally

## Quick Start

Prerequisites: Node.js (16+ recommended) and npm.

1. Install dependencies

```powershell
npm install
```

2. Run the dev server

```powershell
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

3. Build for production

```powershell
npm run build
npm run preview
```

## How it works (UI)
- Edit / Modify File — creates or edits a file in the Working Directory board.
- `git add` — moves files from Working Directory to the Staging Area.
- `git commit` — moves staged files into the Local Repo board.
- `git push` — simulates sending committed changes to the Remote board (with a short delay).

The right-side activity log shows a short history of actions.

## Project Structure
- `index.html` — Vite entry HTML
- `package.json` — scripts and deps
- `src/main.jsx` — React entry
- `src/App.jsx` — top-level app
- `src/components/Flow.jsx` — visualization + controls
- `src/styles.css` — styling

## Development notes
- To add more behavior, extend `src/components/Flow.jsx` and add visual transitions in `src/styles.css`.
- This demo is intentionally small and dependency-free besides React and Vite.

## Contributing
Feel free to open issues or submit pull requests to add features or polish the UI.

## License
MIT
