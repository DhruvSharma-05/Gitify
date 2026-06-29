import React, { useState, useEffect, useRef } from 'react'
import { Target, Check, AlertTriangle, Search, FileSearch, GitCommit } from 'lucide-react'
import { useToast } from './Toast.jsx'
import './BlameLesson.css'

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
  const authorOf = (h) => (COMMITS.find(c => c.hash === h) || {}).author

  const commands = [
    { cmd: 'git blame pricing.js', accent: '#38bdf8', desc: 'Annotate every line with the commit and author that last changed it.' },
    { cmd: 'git log -S "applyDiscount"', accent: '#fbbf24', desc: 'Pickaxe search: list commits where the count of "applyDiscount" changed — i.e. where it was added.' },
    { cmd: 'git show c33d4e5', accent: '#a78bfa', desc: 'Open the introducing commit to read its message and diff.' },
  ]

  return (
    <div className="blame-lesson">
      <header className="lesson-header">
        <span className="lesson-kicker">Lesson 10</span>
        <h1>Blame & History Archaeology</h1>
        <p>A line of code is suspicious. Find out who wrote it, when it appeared, and why — without guessing.</p>
      </header>

      {/* Scenario + live objectives */}
      <div className="blame-mission">
        <div className="blame-mission__text">
          <div className="blame-mission__tag"><Target size={15} strokeWidth={2.2} /> Your mission</div>
          <p>
            Order totals in <code>pricing.js</code> look off. The discount line is the prime suspect.
            Use <code>git blame</code> to see who last touched each line, the <code>git log -S</code> pickaxe
            to find the commit that first introduced <code>applyDiscount</code>, then <code>git show</code> to
            read that commit's diff.
          </p>
        </div>
        <ul className="blame-objectives">
          {objectives.map((o) => (
            <li key={o.id} className={`blame-objective ${o.done ? 'done' : ''}`}>
              <span className="blame-objective__check">{o.done ? <Check size={13} strokeWidth={3} /> : null}</span>
              {o.label}
            </li>
          ))}
        </ul>
      </div>

      <main className="blame-layout">

        {/* Stage 1 — git blame: line-by-line authorship */}
        <section className="blame-panel blame-panel--blame">
          <div className="blame-panel__head">
            <span className="blame-stage">1</span>
            <h2>git blame — Who Wrote This Line?</h2>
          </div>

          <p className="blame-note">
            <FileSearch size={14} strokeWidth={2} /> Every line carries the last commit that changed it.
            Run <code>git blame pricing.js</code> in the terminal to reveal the annotations.
          </p>

          <div className={`blame-code${blamed ? ' is-blamed' : ''}`}>
            <div className="blame-code__title">
              <strong>pricing.js</strong>
              <span className="blame-code__status">{blamed ? 'blamed' : 'run git blame to annotate'}</span>
            </div>
            <pre>
              {LINES.map((l, i) => (
                <div key={i} className="blame-row">
                  <code className="blame-annot" style={{ color: AUTHOR_COLOR[authorOf(l.hash)] || '#8b949e' }}>
                    {blamed ? `${l.hash} ${authorOf(l.hash)}` : '·······'}
                  </code>
                  <code className="blame-srcline"><span className="ln">{String(i + 1).padStart(2, '0')}</span>{l.code}</code>
                </div>
              ))}
            </pre>
          </div>
        </section>

        {/* Stage 2 — the pickaxe + show */}
        <section className="blame-panel blame-panel--pickaxe">
          <div className="blame-panel__head">
            <span className="blame-stage">2</span>
            <h2>The Pickaxe — When Did It Appear?</h2>
          </div>

          <p className="blame-note">
            <Search size={14} strokeWidth={2} /> <code>git log -S "string"</code> finds the commits that changed how
            many times a string appears — perfect for "when was this function introduced?"
          </p>

          <div className="blame-cmds">
            {commands.map(({ cmd, accent, desc }) => (
              <div key={cmd} className="blame-cmd" style={{ '--cmd-accent': accent }}>
                <code>{cmd}</code>
                <p>{desc}</p>
              </div>
            ))}
          </div>

          {searched && (
            <div className="blame-callout">
              <strong>Pickaxe hit:</strong> <code>applyDiscount</code> first appears in commit
              <code> c33d4e5</code> — "{commitMsg('c33d4e5')}" by Mira.
            </div>
          )}
        </section>

        {/* Stage 3 — the timeline */}
        <section className="blame-panel blame-panel--trail">
          <div className="blame-panel__head">
            <span className="blame-stage">3</span>
            <h2>The Trail of Commits</h2>
          </div>

          <p className="blame-note">
            <GitCommit size={14} strokeWidth={2} /> Five commits shaped <code>pricing.js</code>. The suspect line came
            from the discount commit.
          </p>

          <div className="blame-trail">
            <div className="blame-track">
              {COMMITS.map((c) => {
                const isCulprit = c.hash === 'c33d4e5'
                return (
                  <div
                    key={c.hash}
                    className={`blame-node${isCulprit ? ' is-culprit' : ''}${isCulprit && inspected ? ' is-inspected' : ''}`}
                  >
                    {isCulprit && inspected && <span className="blame-node__tag">INSPECTED</span>}
                    <span className="blame-node__dot"></span>
                    <span className="blame-node__hash">{c.hash}</span>
                    <span className="blame-node__msg">{c.message}</span>
                    <span className="blame-node__meta" style={{ color: AUTHOR_COLOR[c.author] || '#8b949e' }}>{c.author} · {c.date}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="blame-callout">
            <strong>Key insight:</strong> blame answers <em>who &amp; when</em> for a line you can see; the
            <code> -S</code> pickaxe answers <em>when &amp; where</em> for a string that may have moved or vanished.
            Together they turn "who broke this?" into a two-minute investigation.
          </div>

          {allDone ? (
            <div className="blame-status done">
              <Check size={15} strokeWidth={3} />
              Lesson 10 complete — you traced the line to its source.
            </div>
          ) : (
            <div className="blame-status pending">
              <AlertTriangle size={15} strokeWidth={2.2} />
              Complete the terminal exercise on the right to finish this lesson.
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
