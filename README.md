# Gitify - GitHub Visual Learning App

Gitify is a local React + Vite teaching app for learning Git and GitHub visually. It turns common Git workflows into interactive lessons so learners can see files, commits, branches, conflicts, remotes, and rebases move instead of only reading commands.

## Lessons

- Lesson 0: Git Basics - introduces version control and the edit -> stage -> commit -> push flow.
- Lesson 1: Visual Playground - lets users click `git add`, `git commit`, and `git push` to move files through the workflow.
- Lesson 2: Advanced Branching - shows main, feature, and bugfix branches across nested branch levels.
- Lesson 3: Merge Conflicts - teaches conflict markers, resolution choices, `git add`, and merge commits.
- Lesson 4: Git History & Time Travel - explores `git log`, diffs, detached HEAD, `git revert`, and `git reset`.
- Lesson 6: Remote Collaboration - explains fetch vs pull, upstream tracking, pull requests, forks, clones, and rejected pushes.
- Lesson 7: Rebase & Clean History - compares merge and rebase, includes interactive rebase actions, and explains safe force pushing.

Lesson 5 is not implemented yet.

## Commands Covered

The app introduces these commands through interactive scenarios:

```text
git add
git commit
git push
git branch
git checkout
git merge
git status
git log
git diff
git revert
git reset --soft
git reset --mixed
git reset --hard
git fetch
git pull
git remote -v
git pull --rebase
git rebase
git rebase -i HEAD~N
git rebase --abort
git push --force-with-lease
```

## Quick Start

Prerequisites:

- Node.js 16 or newer
- npm

Install dependencies:

```powershell
npm.cmd install
```

If PowerShell blocks `npm` with an execution policy error, use `npm.cmd` as shown above.

Run the dev server:

```powershell
npm.cmd run dev
```

Open the URL printed by Vite, usually:

```text
http://localhost:5173/
```

Build for production:

```powershell
npm.cmd run build
```

Preview the production build:

```powershell
npm.cmd run preview
```

## Project Structure

- `index.html` - Vite entry HTML.
- `package.json` - scripts and dependencies.
- `src/main.jsx` - React entry point.
- `src/App.jsx` - top-level lesson router.
- `src/components/Intro.jsx` - Lesson 0.
- `src/components/Flow.jsx` - Lesson 1 playground.
- `src/components/BranchingLesson.jsx` - Lesson 2.
- `src/components/MergeConflictsLesson.jsx` - Lesson 3.
- `src/components/HistoryLesson.jsx` - Lesson 4.
- `src/components/RemoteCollaborationLesson.jsx` - Lesson 6.
- `src/components/RebaseLesson.jsx` - Lesson 7.
- `src/components/Sidebar.jsx` - lesson navigation.
- `src/styles.css` - shared styling and lesson-specific UI.

## Development Notes

- Add new lessons as components under `src/components`.
- Register new lessons in `src/App.jsx` and `src/components/Sidebar.jsx`.
- Keep interactions local to each lesson component when possible.
- Use `src/styles.css` for the current shared styling approach.

## License

MIT
