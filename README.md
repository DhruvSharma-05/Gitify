# Gitify - GitHub Visual Learning App

 
Gitify is an interactive React + Vite web application designed to teach Git and GitHub concepts visually. It translates command-line workflows into animated simulations so learners can see files, commits, branches, conflicts, remotes, stashes, cherry-picks, and rebases in action.A way for new coders to understand git.

## Key Features

- Interactive animations for files, commits, branches, and remotes.
- Visual cues for staging, committing, pushing, merging, stashing, and rebasing.
- Real-world scenarios for conflicts, remote teamwork, history repair, and clean history.
- Local Vite app that is easy to run for lessons, demos, and classroom use.

## Lessons

- Lesson 0: Git Basics - introduces version control and the edit -> stage -> commit -> push flow.
- Lesson 1: Visual Playground - lets users click `git add`, `git commit`, and `git push` to move files through the workflow.
- Lesson 2: Advanced Branching - shows main, feature, and bugfix branches across nested branch levels.
- Lesson 3: Merge Conflicts - teaches conflict markers, resolution choices, `git add`, and merge commits.
- Lesson 4: Git History & Time Travel - explores `git log`, diffs, detached HEAD, `git revert`, and `git reset`.
- Lesson 5: Stash & Cherry-Pick - saves uncommitted work with stash and moves individual commits across branches.
- Lesson 6: Remote Collaboration - explains fetch vs pull, upstream tracking, pull requests, forks, clones, and rejected pushes.
- Lesson 7: Rebase & Clean History - compares merge and rebase, includes interactive rebase actions, and explains safe force pushing.

## Commands Covered

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
git stash
git stash push -m
git stash list
git stash apply
git stash pop
git cherry-pick <hash>
git cherry-pick <start>..<end>
git cherry-pick --continue
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

```text
index.html
package.json
src/
  main.jsx
  App.jsx
  styles.css
  components/
    Sidebar.jsx
    Intro.jsx
    Flow.jsx
    BranchingLesson.jsx
    MergeConflictsLesson.jsx
    HistoryLesson.jsx
    StashCherryPickLesson.jsx
    RemoteCollaborationLesson.jsx
    RebaseLesson.jsx
```

## Development Notes

- Add new lessons as components under `src/components`.
- Register new lessons in `src/App.jsx` and `src/components/Sidebar.jsx`.
- Keep interactions local to each lesson component when possible.
- Use `src/styles.css` for the current shared styling approach.

## License

MIT
