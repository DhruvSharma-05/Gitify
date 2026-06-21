// Regression tests for the in-browser offline git simulator (src/offlineGit.js).
// offlineGit.js is pure (no import.meta.env), so it imports cleanly under Node.
// Run: node scripts/test-offline-git.mjs
import { simulateCommandOffline, checkOfflineProgress } from '../src/offlineGit.js'

let passed = 0
const failures = []
function check(name, cond) {
  if (cond) passed++
  else failures.push(name)
}

// --- helpers ---------------------------------------------------------------
const forkState = () => ({
  initialized: false, branch: 'main', files: [], fileContents: {}, staged: [],
  commits: [], stashes: [], branches: ['main'], lessonId: 8, scenario: 'fork',
  fork: { fork: false, clone: false, commit: false, push: false, pr: false, merge: false, sync: false },
})
const bisectState = () => ({
  initialized: true, branch: 'main', files: ['cart.js'], fileContents: { 'cart.js': '//' },
  staged: [], commits: [], stashes: [], branches: ['main'], lessonId: 9,
})
const lesson0State = () => ({
  initialized: false, branch: 'main', files: ['index.js'], fileContents: { 'index.js': '//' },
  staged: [], commits: [], stashes: [], branches: ['main'], lessonId: 0,
})
const initState = () => simulateCommandOffline('git init', lesson0State(), 0).nextState
function run(seq, state, lessonId) {
  let s = state
  const outs = []
  for (const cmd of seq) {
    const r = simulateCommandOffline(cmd, s, lessonId)
    s = r.nextState
    outs.push(r)
  }
  return { s, outs }
}

// --- Lesson 8: fork & contribute -------------------------------------------
{
  const seq = [
    'gh repo fork octo/awesome-lib',
    'git clone https://github.com/you/awesome-lib',
    'git checkout -b fix-bug',
    'git commit -am "fix"',
    'git push origin fix-bug',
    'gh pr create',
    'gh pr merge',
  ]
  const { s, outs } = run(seq, forkState(), 8)
  const chk = checkOfflineProgress(s, 8)
  check('fork: full workflow verifies', chk.verified === true)
  check('fork: all 6 subtasks complete', chk.subtasks.length === 6 && chk.subtasks.every(t => t.completed))
  check('fork: every step succeeded', outs.every(o => o.status === 'success'))
}
check('fork: push before commit errors', simulateCommandOffline('git push origin x', forkState(), 8).status === 'error')
check('fork: clone before fork errors', simulateCommandOffline('git clone y', forkState(), 8).status === 'error')
check('fork: PR before push errors', simulateCommandOffline('gh pr create', forkState(), 8).status === 'error')
{
  const { s } = run(['gh repo fork x', 'git clone y'], forkState(), 8)
  check('fork: commit on main errors', simulateCommandOffline('git commit -am x', s, 8).status === 'error')
}
check('fork: partial progress not verified', checkOfflineProgress(run(['gh repo fork x'], forkState(), 8).s, 8).verified === false)

// --- Lesson 9: bisect ------------------------------------------------------
{
  const seq = ['git bisect start', 'git bisect bad', 'git bisect good a1b2c3d', 'git bisect reset']
  const { s } = run(seq, bisectState(), 9)
  const chk = checkOfflineProgress(s, 9)
  check('bisect: full workflow verifies', chk.verified === true)
  check('bisect: all subtasks complete', chk.subtasks.every(t => t.completed))
}
check('bisect: bad before start errors', simulateCommandOffline('git bisect bad', bisectState(), 9).status === 'error')
{
  const { s } = run(['git bisect start'], bisectState(), 9)
  check('bisect: good before bad errors', simulateCommandOffline('git bisect good x', s, 9).status === 'error')
}

// --- Shell-operator guard (the quote fix) ----------------------------------
{
  const { s } = run(['git init', 'git add .'], lesson0State(), 0)
  const r = simulateCommandOffline('git commit -m "fix > bug"', s, 0)
  check('shell-ops: quoted ">" in commit msg is NOT blocked', !r.output.includes('Offline mode simulates only basic'))
}
check('shell-ops: real "&&" chaining is blocked', simulateCommandOffline('git push && ls', lesson0State(), 0).output.includes('Offline mode simulates only basic'))
check('shell-ops: real "|" pipe is blocked', simulateCommandOffline('cat x | grep y', lesson0State(), 0).output.includes('Offline mode simulates only basic'))

// --- git commit -am message extraction fix ---------------------------------
{
  const s = initState()
  const s2 = simulateCommandOffline('git add .', s, 0).nextState
  const r = simulateCommandOffline('git commit -am "my feature"', s2, 0)
  check('commit -am: message extracted correctly', r.nextState.commits.some(c => c.message === 'my feature'))
  check('commit -am: not silently "Minor updates"', !r.nextState.commits.some(c => c.message === 'Minor updates'))
}
{
  const s = initState()
  const s2 = simulateCommandOffline('git add .', s, 0).nextState
  const r = simulateCommandOffline('git commit -a -m "another fix"', s2, 0)
  check('commit -a -m: message extracted correctly', r.nextState.commits.some(c => c.message === 'another fix'))
}

// --- git switch ------------------------------------------------------------
{
  const s = initState()
  const s2 = simulateCommandOffline('git commit -m "init"', simulateCommandOffline('git add .', s, 0).nextState, 0).nextState
  const r1 = simulateCommandOffline('git switch -c feature/test', s2, 0)
  check('switch -c: creates new branch', r1.status === 'success' && r1.nextState.branch === 'feature/test')
  // touch a new file then commit — parent must be the init commit, not empty
  const r1t = simulateCommandOffline('touch new.js', r1.nextState, 0)
  const r1a = simulateCommandOffline('git add .', r1t.nextState, 0)
  const r1b = simulateCommandOffline('git commit -m "branch work"', r1a.nextState, 0)
  const branchCommit = r1b.nextState.commits[r1b.nextState.commits.length - 1]
  const initCommit = r1b.nextState.commits[0]
  check('switch -c: new commit has correct parent (not empty)', branchCommit.parents.length > 0 && branchCommit.parents[0] === initCommit.hash)
  const r2 = simulateCommandOffline('git switch main', r1.nextState, 0)
  check('switch: switches to existing branch', r2.status === 'success' && r2.nextState.branch === 'main')
  const r3 = simulateCommandOffline('git switch nosuchbranch', r2.nextState, 0)
  check('switch: unknown branch errors', r3.status === 'error')
}

// --- iter24: git checkout -b parent chain ----------------------------------
{
  const s = initState()
  const s2 = simulateCommandOffline('git add .', s, 0).nextState
  const s3 = simulateCommandOffline('git commit -m "init"', s2, 0).nextState
  const initHash = s3.commits[0].hash
  const s4 = simulateCommandOffline('git checkout -b feature/auth', s3, 0).nextState
  // touch a new file so there's something to commit on the branch
  const s4t = simulateCommandOffline('touch auth.js', s4, 0).nextState
  const s4a = simulateCommandOffline('git add .', s4t, 0).nextState
  const s5 = simulateCommandOffline('git commit -m "auth feature"', s4a, 0).nextState
  const newCommit = s5.commits[s5.commits.length - 1]
  check('iter24: checkout -b: new commit has non-empty parents', newCommit.parents.length > 0)
  check('iter24: checkout -b: new commit parent is the init commit', newCommit.parents[0] === initHash)
}

// --- git restore -----------------------------------------------------------
{
  const s = initState()
  const s2 = simulateCommandOffline('git add .', s, 0).nextState
  check('restore: file is staged before restore', s2.staged.includes('index.js'))
  const r = simulateCommandOffline('git restore --staged index.js', s2, 0)
  check('restore --staged: unstages file', r.status === 'success' && !r.nextState.staged.includes('index.js'))
}

// --- git add -u ------------------------------------------------------------
{
  const s = initState()
  const r = simulateCommandOffline('git add -u', s, 0)
  check('add -u: stages all tracked files', r.status === 'success' && r.nextState.staged.length > 0)
}

// --- git log --oneline -----------------------------------------------------
{
  const s = initState()
  const s2 = simulateCommandOffline('git add .', s, 0).nextState
  const s3 = simulateCommandOffline('git commit -m "first commit"', s2, 0).nextState
  const r = simulateCommandOffline('git log --oneline', s3, 0)
  check('log --oneline: no "Author:" line', !r.output.includes('Author:'))
  check('log --oneline: contains commit message', r.output.includes('first commit'))
}

// --- git remote ------------------------------------------------------------
{
  const s = initState()
  const r = simulateCommandOffline('git remote add origin https://github.com/me/repo.git', s, 0)
  check('remote add: succeeds', r.status === 'success')
  check('remote add: stores URL', r.nextState.remote === 'https://github.com/me/repo.git')
  const r2 = simulateCommandOffline('git remote -v', r.nextState, 0)
  check('remote -v: shows origin URL', r2.output.includes('origin') && r2.output.includes('https://github.com/me/repo.git'))
}

// --- git diff --------------------------------------------------------------
{
  const s = initState()
  const r = simulateCommandOffline('git diff', s, 0)
  check('diff: succeeds on initialized repo', r.status === 'success')
}

// --- Cycle 2: git commit -a auto-stages tracked files ----------------------
{
  const s = initState()
  // Files exist but nothing staged; -am should auto-stage and commit
  const r = simulateCommandOffline('git commit -am "auto-stage"', s, 0)
  check('commit -am: auto-stages tracked files when none staged', r.status === 'success')
  check('commit -am: message is preserved when auto-staging', r.nextState.commits.some(c => c.message === 'auto-stage'))
}

// --- Cycle 2: git stash list / show / drop ---------------------------------
{
  const s = initState()
  const s2 = simulateCommandOffline('git stash', s, 0).nextState
  check('stash list: shows entry', simulateCommandOffline('git stash list', s2, 0).output.includes('stash@{'))
  check('stash show: shows files', simulateCommandOffline('git stash show', s2, 0).status === 'success')
  const s3 = simulateCommandOffline('git stash drop', s2, 0).nextState
  check('stash drop: removes entry', s3.stashes.length === 0)
}

// --- Cycle 2: git branch -d ------------------------------------------------
{
  const s = initState()
  const s2 = simulateCommandOffline('git add .', s, 0).nextState
  const s3 = simulateCommandOffline('git commit -m "init"', s2, 0).nextState
  const s4 = simulateCommandOffline('git branch feature/x', s3, 0).nextState
  check('branch -d: deletes existing branch', simulateCommandOffline('git branch -d feature/x', s4, 0).status === 'success')
  check('branch -d: cannot delete current branch', simulateCommandOffline('git branch -d main', s4, 0).status === 'error')
}

// --- iter28: git reset -------------------------------------------------------
{
  // git reset HEAD <file> — unstage
  const s = initState()
  const s2 = simulateCommandOffline('git add .', s, 0).nextState
  check('reset: file staged before reset', s2.staged.includes('index.js'))
  const r = simulateCommandOffline('git reset HEAD index.js', s2, 0)
  check('reset: git reset HEAD <file> unstages the file', r.status === 'success' && !r.nextState.staged.includes('index.js'))
}
{
  // git reset --hard <hash> — remove commits after hash (lesson 4 reset_done)
  const s4 = getInitialOfflineState(4)
  const r = simulateCommandOffline('git reset --hard d4d4d4d', s4, 4)
  check('reset: hard reset to hash succeeds', r.status === 'success')
  check('reset: commits after target are removed', !r.nextState.commits.some(c => c.message.toLowerCase().includes('skip null metric check')))
  check('reset: commits before target remain', r.nextState.commits.some(c => c.hash === 'd4d4d4d'))
  // lesson 4 reset_done should now be true
  const p = checkOfflineProgress(r.nextState, 4)
  check('reset: lesson 4 reset_done satisfied after hard reset', p.verified === true)
}
{
  // git reset HEAD~1 — remove last commit
  const s = initState()
  const s2 = simulateCommandOffline('git add .', s, 0).nextState
  const s3 = simulateCommandOffline('git commit -m "first"', s2, 0).nextState
  check('reset: HEAD~1 removes last commit', simulateCommandOffline('git reset HEAD~1', s3, 0).nextState.commits.length === 0)
}

// --- iter27: git revert sets correct parent --------------------------------
{
  const s4 = getInitialOfflineState(4)
  const headHash = s4.commits[s4.commits.length - 1].hash
  const r = simulateCommandOffline('git revert e5e5e5e', s4, 4)
  check('iter27: git revert succeeds', r.status === 'success')
  const revertCommit = r.nextState.commits[r.nextState.commits.length - 1]
  check('iter27: revert commit has non-empty parents', revertCommit.parents.length > 0)
  check('iter27: revert commit parent is previous HEAD', revertCommit.parents[0] === headHash)
}

// --- Cycle 2: git status shows clean after commit --------------------------
{
  const s = initState()
  const s2 = simulateCommandOffline('git add .', s, 0).nextState
  const s3 = simulateCommandOffline('git commit -m "init"', s2, 0).nextState
  const r = simulateCommandOffline('git status', s3, 0)
  check('status: clean after commit (no untracked files)', r.output.includes('nothing to commit'))
}

// --- Iter 23: git stash uses actual uncommitted files, not hardcoded ones ----
{
  // Lesson 5: Checkout.jsx and styles.css are WIP — stash should save them
  const s5 = getInitialOfflineState(5)
  const r = simulateCommandOffline('git stash', s5, 5)
  check('iter23: lesson 5 stash saves WIP files', r.status === 'success')
  check('iter23: lesson 5 stash removes WIP files from workspace', !r.nextState.files.includes('Checkout.jsx'))
  check('iter23: lesson 5 stash records correct files', r.nextState.stashes[0].files.includes('Checkout.jsx'))
  // Pop restores them
  const r2 = simulateCommandOffline('git stash pop', r.nextState, 5)
  check('iter23: lesson 5 stash pop restores Checkout.jsx', r2.nextState.files.includes('Checkout.jsx'))
  check('iter23: lesson 5 stash pop restores styles.css', r2.nextState.files.includes('styles.css'))
}
{
  // Lesson 2: all files committed — stash has nothing to save
  const s2 = getInitialOfflineState(2)
  const r = simulateCommandOffline('git stash', s2, 2)
  check('iter23: lesson 2 stash with no WIP says "No local changes to save"', r.output.includes('No local changes to save'))
  check('iter23: lesson 2 stash creates no stash entry', r.nextState.stashes.length === 0)
  check('iter23: lesson 2 files unaffected by stash', r.nextState.files.includes('index.js'))
}
{
  // Lesson 2: stash pop after no stash entry — should error, not inject Checkout.jsx
  const s2 = getInitialOfflineState(2)
  const r = simulateCommandOffline('git stash pop', s2, 2)
  check('iter23: lesson 2 stash pop with empty stash errors', r.status === 'error')
  check('iter23: lesson 2 stash pop does not inject Checkout.jsx', !r.nextState.files.includes('Checkout.jsx'))
}

// --- Iter 22: git status clean for pre-seeded lessons (2-9) ----------------
import { getInitialOfflineState } from '../src/api.js'
{
  // Lesson 2 starts with index.js already committed — status should be clean
  const s2 = getInitialOfflineState(2)
  const r = simulateCommandOffline('git status', s2, 2)
  check('iter22: lesson 2 initial git status shows nothing to commit', r.output.includes('nothing to commit'))
  check('iter22: lesson 2 initial git status has no untracked files', !r.output.includes('Untracked files'))
}
{
  // Lesson 4: all files already committed
  const s4 = getInitialOfflineState(4)
  const r = simulateCommandOffline('git status', s4, 4)
  check('iter22: lesson 4 initial git status shows nothing to commit', r.output.includes('nothing to commit'))
}
{
  // Lesson 9: all files already committed
  const s9 = getInitialOfflineState(9)
  const r = simulateCommandOffline('git status', s9, 9)
  check('iter22: lesson 9 initial git status shows nothing to commit', r.output.includes('nothing to commit'))
}
{
  // Lesson 5: Checkout.jsx and styles.css are intentional WIP — must still show as untracked
  const s5 = getInitialOfflineState(5)
  const r = simulateCommandOffline('git status', s5, 5)
  check('iter22: lesson 5 WIP files still show as untracked', r.output.includes('Untracked files'))
}

// --- report ----------------------------------------------------------------
if (failures.length) {
  console.error(`offline-git tests: ${passed} passed, ${failures.length} FAILED`)
  failures.forEach(f => console.error('  ✗ ' + f))
  process.exit(1)
}
console.log(`offline-git regression tests passed (${passed} assertions)`)
