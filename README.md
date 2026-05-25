# Gitify 🚀 - GitHub Visual Learning App

Gitify is an interactive React + Vite web application designed to teach Git and GitHub concepts visually. It translates complex, abstract command-line workflows into intuitive, animated simulations so learners can *see* files, commits, branches, conflicts, remotes, and rebases in action.

---

## 🌟 Key Features

- **Interactive Animations**: Watch files, commits, and branches move dynamically across environments.
- **Micro-Animations & Visual Cues**: Visual indicators guide users through staging, committing, and pushing.
- **Harmonious Sleek Styling**: A premium dark-mode interface built on a modern design system.
- **Real-world Scenarios**: Simulates collaboration, branch merging, remote push conflicts, and history rewrites.

---

## 📚 Lessons

- **Lesson 0: Git Basics** ➔ Introduces version control and the core `edit` ➔ `stage` ➔ `commit` ➔ `push` flow.
- **Lesson 1: Visual Playground** ➔ A sandbox allowing learners to click actions and visually track files through the workflow.
- **Lesson 2: Advanced Branching** ➔ Shows main, feature, and bugfix branches across three nested branch levels.
- **Lesson 3: Merge Conflicts** ➔ Teaches conflict markers, manual resolution choices, staging, and final merge commits.
- **Lesson 4: Git History & Time Travel** ➔ Explores `git log`, diffs, detached HEAD, `git revert`, and soft/mixed/hard resets.
- **Lesson 5: Remote Collaboration** ➔ Explains fetch vs. pull, upstream tracking, PR review workflows, forks, clones, and push conflicts.
- **Lesson 6: Rebase & Clean History** ➔ Compares merge vs. rebase, features interactive rebasing, and explains safe force-pushing.

---

## 🛠️ Commands Covered

The app introduces these commands through guided interactive scenarios:

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

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or newer)
- **npm**

### Installation
Clone the repository and install all dependencies:
```powershell
npm install
```
*Note: If Windows PowerShell blocks execution due to policy settings, you can use `npm.cmd install` instead.*

### Run Development Server
Start the local server with hot-reload enabled:
```powershell
npm run dev
```
Navigate to the printed address (typically `http://localhost:5173/`).

### Production Build
To build and preview the optimized production application:
```powershell
# Build the application
npm run build

# Preview the build locally
npm run preview
```

---

## 📁 Project Structure

```text
├── index.html                                # Vite entry HTML document
├── package.json                              # Project scripts and dependencies
├── src/
│   ├── main.jsx                              # React mounting point
│   ├── App.jsx                               # Top-level lesson router & shell
│   ├── styles.css                            # Modern styling system
│   └── components/
│       ├── Sidebar.jsx                       # Navigation sidebar
│       ├── Intro.jsx                         # Lesson 0 (Git Basics)
│       ├── Flow.jsx                          # Lesson 1 (Visual Playground)
│       ├── BranchingLesson.jsx               # Lesson 2 (Advanced Branching)
│       ├── MergeConflictsLesson.jsx          # Lesson 3 (Merge Conflicts)
│       ├── HistoryLesson.jsx                 # Lesson 4 (History & Time Travel)
│       ├── RemoteCollaborationLesson.jsx     # Lesson 5 (Remote Collaboration)
│       └── RebaseLesson.jsx                  # Lesson 6 (Rebase & Clean History)
```

---

## 💡 Development Notes

- **Adding Lessons**: Create a new component inside `src/components/`, then register it within `src/App.jsx` and `src/components/Sidebar.jsx`.
- **Styling**: Make use of `src/styles.css` for maintaining consistent visual cues and responsive spacing.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
