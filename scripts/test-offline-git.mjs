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

// --- iter31: git log filters to HEAD's reachable commits only ---------------
{
  const s = initState()
  const s2 = simulateCommandOffline('git add .', s, 0).nextState
  const s3 = simulateCommandOffline('git commit -m "init"', s2, 0).nextState
  const s4 = simulateCommandOffline('git checkout -b feature/x', s3, 0).nextState
  const s4t = simulateCommandOffline('touch f.js', s4, 0).nextState
  const s4a = simulateCommandOffline('git add .', s4t, 0).nextState
  const s5 = simulateCommandOffline('git commit -m "feature work"', s4a, 0).nextState
  // Switch back to main — git log from main should NOT show the feature commit
  const s6 = simulateCommandOffline('git checkout main', s5, 0).nextState
  const logFromMain = simulateCommandOffline('git log --oneline', s6, 0)
  check('iter31: git log from main excludes unmerged feature commits', !logFromMain.output.includes('feature work'))
  check('iter31: git log from main shows init commit', logFromMain.output.includes('init'))
  // git log from feature branch should show both
  const logFromFeature = simulateCommandOffline('git log --oneline', s5, 0)
  check('iter31: git log from feature shows feature commit', logFromFeature.output.includes('feature work'))
  check('iter31: git log from feature shows init commit', logFromFeature.output.includes('init'))
}

// --- iter29: second commit on branch has correct parent (not the root) -----
{
  const s = initState()
  const s2 = simulateCommandOffline('git add .', s, 0).nextState
  const s3 = simulateCommandOffline('git commit -m "init"', s2, 0).nextState
  const s4 = simulateCommandOffline('git checkout -b feature/auth', s3, 0).nextState
  const s5t = simulateCommandOffline('touch auth.js', s4, 0).nextState
  const s5a = simulateCommandOffline('git add .', s5t, 0).nextState
  const s5 = simulateCommandOffline('git commit -m "first on branch"', s5a, 0).nextState
  const firstBranchHash = s5.commits[s5.commits.length - 1].hash
  // Second commit — parent should be firstBranchHash, not the root
  const s6t = simulateCommandOffline('touch util.js', s5, 0).nextState
  const s6a = simulateCommandOffline('git add .', s6t, 0).nextState
  const s6 = simulateCommandOffline('git commit -m "second on branch"', s6a, 0).nextState
  const secondCommit = s6.commits[s6.commits.length - 1]
  check('iter29: second branch commit parent is first branch commit (not root)', secondCommit.parents[0] === firstBranchHash)
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
  // -u should stage tracked files; use a pre-committed state (lesson 4)
  const s4 = getInitialOfflineState(4)
  const r = simulateCommandOffline('git add -u', s4, 4)
  check('add -u: stages tracked files when committed_files exist', r.status === 'success' && r.nextState.staged.length > 0)
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
  // Use a state with committed_files so -am has tracked files to auto-stage
  const s4 = getInitialOfflineState(4)
  const r = simulateCommandOffline('git commit -am "auto-stage"', s4, 4)
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
  // git reset HEAD~1 with two commits removes the last one and moves HEAD back.
  const s = initState()
  const s2 = simulateCommandOffline('git add .', s, 0).nextState
  const s3 = simulateCommandOffline('git commit -m "first"', s2, 0).nextState
  const s4 = simulateCommandOffline('git commit -m "second"', simulateCommandOffline('git add .', s3, 0).nextState, 0).nextState
  const r = simulateCommandOffline('git reset HEAD~1', s4, 0)
  check('reset: HEAD~1 removes the last of two commits', r.nextState.commits.length === 1)
  check('reset: HEAD~1 leaves first commit as HEAD', r.nextState.commits.find(c => c.is_head)?.message === 'first')
  // On a single-commit repo HEAD~1 is past the root → error, matching real git
  // (which fails with "ambiguous argument 'HEAD~1'"). Previously this silently
  // emptied history, which neither real git nor any lesson expects.
  check('reset: HEAD~1 past the root errors', simulateCommandOffline('git reset HEAD~1', s3, 0).status === 'error')
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

// --- Iter 43: git rm stages deletion; Iter 45 ensures commit processes it -------
{
  const s4 = getInitialOfflineState(4)
  const r = simulateCommandOffline('git rm Dashboard.jsx', s4, 4)
  check('iter43: git rm succeeds', r.status === 'success')
  check('iter43: git rm removes from files array', !r.nextState.files.includes('Dashboard.jsx'))
  check('iter43: git rm stages deletion in staged_deletions', (r.nextState.staged_deletions || []).includes('Dashboard.jsx'))
  check('iter43: git rm output contains filename', r.output.includes('Dashboard.jsx'))
}
{
  // git rm --cached keeps the file in workspace but stages deletion
  const s4 = getInitialOfflineState(4)
  const r = simulateCommandOffline('git rm --cached Dashboard.jsx', s4, 4)
  check('iter43: git rm --cached succeeds', r.status === 'success')
  check('iter43: git rm --cached keeps file in workspace', r.nextState.files.includes('Dashboard.jsx'))
  check('iter43: git rm --cached stages deletion', (r.nextState.staged_deletions || []).includes('Dashboard.jsx'))
}
{
  check('iter43: git rm nonexistent file errors', simulateCommandOffline('git rm notafile.js', getInitialOfflineState(4), 4).status === 'error')
}

// --- Iter 60: git merge --abort and git rebase --abort/--continue -----------
{
  // git merge --abort cancels active conflict
  const s3 = getInitialOfflineState(3)
  let r = simulateCommandOffline('git merge feature/ui', s3, 3)
  check('iter60: merge produces conflict', r.nextState.conflict_active === true)
  r = simulateCommandOffline('git merge --abort', r.nextState, 3)
  check('iter60: merge --abort clears conflict', r.nextState.conflict_active === false)
  check('iter60: merge --abort succeeds', r.status === 'success')
  check('iter60: merge --abort when no conflict errors', simulateCommandOffline('git merge --abort', s3, 3).status === 'error')
}
{
  // git rebase --abort and --continue
  const s = initState()
  let r = simulateCommandOffline('git add index.js', s, 0)
  r = simulateCommandOffline('git commit -m "c1"', r.nextState, 0)
  r = simulateCommandOffline('git rebase --abort', r.nextState, 0)
  check('iter60: rebase --abort succeeds', r.status === 'success')
  check('iter60: rebase --abort output indicates aborted', r.output.includes('aborted'))
  r = simulateCommandOffline('git rebase --continue', r.nextState, 0)
  check('iter60: rebase --continue succeeds', r.status === 'success')
}

// --- Iter 59: git remote rename/remove/get-url/set-url ----------------------
{
  const s = initState()
  let r = simulateCommandOffline('git remote add origin https://github.com/you/repo.git', s, 0)
  // rename
  r = simulateCommandOffline('git remote rename origin upstream', r.nextState, 0)
  check('iter59: git remote rename updates remoteName', r.nextState.remoteName === 'upstream')
  // get-url
  r = simulateCommandOffline('git remote get-url upstream', r.nextState, 0)
  check('iter59: git remote get-url returns URL', r.output.includes('github.com'))
  // set-url
  r = simulateCommandOffline('git remote set-url upstream https://gitlab.com/you/repo.git', r.nextState, 0)
  check('iter59: git remote set-url updates URL', r.nextState.remote.includes('gitlab.com'))
  // remove
  r = simulateCommandOffline('git remote remove upstream', r.nextState, 0)
  check('iter59: git remote remove clears remote', r.nextState.remote === null)
}

// --- Iter 58: git config get/set/list ----------------------------------------
{
  const s = initState()
  let r = simulateCommandOffline('git config user.name "Alice"', s, 0)
  check('iter58: git config set succeeds', r.status === 'success')
  check('iter58: git config set stores value', r.nextState.config['user.name'] === 'Alice')
  r = simulateCommandOffline('git config user.name', r.nextState, 0)
  check('iter58: git config get returns value', r.output === 'Alice')
  r = simulateCommandOffline('git config --list', r.nextState, 0)
  check('iter58: git config --list shows stored entry', r.output.includes('user.name=Alice'))
}

// --- Iter 57: git log --all shows commits from all branches, not just HEAD ---
{
  const s = initState()
  let r = simulateCommandOffline('git add index.js', s, 0)
  r = simulateCommandOffline('git commit -m "root"', r.nextState, 0)
  r = simulateCommandOffline('git checkout -b feature', r.nextState, 0)
  r = simulateCommandOffline('touch b.js', r.nextState, 0)
  r = simulateCommandOffline('git add b.js', r.nextState, 0)
  r = simulateCommandOffline('git commit -m "feature commit"', r.nextState, 0)
  // Switch back to main so feature commit is NOT reachable from HEAD
  r = simulateCommandOffline('git checkout main', r.nextState, 0)
  const logMain = simulateCommandOffline('git log --oneline', r.nextState, 0)
  check('iter57: git log without --all shows only main commits', logMain.output.split('\n').length === 1)
  const logAll = simulateCommandOffline('git log --all --oneline', r.nextState, 0)
  check('iter57: git log --all shows commits from all branches', logAll.output.split('\n').length === 2)
  check('iter57: git log --all includes feature branch commit', logAll.output.includes('feature commit'))
}

// --- Iter 56: git stash pop/apply/drop stash@{N} respects index -------------
{
  const s5 = getInitialOfflineState(5)
  // Build two stashes: stash first, then add a new untracked file and stash again
  let r = simulateCommandOffline('git stash push -m "first"', s5, 5)
  r = simulateCommandOffline('touch wip1.js', r.nextState, 5)
  r = simulateCommandOffline('git stash push -m "second"', r.nextState, 5)
  check('iter56: pre-condition: two stashes exist', r.nextState.stashes.length === 2)
  // stash@{1} = the older one ("first")
  const r2 = simulateCommandOffline('git stash pop stash@{1}', r.nextState, 5)
  check('iter56: stash pop stash@{1} leaves one stash', r2.nextState.stashes.length === 1)
  check('iter56: stash pop stash@{1} keeps the newer stash', r2.nextState.stashes[0].message === 'second')
}
{
  // git stash drop stash@{N}
  const s5 = getInitialOfflineState(5)
  let r = simulateCommandOffline('git stash push -m "first"', s5, 5)
  r = simulateCommandOffline('touch wip2.js', r.nextState, 5)
  r = simulateCommandOffline('git stash push -m "second"', r.nextState, 5)
  const r2 = simulateCommandOffline('git stash drop stash@{0}', r.nextState, 5)
  check('iter56: stash drop stash@{0} removes newest', r2.nextState.stashes.length === 1)
  check('iter56: stash drop stash@{0} keeps older stash', r2.nextState.stashes[0].message === 'first')
}

// --- Iter 55: git tag -a <name> creates annotated tag; git tag -d deletes ----
{
  const s4 = getInitialOfflineState(4)
  // Lightweight tag
  let r = simulateCommandOffline('git tag v1.0', s4, 4)
  check('iter55: git tag v1.0 succeeds', r.status === 'success')
  check('iter55: git tag v1.0 adds to tags list', r.nextState.tags.includes('v1.0'))
  // Annotated tag with -a flag
  r = simulateCommandOffline('git tag -a v2.0 -m "release"', s4, 4)
  check('iter55: git tag -a v2.0 succeeds', r.status === 'success')
  check('iter55: git tag -a extracts real name, not "-a"', r.nextState.tags.includes('v2.0') && !r.nextState.tags.includes('-a'))
  // Delete tag
  let r2 = simulateCommandOffline('git tag v1.0', s4, 4)
  r2 = simulateCommandOffline('git tag -d v1.0', r2.nextState, 4)
  check('iter55: git tag -d removes tag', !r2.nextState.tags.includes('v1.0'))
  check('iter55: git tag -d nonexistent errors', simulateCommandOffline('git tag -d notexist', s4, 4).status === 'error')
}

// --- Iter 54: git show displays commit details --------------------------------
{
  const s = initState()
  let r = simulateCommandOffline('git add index.js', s, 0)
  r = simulateCommandOffline('git commit -m "initial commit"', r.nextState, 0)
  const commitHash = r.nextState.commits[r.nextState.commits.length - 1].hash
  // git show (HEAD)
  const rHead = simulateCommandOffline('git show', r.nextState, 0)
  check('iter54: git show succeeds', rHead.status === 'success')
  check('iter54: git show includes commit message', rHead.output.includes('initial commit'))
  // git show <hash>
  const rHash = simulateCommandOffline(`git show ${commitHash}`, r.nextState, 0)
  check('iter54: git show <hash> succeeds', rHash.status === 'success')
  check('iter54: git show <hash> includes message', rHash.output.includes('initial commit'))
  // git show <unknown>
  const rBad = simulateCommandOffline('git show deadbeef', r.nextState, 0)
  check('iter54: git show unknown hash errors', rBad.status === 'error')
}

// --- Iter 53: git stash push -m / save preserves message in stash list ------
{
  const s5 = getInitialOfflineState(5)
  let r = simulateCommandOffline('git stash push -m "my wip"', s5, 5)
  check('iter53: stash push -m succeeds', r.status === 'success')
  const listR = simulateCommandOffline('git stash list', r.nextState, 5)
  check('iter53: stash list shows custom message', listR.output.includes('my wip'))
  check('iter53: stash list uses "On branch" format for named stash', listR.output.includes('On '))
}
{
  const s5 = getInitialOfflineState(5)
  let r = simulateCommandOffline('git stash save "save message"', s5, 5)
  check('iter53: git stash save with message succeeds', r.status === 'success')
  const listR = simulateCommandOffline('git stash list', r.nextState, 5)
  check('iter53: git stash save message appears in list', listR.output.includes('save message'))
}

// --- Iter 52: git log -n N / -N / --max-count=N limits output ---------------
{
  // Build a state with 3 commits
  const s = initState()
  let r = simulateCommandOffline('git add index.js', s, 0)
  r = simulateCommandOffline('git commit -m "c1"', r.nextState, 0)
  r = simulateCommandOffline('touch b.js', r.nextState, 0)
  r = simulateCommandOffline('git add b.js', r.nextState, 0)
  r = simulateCommandOffline('git commit -m "c2"', r.nextState, 0)
  r = simulateCommandOffline('touch c.js', r.nextState, 0)
  r = simulateCommandOffline('git add c.js', r.nextState, 0)
  r = simulateCommandOffline('git commit -m "c3"', r.nextState, 0)
  const s3 = r.nextState // 3 commits
  const rAll = simulateCommandOffline('git log --oneline', s3, 0)
  check('iter52: git log without -n shows all 3 commits', rAll.output.split('\n').length === 3)
  const r1 = simulateCommandOffline('git log -n 1 --oneline', s3, 0)
  check('iter52: git log -n 1 shows only 1 commit', r1.output.split('\n').length === 1)
  const r2 = simulateCommandOffline('git log -2 --oneline', s3, 0)
  check('iter52: git log -2 shows only 2 commits', r2.output.split('\n').length === 2)
  const r3 = simulateCommandOffline('git log --max-count=1 --oneline', s3, 0)
  check('iter52: git log --max-count=1 shows only 1 commit', r3.output.split('\n').length === 1)
}

// --- Iter 51: git commit --amend replaces HEAD commit, not creates new one --
{
  const s = initState()
  let r = simulateCommandOffline('git add index.js', s, 0)
  r = simulateCommandOffline('git commit -m "original message"', r.nextState, 0)
  const beforeLen = r.nextState.commits.length
  r = simulateCommandOffline('git commit --amend -m "corrected message"', r.nextState, 0)
  check('iter51: git commit --amend does not add a new commit', r.nextState.commits.length === beforeLen)
  check('iter51: git commit --amend updates HEAD message', r.nextState.commits.find(c => c.is_head)?.message === 'corrected message')
  check('iter51: git commit --amend succeeds', r.status === 'success')
}
{
  // --amend with no staged changes and no -m keeps the existing message
  const s = initState()
  let r = simulateCommandOffline('git add index.js', s, 0)
  r = simulateCommandOffline('git commit -m "keep this"', r.nextState, 0)
  r = simulateCommandOffline('git commit --amend', r.nextState, 0)
  check('iter51: git commit --amend with no -m keeps existing message', r.nextState.commits.find(c => c.is_head)?.message === 'keep this')
}

// --- Iter 50: git branch -m renames the current branch ----------------------
{
  const s4 = getInitialOfflineState(4)
  const r = simulateCommandOffline('git branch -m new-history', s4, 4)
  check('iter50: git branch -m succeeds', r.status === 'success')
  check('iter50: git branch -m updates branch state', r.nextState.branch === 'new-history')
  check('iter50: git branch -m adds new name to branches list', r.nextState.branches.includes('new-history'))
  check('iter50: git branch -m removes old name from branches list', !r.nextState.branches.includes('main'))
  check('iter50: git branch -m updates commit branch labels', r.nextState.commits.every(c => !c.branches.includes('main')))
}
{
  // git branch -m <old> <new> explicit old branch name
  const s4 = getInitialOfflineState(4)
  let r = simulateCommandOffline('git checkout -b feature', s4, 4)
  r = simulateCommandOffline('git branch -m feature renamed-feature', r.nextState, 4)
  check('iter50: git branch -m <old> <new> renames target branch', r.nextState.branches.includes('renamed-feature'))
  check('iter50: git branch -m <old> <new> removes old target', !r.nextState.branches.includes('feature'))
}

// --- Iter 49: git add -u only stages tracked files, not untracked -----------
{
  // Fresh state with one untracked file: -u should NOT stage it
  const s = initState()
  const r = simulateCommandOffline('git add -u', s, 0)
  check('iter49: git add -u on repo with no prior commits stages nothing', r.nextState.staged.length === 0)
}
{
  // Mixed state: -u stages tracked but not untracked
  const s4 = getInitialOfflineState(4)
  let r = simulateCommandOffline('touch brand-new.js', s4, 4)
  r = simulateCommandOffline('git add -u', r.nextState, 4)
  check('iter49: git add -u does not stage untracked file', !r.nextState.staged.includes('brand-new.js'))
  check('iter49: git add -u stages tracked files', r.nextState.staged.some(f => (s4.committed_files || []).includes(f)))
}

// --- Iter 47: git checkout -- <file> discards working-tree changes ----------
{
  const s4 = getInitialOfflineState(4)
  const r = simulateCommandOffline('git checkout -- Dashboard.jsx', s4, 4)
  check('iter47: git checkout -- <file> succeeds', r.status === 'success')
  check('iter47: git checkout -- <file> outputs Restored', r.output.includes('Restored'))
}
{
  const r = simulateCommandOffline('git checkout --', getInitialOfflineState(4), 4)
  check('iter47: git checkout -- with no file errors gracefully', r.status === 'error')
}

// --- Iter 46: git restore --staged . clears all staged files ----------------
{
  // git restore --staged . should unstage everything
  const s = initState()
  let r = simulateCommandOffline('git add index.js', s, 0)
  check('iter46: pre-condition: file is staged', r.nextState.staged.includes('index.js'))
  r = simulateCommandOffline('git restore --staged .', r.nextState, 0)
  check('iter46: git restore --staged . unstages all files', r.nextState.staged.length === 0)
  check('iter46: git restore --staged . succeeds', r.status === 'success')
}
{
  // git restore --staged <file> still works for specific files
  const s4 = getInitialOfflineState(4)
  let r = simulateCommandOffline('git add Dashboard.jsx', s4, 4)
  r = simulateCommandOffline('git restore --staged Dashboard.jsx', r.nextState, 4)
  check('iter46: git restore --staged <file> unstages specific file', !r.nextState.staged.includes('Dashboard.jsx'))
}

// --- Iter 45: git rm + commit removes file from committed_files; status shows deleted: ---
{
  // Full workflow: git rm → git commit should actually finalize the deletion
  const s4 = getInitialOfflineState(4)
  let r = simulateCommandOffline('git rm Dashboard.jsx', s4, 4)
  check('iter45: git status after rm shows deleted:', simulateCommandOffline('git status', r.nextState, 4).output.includes('deleted'))
  r = simulateCommandOffline('git commit -m "remove Dashboard"', r.nextState, 4)
  check('iter45: commit after git rm succeeds', r.status === 'success')
  check('iter45: committed_files no longer contains removed file', !r.nextState.committed_files.includes('Dashboard.jsx'))
  check('iter45: staged_deletions cleared after commit', (r.nextState.staged_deletions || []).length === 0)
}

// --- Iter 44: git commit -am only auto-stages tracked files, not untracked ----
{
  // Untracked-only workspace: -am should say "nothing to commit"
  const s = initState()
  const r = simulateCommandOffline('git commit -am "should not commit untracked"', s, 0)
  check('iter44: commit -am with only untracked files says nothing to commit', r.output.includes('nothing to commit'))
}
{
  // Mixed: -am stages tracked files but not the new untracked file
  const s4 = getInitialOfflineState(4)
  let r = simulateCommandOffline('touch newfile.js', s4, 4)
  r = simulateCommandOffline('git commit -am "auto-stage tracked"', r.nextState, 4)
  check('iter44: commit -am with tracked files succeeds', r.status === 'success')
  check('iter44: commit -am does not include untracked file in committed_files', !r.nextState.committed_files.includes('newfile.js'))
}
{
  // After git init + touch (no prior commits), -am should not commit the untracked file
  const s = initState()
  let r = simulateCommandOffline('touch readme.md', s, 0)
  r = simulateCommandOffline('git commit -am "noop"', r.nextState, 0)
  check('iter44: commit -am on clean repo with untracked file stays empty', r.nextState.commits.length === 0)
}

// --- Iter 42: git status shows modified: for tracked files, new file: for untracked ---
{
  // Untracked file staged → "new file:"
  const s = initState()
  const s2 = simulateCommandOffline('git add index.js', s, 0).nextState
  const r = simulateCommandOffline('git status', s2, 0)
  check('iter42: untracked file staged shows new file:', r.output.includes('new file'))
  check('iter42: untracked file staged does NOT show modified:', !r.output.includes('modified'))
}
{
  // Already-committed file staged → "modified:"
  const s4 = getInitialOfflineState(4)
  // Dashboard.jsx is in committed_files; stage it
  const s2 = simulateCommandOffline('git add Dashboard.jsx', s4, 4).nextState
  const r = simulateCommandOffline('git status', s2, 4)
  check('iter42: committed file staged shows modified:', r.output.includes('modified'))
  check('iter42: committed file staged does NOT show new file:', !r.output.includes('new file'))
}

// --- Iter 40: git diff <file> extracts filename correctly -------------------
{
  const s = initState()
  const r = simulateCommandOffline('git diff index.js', s, 0)
  check('iter40: git diff <file> succeeds', r.status === 'success')
  check('iter40: git diff <file> shows filename, not "git"', r.output.includes('index.js') && !r.output.includes('a/git'))
}
{
  // git diff (no file) shows unstaged files
  const s = initState()
  const r = simulateCommandOffline('git diff', s, 0)
  check('iter40: git diff no file succeeds', r.status === 'success')
  // index.js is untracked/unstaged, should appear in diff output
  check('iter40: git diff no file includes untracked file', r.output.includes('index.js'))
}
{
  // git diff HEAD (HEAD ref should not be treated as filename)
  const s = initState()
  const r = simulateCommandOffline('git diff HEAD', s, 0)
  check('iter40: git diff HEAD does not diff a file named HEAD', !r.output.includes('a/HEAD'))
}

// --- Iter 38: git stash list shows newest stash as stash@{0} ----------------
{
  const s = initState()
  const s1 = simulateCommandOffline('git stash', s, 0).nextState
  // touch another file so we have something to stash again
  const s2t = simulateCommandOffline('touch second.js', s1, 0).nextState
  const s2 = simulateCommandOffline('git stash', s2t, 0).nextState
  const listOut = simulateCommandOffline('git stash list', s2, 0).output
  const lines = listOut.split('\n')
  check('iter38: stash list has 2 entries', lines.length === 2)
  // stash@{0} should be the most recent (second stash has 'second.js')
  // stash@{0} is first line; stash@{1} is second line
  check('iter38: stash list stash@{0} is on first line', lines[0].startsWith('stash@{0}'))
  check('iter38: stash list stash@{1} is on second line', lines[1].startsWith('stash@{1}'))
}

// --- Iter 37: checkout/switch to existing branch uses last tip commit --------
{
  // Scenario: commit on main, checkout -b feature, commit on feature, go back to main,
  // commit on main, then switch back to feature — should land on the feature tip, not root.
  const s = initState()
  const { s: sA } = run(['git add .', 'git commit -m "A on main"'], s, 0)
  const { s: sB } = run(['git checkout -b feature'], sA, 0)
  const { s: sC } = run(['touch f.js', 'git add .', 'git commit -m "B on feature"'], sB, 0)
  const featureTipHash = sC.commits.find(c => c.message === 'B on feature').hash
  // Return to main, make a new commit
  const { s: sD } = run(['git checkout main', 'touch m.js', 'git add .', 'git commit -m "C on main"'], sC, 0)
  // Switch back to feature
  const sE = simulateCommandOffline('git checkout feature', sD, 0).nextState
  check('iter37: checkout feature after divergence: HEAD is feature tip', sE.commits.find(c => c.is_head)?.hash === featureTipHash)
  check('iter37: checkout feature: branch is feature', sE.branch === 'feature')
  // git log from feature should show only A and B (not C on main)
  const logE = simulateCommandOffline('git log --oneline', sE, 0)
  check('iter37: git log on feature excludes main-only commit', !logE.output.includes('C on main'))
  check('iter37: git log on feature includes feature commit', logE.output.includes('B on feature'))
}
{
  // Same but using switch
  const s = initState()
  const { s: sA } = run(['git add .', 'git commit -m "A"'], s, 0)
  const { s: sB } = run(['git switch -c feat2'], sA, 0)
  const { s: sC } = run(['touch f2.js', 'git add .', 'git commit -m "B on feat2"'], sB, 0)
  const feat2TipHash = sC.commits.find(c => c.message === 'B on feat2').hash
  const { s: sD } = run(['git switch main', 'touch m2.js', 'git add .', 'git commit -m "C on main"'], sC, 0)
  const sE = simulateCommandOffline('git switch feat2', sD, 0).nextState
  check('iter37: switch feat2 HEAD is feat2 tip', sE.commits.find(c => c.is_head)?.hash === feat2TipHash)
}

// --- Iter 36: git reset moves branch pointer to new HEAD ---------------------
{
  // After reset, git log should show (HEAD -> main) on the new HEAD commit
  const s4 = getInitialOfflineState(4)
  // reset to d4d4d4d (which has branches: [] in the seed)
  const r = simulateCommandOffline('git reset --hard d4d4d4d', s4, 4)
  check('iter36: reset adds branch to new HEAD branches', r.nextState.commits.find(c => c.hash === 'd4d4d4d').branches.includes('main'))
  const logR = simulateCommandOffline('git log --oneline', r.nextState, 4)
  check('iter36: git log after reset shows HEAD->main ref', logR.output.includes('HEAD ->'))
}
{
  // git reset HEAD~1: new HEAD should get the branch
  const s = initState()
  const { s: s3 } = run(['git add .', 'git commit -m "first"'], s, 0)
  const { s: s5 } = run(['touch b.js', 'git add .', 'git commit -m "second"'], s3, 0)
  const r = simulateCommandOffline('git reset HEAD~1', s5, 0)
  const newHead = r.nextState.commits[r.nextState.commits.length - 1]
  check('iter36: HEAD~1 reset: new HEAD has branch in branches', newHead.branches.includes('main'))
  const logR = simulateCommandOffline('git log --oneline', r.nextState, 0)
  check('iter36: git log after HEAD~1 shows HEAD->main ref', logR.output.includes('HEAD ->'))
}

// --- Iter 35: git revert uses is_head for parent lookup ----------------------
{
  // After two commits on main, revert must parent from the second commit, not first
  const s = initState()
  const { s: s3 } = run(['git add .', 'git commit -m "first"'], s, 0)
  const firstHash = s3.commits[0].hash
  const { s: s5 } = run(['touch b.js', 'git add .', 'git commit -m "second"'], s3, 0)
  const secondHash = s5.commits[s5.commits.length - 1].hash
  const r = simulateCommandOffline('git revert abc1234', s5, 0)
  check('iter35: revert succeeds after two commits', r.status === 'success')
  const revertC = r.nextState.commits[r.nextState.commits.length - 1]
  check('iter35: revert parent is second commit (HEAD), not first', revertC.parents[0] === secondHash)
  check('iter35: revert parent is NOT first commit', revertC.parents[0] !== firstHash)
}

// --- Iter 34: git cherry-pick sets correct parent ----------------------------
{
  const s = initState()
  const { s: s3 } = run(['git add .', 'git commit -m "init"'], s, 0)
  const initHash = s3.commits[0].hash
  const r = simulateCommandOffline('git cherry-pick abc1234', s3, 0)
  check('iter34: cherry-pick succeeds', r.status === 'success')
  const picked = r.nextState.commits[r.nextState.commits.length - 1]
  check('iter34: cherry-pick commit has non-empty parents', picked.parents.length > 0)
  check('iter34: cherry-pick commit parent is the HEAD commit', picked.parents[0] === initHash)
  check('iter34: cherry-pick commit is_head', picked.is_head === true)
}

// --- Iter 33: second-level checkout -b uses is_head, not branch name ---------
{
  // After checkout -b feature, root commit gets 'feature' stamped.
  // A commit on feature means root and feature-commit both have 'feature'.
  // checkout -b hotfix from feature must stamp the feature-commit, NOT root.
  const s = initState()
  const { s: s3 } = run(['git add .', 'git commit -m "init on main"'], s, 0)
  const { s: s4 } = run(['git checkout -b feature'], s3, 0)
  const { s: s5 } = run(['touch feat.js', 'git add .', 'git commit -m "work on feature"'], s4, 0)
  const featureCommit = s5.commits.find(c => c.message === 'work on feature')
  check('iter33: feature commit exists before second branch', !!featureCommit)
  // Now create a second branch from feature
  const s6 = simulateCommandOffline('git checkout -b hotfix', s5, 0).nextState
  check('iter33: checkout -b hotfix sets hotfix as branch', s6.branch === 'hotfix')
  // HEAD should be on the feature commit (not root)
  const headAfterSwitch = s6.commits.find(c => c.is_head)
  check('iter33: checkout -b hotfix HEAD is feature commit, not root', headAfterSwitch?.hash === featureCommit?.hash)
  // Commit on hotfix must have feature commit as parent
  const s7 = run(['touch hot.js', 'git add .', 'git commit -m "hotfix work"'], s6, 0).s
  const hotfixCommit = s7.commits.find(c => c.message === 'hotfix work')
  check('iter33: hotfix commit has non-empty parents', hotfixCommit?.parents.length > 0)
  check('iter33: hotfix commit parent is feature commit', hotfixCommit?.parents[0] === featureCommit?.hash)
}
{
  // Same for switch -c
  const s = initState()
  const { s: s3 } = run(['git add .', 'git commit -m "init"'], s, 0)
  const { s: s4 } = run(['git checkout -b feature'], s3, 0)
  const { s: s5 } = run(['touch f.js', 'git add .', 'git commit -m "feature work"'], s4, 0)
  const featureCommit = s5.commits.find(c => c.message === 'feature work')
  const s6 = simulateCommandOffline('git switch -c hotfix2', s5, 0).nextState
  const { s: s7 } = run(['touch h.js', 'git add .', 'git commit -m "hotfix2 work"'], s6, 0)
  const hotfixCommit = s7.commits.find(c => c.message === 'hotfix2 work')
  check('iter33: switch -c hotfix2 commit has non-empty parents', hotfixCommit?.parents.length > 0)
  check('iter33: switch -c hotfix2 commit parent is feature commit', hotfixCommit?.parents[0] === featureCommit?.hash)
}

// --- iter61: branch ref only marks the tip, not every commit on the branch --
{
  // Two commits on main: the ref label "main" must live only on the new tip.
  const s = initState()
  const { s: s2 } = run(['git add .', 'git commit -m "init"', 'git add .', 'git commit -m "second"'], s, 0)
  const tip = s2.commits[s2.commits.length - 1]
  const root = s2.commits[0]
  check('iter61: tip commit carries the main label', tip.branches.includes('main'))
  check('iter61: tip commit is HEAD', tip.is_head === true)
  check('iter61: old commit drops the main label', !root.branches.includes('main'))
  const log = simulateCommandOffline('git log --oneline', s2, 0)
  check('iter61: git log shows (HEAD -> main) on tip only', (log.output.match(/main/g) || []).length === 1)
}
{
  // After branching off and committing on the feature branch, the shared
  // commit keeps main but loses the feature label (which moves to the new tip).
  const s = initState()
  const { s: s3 } = run(['git add .', 'git commit -m "init"'], s, 0)
  const { s: s5 } = run(['git checkout -b feature/x', 'touch f.js', 'git add .', 'git commit -m "feat"'], s3, 0)
  const shared = s5.commits.find(c => c.message === 'init')
  const tip = s5.commits.find(c => c.message === 'feat')
  check('iter61: shared commit keeps main after branch commit', shared.branches.includes('main'))
  check('iter61: shared commit drops feature/x label', !shared.branches.includes('feature/x'))
  check('iter61: feature tip carries only feature/x', tip.branches.includes('feature/x') && !tip.branches.includes('main'))
}
{
  // revert moves the branch ref forward too — only the revert commit shows main.
  const s = initState()
  const { s: s2 } = run(['git add .', 'git commit -m "first"', 'git add .', 'git commit -m "second"'], s, 0)
  const r = simulateCommandOffline('git revert abc1234', s2, 0)
  const mainLabels = r.nextState.commits.filter(c => c.branches.includes('main'))
  check('iter61: after revert only one commit carries main', mainLabels.length === 1)
  check('iter61: revert commit is the one carrying main', mainLabels[0].is_head === true)
}
{
  // cherry-pick likewise forwards the ref.
  const s = initState()
  const { s: s2 } = run(['git add .', 'git commit -m "first"', 'git add .', 'git commit -m "second"'], s, 0)
  const r = simulateCommandOffline('git cherry-pick abc1234', s2, 0)
  const mainLabels = r.nextState.commits.filter(c => c.branches.includes('main'))
  check('iter61: after cherry-pick only one commit carries main', mainLabels.length === 1)
}

// --- iter62: git merge integrates source branch into history ----------------
const lesson2State = () => ({
  initialized: true, branch: 'main', files: ['index.js'], fileContents: { 'index.js': '//' },
  staged: [], commits: [
    { hash: 'c1c1c1c', full_hash: 'c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1', message: 'Init setup', branches: ['main'], parents: [], is_head: true }
  ], stashes: [], branches: ['main'], committed_files: ['index.js'], lessonId: 2,
})
{
  // Fast-forward: merge a feature branch whose tip descends from main's tip.
  const { s } = run(['git checkout -b feature/auth', 'touch auth.js', 'git add .', 'git commit -m "add auth"', 'git checkout main', 'git merge feature/auth'], lesson2State(), 2)
  const log = simulateCommandOffline('git log --oneline', s, 2).output
  check('iter62: ff merge brings feature commit into main log', log.includes('add auth'))
  check('iter62: ff merge keeps init commit in main log', log.includes('Init setup'))
  check('iter62: ff merge sets merged_offline for verification', s.merged_offline === true)
  check('iter62: lesson 2 verifies after merge', checkOfflineProgress(s, 2).verified === true)
  const head = s.commits.find(c => c.is_head)
  check('iter62: ff merge HEAD is the feature tip', head.message === 'add auth')
  check('iter62: ff merge main label rides the new tip', head.branches.includes('main'))
}
{
  // Divergent: both branches have a unique commit → a merge commit is created.
  const base = lesson2State()
  const { s: sBranch } = run(['git checkout -b feature/auth', 'touch a.js', 'git add .', 'git commit -m "feat work"'], base, 2)
  // add a divergent commit on main
  const { s: sMain } = run(['git checkout main', 'touch m.js', 'git add .', 'git commit -m "main work"'], sBranch, 2)
  const r = simulateCommandOffline('git merge feature/auth', sMain, 2)
  const mergeCommit = r.nextState.commits.find(c => c.parents.length > 1)
  check('iter62: divergent merge creates a merge commit', !!mergeCommit)
  check('iter62: merge commit has two parents', mergeCommit && mergeCommit.parents.length === 2)
  const log = simulateCommandOffline('git log --oneline', r.nextState, 2).output
  check('iter62: divergent merge log shows both branch tips', log.includes('feat work') && log.includes('main work'))
}
{
  // Already-merged source → "Already up to date." (no new commit).
  const { s } = run(['git checkout -b feature/auth', 'touch a.js', 'git add .', 'git commit -m "feat"', 'git checkout main', 'git merge feature/auth'], lesson2State(), 2)
  const before = s.commits.length
  const r = simulateCommandOffline('git merge feature/auth', s, 2)
  check('iter62: re-merging already-merged branch is up to date', r.output.includes('Already up to date'))
  check('iter62: re-merge does not add a commit', r.nextState.commits.length === before)
}

// --- iter63: git push advances the origin/<branch> remote-tracking ref ------
{
  const { s } = run(['git add .', 'git commit -m "init"'], initState(), 1)
  const r = simulateCommandOffline('git push', s, 1)
  const head = r.nextState.commits.find(c => c.is_head)
  check('iter63: push stamps origin/main on the tip', head.branches.includes('origin/main'))
  check('iter63: push output is not the misleading up-to-date line', !r.output.includes('Everything up-to-date'))
  check('iter63: push sets pushed_offline for verification', r.nextState.pushed_offline === true)
  const log = simulateCommandOffline('git log --oneline', r.nextState, 1).output
  check('iter63: git log shows origin/main after push', log.includes('origin/main'))
  // lesson 1 still verifies through the full flow
  const full = run(['git init', 'git add .', 'git commit -m "init"', 'git push'], lesson0State(), 1).s
  full.lessonId = 1
  check('iter63: lesson 1 verifies after push', checkOfflineProgress(full, 1).verified === true)
  // pushing again with nothing new is up to date
  const r2 = simulateCommandOffline('git push', r.nextState, 1)
  check('iter63: second push with no new commits is up to date', r2.output.includes('Everything up-to-date'))
}

// --- iter64: git reset resolves target via parent chain, not array position -
{
  // Branched history where insertion order != HEAD's parent chain:
  //   main: A <- B (HEAD);  feature: A <- F  (F inserted last in the array)
  const branched = () => ({
    initialized: true, branch: 'main', files: [], fileContents: {}, staged: [], stashes: [],
    branches: ['main', 'feature'], committed_files: [], lessonId: 0,
    commits: [
      { hash: 'aaa', full_hash: 'aaa' + '0'.repeat(37), message: 'A', branches: [], parents: [], is_head: false },
      { hash: 'bbb', full_hash: 'bbb' + '0'.repeat(37), message: 'B', branches: ['main'], parents: ['aaa'], is_head: true },
      { hash: 'fff', full_hash: 'fff' + '0'.repeat(37), message: 'F', branches: ['feature'], parents: ['aaa'], is_head: false },
    ],
  })
  const r = simulateCommandOffline('git reset --hard HEAD~1', branched(), 0)
  const head = r.nextState.commits.find(c => c.is_head)
  check('iter64: reset HEAD~1 moves HEAD to the parent (A), not stays on B', head?.hash === 'aaa')
  check('iter64: reset HEAD~1 keeps sibling branch commit F', r.nextState.commits.some(c => c.hash === 'fff'))
  check('iter64: reset HEAD~1 drops the old HEAD commit B', !r.nextState.commits.some(c => c.hash === 'bbb'))
  check('iter64: reset moves main ref onto the new HEAD', head?.branches.includes('main'))
  check('iter64: reset leaves feature ref intact', r.nextState.commits.find(c => c.hash === 'fff').branches.includes('feature'))
  // hash-based reset is likewise parent-chain correct
  const r2 = simulateCommandOffline('git reset --hard aaa', branched(), 0)
  check('iter64: reset <hash> keeps sibling F', r2.nextState.commits.some(c => c.hash === 'fff'))
  check('iter64: reset <hash> drops B', !r2.nextState.commits.some(c => c.hash === 'bbb'))
  // out-of-range HEAD~N errors instead of silently emptying history
  const r3 = simulateCommandOffline('git reset HEAD~9', branched(), 0)
  check('iter64: reset HEAD~9 (beyond root) errors', r3.status === 'error')
}

// --- iter65: resolving a conflicted merge produces a two-parent merge commit -
{
  let s = getInitialOfflineState(3)
  const featureTip = s.commits.find(c => c.branches.includes('feature/ui')).hash
  const mainTip = s.commits.find(c => c.is_head).hash
  s = simulateCommandOffline('git merge feature/ui', s, 3).nextState
  check('iter65: conflict merge records merge_source', s.merge_source === 'feature/ui')
  s = simulateCommandOffline('git add config.js', s, 3).nextState
  // After staging the resolution, the stage_resolved subtask is complete.
  const staged = checkOfflineProgress(s, 3).subtasks.find(t => t.id === 'stage_resolved')
  check('iter65: stage_resolved subtask complete after add', staged.completed === true)
  const r = simulateCommandOffline('git commit -m "Merge feature/ui"', s, 3)
  const head = r.nextState.commits.find(c => c.is_head)
  check('iter65: resolved-conflict commit has two parents', head.parents.length === 2)
  check('iter65: merge commit parents are main tip and feature tip', head.parents.includes(mainTip) && head.parents.includes(featureTip))
  check('iter65: merge_source cleared after commit', !r.nextState.merge_source)
  // After committing, the commit_merge subtask is complete (commits >= 4).
  const committed = checkOfflineProgress(r.nextState, 3).subtasks.find(t => t.id === 'commit_merge')
  check('iter65: commit_merge subtask complete after commit', committed.completed === true)
  // A normal (non-merge) commit remains single-parent
  const r2 = simulateCommandOffline('git commit -m "follow up"', simulateCommandOffline('touch x.js', simulateCommandOffline('git add .', r.nextState, 3).nextState, 3).nextState, 3)
  const followUp = r2.nextState.commits.find(c => c.message === 'follow up')
  check('iter65: subsequent normal commit is single-parent', !followUp || followUp.parents.length === 1)
  // Aborting the merge clears merge_source so a later commit is not a merge
  let sa = getInitialOfflineState(3)
  sa = simulateCommandOffline('git merge feature/ui', sa, 3).nextState
  sa = simulateCommandOffline('git merge --abort', sa, 3).nextState
  check('iter65: merge --abort clears merge_source', !sa.merge_source)
}

// --- report ----------------------------------------------------------------
if (failures.length) {
  console.error(`offline-git tests: ${passed} passed, ${failures.length} FAILED`)
  failures.forEach(f => console.error('  ✗ ' + f))
  process.exit(1)
}
console.log(`offline-git regression tests passed (${passed} assertions)`)
