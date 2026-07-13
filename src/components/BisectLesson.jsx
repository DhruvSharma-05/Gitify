import React, { useState, useEffect, useRef } from 'react'
import { Target, Check, AlertTriangle, Search, RotateCcw, Zap } from 'lucide-react'
import './HistoryLesson.css'
import PretextCanvas from './PretextCanvas.jsx'
import { useToast } from './Toast.jsx'

// The 7 commits seeded by the backend for lesson 9.
// Commit at index 3 ("Refactor cart total") is the culprit.
const COMMITS = [
  { hash: 'a1b2c3d', message: 'Init cart module',    author: 'Alex', bad: false },
  { hash: 'b2c3d4e', message: 'Add cart UI',          author: 'Sam',  bad: false },
  { hash: 'c3d4e5f', message: 'Add discount engine',  author: 'Mira', bad: false },
  { hash: 'd4e5f6g', message: 'Refactor cart total',  author: 'Sam',  bad: true  },
  { hash: 'e5f6g7h', message: 'Add request logger',   author: 'Alex', bad: false },
  { hash: 'f6g7h8i', message: 'Polish cart UI',        author: 'Mira', bad: false },
  { hash: 'g7h8i9j', message: 'Update README',         author: 'Alex', bad: false },
]

// Binary-search steps the visualiser walks through.
// Repo: commits 0–6, bad=index 3 ("Refactor cart total"), known-good=index 0.
// Git bisects [good+1 .. bad] = [1..6], midpoint = index 3 → bad → narrows [1..2],
// midpoint = index 1 → good → narrows [2..2], midpoint = index 2 → good → culprit = index 3.
const BISECT_STEPS = [
  {
    lo: 0, hi: 6, testing: 3,
    title: 'Step 1 of 3',
    label: 'Git checks out the middle commit of the 7 and asks: is it good or bad?',
    plain: 'Whatever the answer, half the commits get ruled out in one test.',
  },
  {
    lo: 0, hi: 2, testing: 1,
    title: 'Step 2 of 3',
    label: 'The middle commit was bad — so the bug is at or before it. Git ignores the newer half and tests the middle of what remains.',
    plain: '4 commits eliminated. Only the older half is left to search.',
  },
  {
    lo: 2, hi: 3, testing: 2,
    title: 'Step 3 of 3',
    label: 'That commit was good — so the bug came after it. One suspect remains.',
    plain: 'Down to the last candidate. One more test pins it down.',
  },
  {
    lo: 3, hi: 3, testing: 3,
    title: 'Found it',
    label: 'The first bad commit is "Refactor cart total" — found in 3 tests, not 7.',
    plain: 'Git prints the culprit’s hash and message. Bug located.',
  },
]

// How each commit reads at a given step. We only claim what bisect actually
// knows: the culprit (once reached) is the first bad commit, the tested commit
// is "testing", commits still inside [lo..hi] are the live search window, and
// everything outside it has been "eliminated" (ruled out this round).
function nodeVerdict(idx, step, isCulpritStep) {
  if (isCulpritStep && idx === step.testing) return 'bad'
  if (idx === step.testing) return 'testing'
  if (idx >= step.lo && idx <= step.hi) return 'window'
  return 'eliminated'
}

export default function BisectLesson({ onSuccess, setTerminalSyncListener } = {}) {
  const toast = useToast()

  // Interactive visualiser state
  const [bisectStep, setBisectStep] = useState(0)
  const [revealed, setRevealed] = useState(false)

  // Objective tracking (mirrors backend subtasks)
  const [started, setStarted]       = useState(false)
  const [markedBad, setMarkedBad]   = useState(false)
  const [markedGood, setMarkedGood] = useState(false)
  const [resetDone, setResetDone]   = useState(false)

  const firedRef = useRef(false)
  const allDone = started && markedBad && markedGood && resetDone

  // Sync objective state from live terminal subtasks pushed by App.jsx.
  // setTerminalSyncListener is a useState setter, so the listener must be stored
  // via the updater form `() => fn` — otherwise React runs it immediately.
  useEffect(() => {
    if (!setTerminalSyncListener) return
    setTerminalSyncListener(() => (syncState) => {
      if (!syncState || !syncState.subtasks) return
      syncState.subtasks.forEach((t) => {
        if (t.id === 'bisect_start' && t.completed) setStarted(true)
        if (t.id === 'bisect_bad'   && t.completed) setMarkedBad(true)
        if (t.id === 'bisect_good'  && t.completed) setMarkedGood(true)
        if (t.id === 'bisect_reset' && t.completed) setResetDone(true)
      })
    })
    return () => { if (setTerminalSyncListener) setTerminalSyncListener(null) }
  }, [setTerminalSyncListener])

  useEffect(() => {
    if (allDone && !firedRef.current) {
      firedRef.current = true
      toast.success('You binary-searched the history and found the culprit commit.', { title: 'Lesson 9 complete' })
      if (onSuccess) onSuccess()
    }
  }, [allDone, onSuccess, toast])

  const objectives = [
    { id: 'bisect_start', label: "Start a bisect session ('git bisect start')",          done: started },
    { id: 'bisect_bad',   label: "Mark HEAD as bad ('git bisect bad')",                  done: markedBad },
    { id: 'bisect_good',  label: "Mark a known-good commit ('git bisect good <hash>')",  done: markedGood },
    { id: 'bisect_reset', label: "Reset bisect and return to main ('git bisect reset')", done: resetDone },
  ]

  const step = BISECT_STEPS[Math.min(bisectStep, BISECT_STEPS.length - 1)]
  const isCulpritStep = bisectStep === BISECT_STEPS.length - 1

  return (
    <div className="history-lesson">
      <header className="lesson-header">
        <span className="lesson-kicker">Lesson 9</span>
        <h1>Git Bisect — Debug by Binary Search</h1>
        <p>When a bug appears somewhere in recent history, don't check every commit. Let Git do a binary search.</p>
      </header>

      {/* Scenario + live objectives */}
      <div className="history-mission">
        <div className="mission-text">
          <div className="mission-tag"><Target size={15} strokeWidth={2.2} /> Your mission</div>
          <p>
            The <code>cart.js</code> total is wrong in production — it ignores quantities.
            Someone committed the bug in the last 7 commits but nobody knows which one.
            Use <code>git bisect</code> to binary-search the history, test each checkpoint,
            and identify the first bad commit.
          </p>
        </div>
        <ul className="mission-objectives">
          {objectives.map((o) => (
            <li key={o.id} className={`objective ${o.done ? 'done' : ''}`}>
              <span className="objective-check">{o.done ? <Check size={13} strokeWidth={3} /> : null}</span>
              {o.label}
            </li>
          ))}
        </ul>
      </div>

      <PretextCanvas scene="historyLog" height={160} />

      <main className="history-layout">

        {/* Stage 1 — How bisect works: interactive range visualiser */}
        <section className="history-panel timeline-panel">
          <div className="panel-heading">
            <span className="stage-num">1</span>
            <h2>How Bisect Works</h2>
          </div>

          <p className="stage-instruction">
            <Search size={14} strokeWidth={2} /> Step through the binary search. At each step Git checks out the
            midpoint commit — you test it and report <code>good</code> or <code>bad</code>.
          </p>

          {/* Legend so the colours are self-explanatory for a first-timer */}
          <div className="bisect-legend">
            <span><i className="dot window" /> still to search</span>
            <span><i className="dot testing" /> testing now</span>
            <span><i className="dot eliminated" /> ruled out</span>
            <span><i className="dot bad" /> first bad commit</span>
          </div>

          {/* Oldest → newest commit timeline; each node shows its bisect verdict */}
          <div className="timeline-scroller">
            <div className="history-track bisect-track">
              {COMMITS.map((c, idx) => {
                const verdict = nodeVerdict(idx, step, isCulpritStep)
                return (
                  <div
                    key={c.hash}
                    className={`history-node bisect-node ${verdict}`}
                  >
                    {verdict === 'testing' && <span className="head-pointer">TESTING</span>}
                    {verdict === 'bad' && <span className="head-pointer bad">FIRST BAD</span>}
                    <span className="node-dot"></span>
                    <strong>{c.hash}</strong>
                    <em style={{ fontSize: '0.78rem' }}>{c.message}</em>
                    <small>{c.author}</small>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Plain-language explanation of the current step */}
          <div className="bisect-step-note">
            <span className="bisect-step-title">{step.title}</span>
            <p>{step.label}</p>
            <p className="bisect-step-plain">{step.plain}</p>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              className="history-action ghost"
              onClick={() => { setBisectStep(0); setRevealed(false) }}
              disabled={bisectStep === 0}
            >
              <RotateCcw size={13} strokeWidth={2} /> Start over
            </button>
            <button
              className="history-action"
              onClick={() => setBisectStep((s) => Math.min(s + 1, BISECT_STEPS.length - 1))}
              disabled={isCulpritStep}
            >
              {isCulpritStep ? 'Done' : 'Next step →'}
            </button>
          </div>

          <div className="git-cmd-line" style={{ marginTop: '10px' }}>
            <span className="label">at this step</span>
            <span className="cmd-prompt">$</span>
            <code>
              {isCulpritStep
                ? 'git bisect reset'
                : bisectStep === 0
                  ? 'git bisect start  →  git bisect bad  →  git bisect good a1b2c3d'
                  : bisectStep === 1
                    ? 'git bisect bad   (commit 3 fails the test)'
                    : 'git bisect good  (commit 1 passes the test)'}
            </code>
          </div>

          {isCulpritStep && !revealed && (
            <button
              className="history-action"
              style={{ marginTop: '10px' }}
              onClick={() => setRevealed(true)}
            >
              <Zap size={14} strokeWidth={2} /> Reveal the bug
            </button>
          )}

          {revealed && (
            <div className="diff-panel" style={{ marginTop: '12px' }}>
              <div className="diff-title">
                <strong>git show d4e5f6g — Refactor cart total</strong>
                <span>first bad commit</span>
              </div>
              <pre>
                <code className="removed">-  return items.reduce((s, i) =&gt; s + i.price * i.qty, 0);{'\n'}</code>
                <code className="added">+  return items.reduce((s, i) =&gt; s + i.price, 0);{'\n'}</code>
              </pre>
              <div className="insight-callout" style={{ marginTop: '8px' }}>
                <strong>The bug:</strong> the quantity multiplier (<code>* i.qty</code>) was silently dropped.
                Cart totals looked plausible for single-item orders — the bug only surfaced when qty &gt; 1.
              </div>
            </div>
          )}
        </section>

        {/* Stage 2 — The three bisect commands */}
        <section className="history-panel checkout-panel">
          <div className="panel-heading">
            <span className="stage-num">2</span>
            <h2>The Three Commands</h2>
          </div>

          <p className="stage-instruction">
            You only ever need these three commands (plus your own test). Run them in order — Git handles the checkouts.
          </p>

          <div className="bisect-cmd-list">
            {[
              {
                cmd: 'git bisect start',
                accent: '#38bdf8',
                when: 'First',
                desc: 'Opens a bisect session so Git can start narrowing things down.',
              },
              {
                cmd: 'git bisect bad',
                accent: '#f87171',
                when: 'Then',
                desc: 'Tell Git the current commit is broken. You run this on the latest commit first, then again on any midpoint that fails your test.',
              },
              {
                cmd: 'git bisect good <hash>',
                accent: '#10b981',
                when: 'Then',
                desc: 'Point to a commit you know worked. Git instantly checks out the midpoint between good and bad for you to test next.',
              },
              {
                cmd: 'git bisect reset',
                accent: '#a78bfa',
                when: 'Last',
                desc: 'Ends the session and puts you back on your branch tip. Always run this when you’re done.',
              },
            ].map(({ cmd, accent, when, desc }) => (
              <div key={cmd} className="bisect-cmd" style={{ '--cmd-accent': accent }}>
                <span className="bisect-cmd-when">{when}</span>
                <code>{cmd}</code>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stage 3 — Why it's fast */}
        <section className="history-panel safety-panel">
          <div className="panel-heading">
            <span className="stage-num">3</span>
            <h2>Why Binary Search?</h2>
          </div>

          <p className="stage-instruction">
            Checking commits one by one takes as many tests as there are commits. Bisect halves the range every
            test, so the number of tests barely grows even as the history gets huge:
          </p>

          <div className="bisect-scale">
            {[
              { commits: 7,    steps: 3 },
              { commits: 50,   steps: 6 },
              { commits: 500,  steps: 9 },
              { commits: 1000, steps: 10 },
            ].map(({ commits, steps }) => (
              <div key={commits} className="bisect-scale-row">
                <span className="bisect-scale-label">{commits} commits</span>
                <div className="bisect-scale-bar">
                  <div className="bisect-scale-fill" style={{ width: `${(steps / 10) * 100}%` }} />
                </div>
                <span className="bisect-scale-steps">{steps} tests</span>
              </div>
            ))}
          </div>

          <div className="insight-callout" style={{ marginTop: '16px' }}>
            <strong>Key insight:</strong> bisect runs in O(log n) steps. On a repo with thousands of commits
            between a known-good release and today, you can pinpoint the regression in under 15 tests
            instead of hundreds.
          </div>

          {allDone && (
            <div className="safe-badge active" style={{ marginTop: '12px' }}>
              <Check size={14} strokeWidth={3} style={{ display: 'inline', marginRight: '6px' }} />
              Lesson 9 complete — you found the culprit using binary search.
            </div>
          )}

          {!allDone && (
            <div className="detached-status warn" style={{ marginTop: '12px' }}>
              <AlertTriangle size={14} strokeWidth={2.2} />
              Complete the terminal exercise on the right to finish this lesson.
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
