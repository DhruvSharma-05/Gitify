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
  const { s } = run(['gh repo fork x', 'git clone y'], forkState(), 8) // branch still main
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

// --- report ----------------------------------------------------------------
if (failures.length) {
  console.error(`offline-git tests: ${passed} passed, ${failures.length} FAILED`)
  failures.forEach(f => console.error('  ✗ ' + f))
  process.exit(1)
}
console.log(`offline-git regression tests passed (${passed} assertions)`)
