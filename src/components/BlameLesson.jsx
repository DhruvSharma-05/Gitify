import React, { useState, useEffect, useRef } from 'react'
import { Target, Check, AlertTriangle, Search, FileSearch, GitCommit } from 'lucide-react'
import PretextCanvas from './PretextCanvas.jsx'
import { useToast } from './Toast.jsx'

// The fixed history seeded for lesson 10 (oldest → newest). Mirrors BLAME_COMMITS
// in offlineGit.js. The discount commit (c33d4e5) introduced the suspect line.
const COMMITS = [
  { hash: 'a11b2c3', author: 'Alex', date: '2024-01-05', message: 'Create pricing module' },
  { hash: 'b22c3d4', author: 'Sam',  date: '2024-02-11', message: 'Add tax calculation' },
  { hash: 'c33d4e5', author: 'Mira', date: '2024-03-02', message: 'Add discount support' },
  { hash: 'd44e5f6', author: 'Alex', date: '2024-03-19', message: 'Round totals to cents' },
  { hash: 'e55f6g7', author: 'Sam',  date: '2024-04-08', message: 'Fix currency formatting' },
]

// pricing.js line-by-line authorship (mirrors BLAME_LINES in offlineGit.js).
const LINES = [
  { hash: 'a11b2c3', code: 'export function orderTotal(items, pct) {' },
  { hash: 'a11b2c3', code: '  const base = items.reduce((s, i) => s + i.price * i.qty, 0);' },
  { hash: 'b22c3d4', code: '  const tax = applyTax(base);' },
  { hash: 'c33d4e5', code: '  const off = applyDiscount(base, pct);' },
  { hash: 'd44e5f6', code: '  const total = Math.round((base + tax - off) * 100) / 100;' },
  { hash: 'e55f6g7', code: "  return total.toLocaleString('en-US', { style: 'currency', currency: 'USD' });" },
  { hash: 'a11b2c3', code: '}' },
]

const AUTHOR_COLOR = { Alex: '#38bdf8', Sam: '#fbbf24', Mira: '#a78bfa' }

export default function BlameLesson({ onSuccess, setTerminalSyncListener } = {}) {
  const toast = useToast()

  // Objective tracking (mirrors the offline subtasks).
  const [blamed, setBlamed] = useState(false)
  const [searched, setSearched] = useState(false)
  const [inspected, setInspected] = useState(false)

  const firedRef = useRef(false)
  const allDone = blamed && searched && inspected

  // Sync objective state from live terminal subtasks pushed by App.jsx.
  // setTerminalSyncListener is a useState setter, so the listener must be stored
  // via the updater form `() => fn` — otherwise React runs it immediately.
  useEffect(() => {
    if (!setTerminalSyncListener) return
    setTerminalSyncListener(() => (syncState) => {
      if (!syncState || !syncState.subtasks) return
      syncState.subtasks.forEach((t) => {
        if (t.id === 'blame_file' && t.completed) setBlamed(true)
        if (t.id === 'pickaxe_search' && t.completed) setSearched(true)
        if (t.id === 'inspect_commit' && t.completed) setInspected(true)
      })
    })
    return () => { if (setTerminalSyncListener) setTerminalSyncListener(null) }
  }, [setTerminalSyncListener])

  useEffect(() => {
    if (allDone && !firedRef.current) {
      firedRef.current = true
      toast.success('You traced the line to its author, its commit, and its diff.', { title: 'Lesson 10 complete' })
      if (onSuccess) onSuccess()
    }
  }, [allDone, onSuccess, toast])

  const objectives = [
    { id: 'blame_file', label: "Annotate each line ('git blame pricing.js')", done: blamed },
    { id: 'pickaxe_search', label: "Find when a function appeared ('git log -S \"applyDiscount\"')", done: searched },
    { id: 'inspect_commit', label: "Inspect the introducing commit ('git show c33d4e5')", done: inspected },
  ]

  const commitMsg = (h) => (COMMITS.find(c => c.hash === h) || {}).message

  return (
    <div className="history-lesson">
      <header className="lesson-header">
        <span className="lesson-kicker">Lesson 10</span>
        <h1>Blame & History Archaeology</h1>
        <p>A line of code is suspicious. Find out who wrote it, when it appeared, and why — without guessing.</p>
      </header>

      {/* Scenario + live objectives */}
      <div className="history-mission">
        <div className="mission-text">
          <div className="mission-tag"><Target size={15} strokeWidth={2.2} /> Your mission</div>
          <p>
            Order totals in <code>pricing.js</code> look off. The discount line is the prime suspect.
            Use <code>git blame</code> to see who last touched each line, the <code>git log -S</code> pickaxe
            to find the commit that first introduced <code>applyDiscount</code>, then <code>git show</code> to
            read that commit's diff.
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

        {/* Stage 1 — git blame: line-by-line authorship */}
        <section className="history-panel timeline-panel">
          <div className="panel-heading">
            <span className="stage-num">1</span>
            <h2>git blame — Who Wrote This Line?</h2>
          </div>

          <p className="stage-instruction">
            <FileSearch size={14} strokeWidth={2} /> Every line carries the last commit that changed it.
            Run <code>git blame pricing.js</code> in the terminal to reveal the annotations.
          </p>

          <div className="diff-panel" style={{ marginTop: '4px' }}>
            <div className="diff-title">
              <strong>pricing.js</strong>
              <span>{blamed ? 'blamed' : 'run git blame to annotate'}</span>
            </div>
            <pre style={{ overflowX: 'auto' }}>
              {LINES.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'baseline', opacity: blamed ? 1 : 0.55 }}>
                  {blamed && (
                    <code style={{ color: AUTHOR_COLOR[(COMMITS.find(c => c.hash === l.hash) || {}).author] || '#8b949e', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                      {l.hash} {(COMMITS.find(c => c.hash === l.hash) || {}).author}
                    </code>
                  )}
                  <code style={{ color: '#e2e8f0' }}>{String(i + 1).padStart(2, ' ')} {l.code}</code>
                </div>
              ))}
            </pre>
          </div>
        </section>

        {/* Stage 2 — the pickaxe + show */}
        <section className="history-panel checkout-panel">
          <div className="panel-heading">
            <span className="stage-num">2</span>
            <h2>The Pickaxe — When Did It Appear?</h2>
          </div>

          <p className="stage-instruction">
            <Search size={14} strokeWidth={2} /> <code>git log -S "string"</code> finds the commits that changed how
            many times a string appears — perfect for "when was this function introduced?"
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { cmd: 'git blame pricing.js', color: '#38bdf8', desc: 'Annotate every line with the commit and author that last changed it.' },
              { cmd: 'git log -S "applyDiscount"', color: '#fbbf24', desc: 'Pickaxe search: list commits where the count of "applyDiscount" changed — i.e. where it was added.' },
              { cmd: 'git show c33d4e5', color: '#a78bfa', desc: 'Open the introducing commit to read its message and diff.' },
            ].map(({ cmd, color, desc }) => (
              <div key={cmd} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '12px 14px' }}>
                <code style={{ color, fontWeight: '700', fontSize: '0.85rem' }}>{cmd}</code>
                <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>{desc}</p>
              </div>
            ))}
          </div>

          {searched && (
            <div className="insight-callout" style={{ marginTop: '14px' }}>
              <strong>Pickaxe hit:</strong> <code>applyDiscount</code> first appears in commit
              <code> c33d4e5</code> — "{commitMsg('c33d4e5')}" by Mira.
            </div>
          )}
        </section>

        {/* Stage 3 — the timeline */}
        <section className="history-panel safety-panel">
          <div className="panel-heading">
            <span className="stage-num">3</span>
            <h2>The Trail of Commits</h2>
          </div>

          <p className="stage-instruction">
            <GitCommit size={14} strokeWidth={2} /> Five commits shaped <code>pricing.js</code>. The suspect line came
            from the discount commit.
          </p>

          <div className="timeline-scroller">
            <div className="history-track" style={{ flexDirection: 'row', gap: '8px', flexWrap: 'wrap' }}>
              {COMMITS.map((c) => {
                const isCulprit = c.hash === 'c33d4e5'
                return (
                  <div
                    key={c.hash}
                    className={`history-node${isCulprit && inspected ? ' selected' : ''}`}
                    style={{ minWidth: '130px', opacity: isCulprit || inspected ? 1 : 0.6 }}
                  >
                    {isCulprit && inspected && <span className="head-pointer">INSPECTED</span>}
                    <span className="node-dot"></span>
                    <strong>{c.hash}</strong>
                    <em style={{ fontSize: '0.78rem' }}>{c.message}</em>
                    <small style={{ color: AUTHOR_COLOR[c.author] || '#8b949e' }}>{c.author} · {c.date}</small>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="insight-callout" style={{ marginTop: '16px' }}>
            <strong>Key insight:</strong> blame answers <em>who &amp; when</em> for a line you can see; the
            <code> -S</code> pickaxe answers <em>when &amp; where</em> for a string that may have moved or vanished.
            Together they turn "who broke this?" into a two-minute investigation.
          </div>

          {allDone ? (
            <div className="safe-badge active" style={{ marginTop: '12px' }}>
              <Check size={14} strokeWidth={3} style={{ display: 'inline', marginRight: '6px' }} />
              Lesson 10 complete — you traced the line to its source.
            </div>
          ) : (
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
