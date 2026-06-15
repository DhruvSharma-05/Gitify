// Unit tests for the in-memory offline git/GitHub simulator (src/offlineGit.js).
// This is the only engine behind Lesson 8 and the fallback for every other lesson,
// yet it runs no real git — so completability is easy to break silently. Fast, no browser.
import assert from 'node:assert'
import { getInitialOfflineState } from '../src/api.js'
import { simulateCommandOffline, checkOfflineProgress } from '../src/offlineGit.js'

function drive(lessonId, commands, startState) {
  let state = startState ?? getInitialOfflineState(lessonId)
  let last
  for (const cmd of commands) {
    last = simulateCommandOffline(cmd, state, lessonId)
    state = last.nextState
  }
  return { state, last }
}

// Lesson 8: the full fork → clone → branch+commit → push → PR → merge flow completes.
{
  const { state } = drive(8, [
    'gh repo fork octo/awesome-lib',
    'git clone https://github.com/you/awesome-lib',
    'git checkout -b fix-bug',
    'git add .',
    'git commit -m "fix the bug"',
    'git push origin fix-bug',
    'gh pr create',
    'gh pr merge',
  ])
  const { verified, subtasks } = checkOfflineProgress(state, 8)
  assert.ok(verified, `Lesson 8 should complete; got ${JSON.stringify(subtasks)}`)
}

// Lesson 8: steps are gated in order.
{
  const r = simulateCommandOffline('git clone https://github.com/you/awesome-lib', getInitialOfflineState(8), 8)
  assert.strictEqual(r.status, 'error', 'cloning before forking should fail')

  const { state } = drive(8, ['gh repo fork x', 'git clone y'])
  const onMain = simulateCommandOffline('git commit -m x', state, 8)
  assert.strictEqual(onMain.status, 'error', 'committing on main (no feature branch) should be refused')
}

// Lesson 1: offline git flow init → add → commit → push completes.
{
  const { state } = drive(1, ['git init', 'git add .', 'git commit -m "first"', 'git push origin main'])
  const { verified, subtasks } = checkOfflineProgress(state, 1)
  assert.ok(verified, `Lesson 1 offline should complete; got ${JSON.stringify(subtasks)}`)
}

// Offline honesty: advanced shell syntax is refused, not silently faked.
{
  const r = simulateCommandOffline('git log | grep x', getInitialOfflineState(2), 2)
  assert.strictEqual(r.status, 'error')
  assert.ok(/Offline mode/i.test(r.output), 'should explain the offline limitation')
}

console.log('offline engine test passed')
