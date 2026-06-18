import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  GitFork, Download, GitCommitHorizontal, Upload, GitPullRequest,
  GitMerge, RefreshCw, Check, Target, Terminal
} from 'lucide-react'

const BASE = [{ id: 'a1c', kind: 'base' }, { id: 'b2d', kind: 'base' }, { id: 'c3e', kind: 'base' }]
const FEATURE = { id: 'f9a', kind: 'feature' }
const MATE = { id: 'm4b', kind: 'mate' }

// Order matters: this is the workflow the terminal exercise drives.
const STEPS = [
  { id: 'fork',   label: 'Fork the repo',       Icon: GitFork,             cmd: 'gh repo fork octo/awesome-lib' },
  { id: 'clone',  label: 'Clone your fork',     Icon: Download,            cmd: 'git clone https://github.com/you/awesome-lib' },
  { id: 'commit', label: 'Branch & commit',     Icon: GitCommitHorizontal, cmd: 'git checkout -b fix-bug   →   git commit -am "fix"' },
  { id: 'push',   label: 'Push to your fork',   Icon: Upload,              cmd: 'git push origin fix-bug' },
  { id: 'pr',     label: 'Open a pull request', Icon: GitPullRequest,      cmd: 'gh pr create' },
  { id: 'merge',  label: 'Merge the PR',        Icon: GitMerge,            cmd: 'gh pr merge' },
  { id: 'sync',   label: 'Sync your fork',      Icon: RefreshCw,           cmd: 'gh repo sync' },
]
const ORDER = STEPS.map((s) => s.id)

export default function ForkLesson({ setTerminalSyncListener }) {
  const [done, setDone] = useState({})
  const [flow, setFlow] = useState(null)
  const flowTimer = useRef(null)
  const doneRef = useRef({})
  useEffect(() => { doneRef.current = done }, [done])

  // Drive the diagram from terminal commands: each time the terminal reports new
  // fork progress, reflect it and animate whichever step just completed. We read the
  // previous progress from a ref (not inside a state updater) so the listener stays
  // free of side effects and is safe under React StrictMode.
  useEffect(() => {
    if (!setTerminalSyncListener) return
    setTerminalSyncListener(() => (syncState) => {
      if (!syncState || !syncState.fork) return
      const f = syncState.fork
      const justDone = ORDER.find((id) => f[id] && !doneRef.current[id])
      if (justDone) {
        setFlow(justDone)
        clearTimeout(flowTimer.current)
        flowTimer.current = setTimeout(() => setFlow(null), 950)
      }
      doneRef.current = { ...f }
      setDone({ ...f })
    })
    return () => {
      clearTimeout(flowTimer.current)
      if (setTerminalSyncListener) setTerminalSyncListener(null)
    }
  }, [setTerminalSyncListener])

  // Commit contents of each node are a pure function of progress.
  const commits = useMemo(() => {
    const upstream = [...BASE, ...(done.merge ? [FEATURE] : [])]
    const fork = [
      ...(done.fork ? BASE : []),
      ...(done.push || done.merge ? [FEATURE] : []),
      ...(done.sync ? [MATE] : []),
    ]
    const local = [
      ...(done.clone ? BASE : []),
      ...(done.commit || done.push || done.merge ? [FEATURE] : []),
      ...(done.sync ? [MATE] : []),
    ]
    return { upstream, fork, local }
  }, [done])

  const pr = done.merge ? 'merged' : done.pr ? 'open' : 'none'
  const currentId = ORDER.find((id) => !done[id]) || null
  const current = STEPS.find((s) => s.id === currentId)
  const requiredDone = ['fork', 'clone', 'commit', 'push', 'pr', 'merge'].every((id) => done[id])

  const activeNode = {
    fork: 'fork', clone: 'local', commit: 'local', push: 'fork',
    pr: 'upstream', merge: 'upstream', sync: 'local',
  }[flow]

  const packet = {
    fork:  { x: 300, y: 104, d: 64,  feat: false },
    clone: { x: 300, y: 258, d: 64,  feat: false },
    push:  { x: 150, y: 326, d: -64, feat: true },
    pr:    { x: 150, y: 172, d: -64, feat: true },
    merge: { x: 150, y: 172, d: -64, feat: true },
    sync:  { x: 300, y: 104, d: 218, feat: false },
  }[flow]

  const connActive = (id) => {
    if (id === 'fork-down') return flow === 'fork' || flow === 'sync'
    if (id === 'pr-up') return flow === 'pr' || flow === 'merge'
    if (id === 'clone-down') return flow === 'clone' || flow === 'sync'
    if (id === 'push-up') return flow === 'push'
    return false
  }

  return (
    <div className="fork-lesson">
      <header className="lesson-header">
        <span className="lesson-kicker">Lesson 8</span>
        <h1>Fork &amp; Contribute</h1>
        <p>Contribute to a project you don’t own — fork it, fix it on your copy, and propose your work back with a pull request. Drive it from the terminal below.</p>
      </header>

      <div className="flow-mission history-mission">
        <div className="mission-text">
          <div className="mission-tag"><Target size={15} strokeWidth={2.2} /> Your mission</div>
          <p>
            You found a bug in <code>octo/awesome-lib</code> but can’t push to it directly.
            Use the <strong>terminal</strong> to fork it, commit a fix, and get it
            <strong> merged</strong>. The diagram animates as you go — watch your purple commit climb to upstream.
          </p>
        </div>
        <ul className="mission-objectives">
          {STEPS.slice(0, 4).map((s) => (
            <li key={s.id} className={`objective ${done[s.id] ? 'done' : ''}`}>
              <span className="objective-check">{done[s.id] ? <Check size={13} strokeWidth={3} /> : null}</span>
              {s.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="fork-stage-wrap">
        <svg className="fork-diagram" viewBox="0 0 440 430" role="img" aria-label="Fork workflow diagram">
          <defs>
            <marker id="fork-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="rgba(255,255,255,0.45)" />
            </marker>
          </defs>

          <line className={`fork-conn ${connActive('fork-down') ? 'active' : ''}`} x1="300" y1="104" x2="300" y2="166" markerEnd="url(#fork-arrow)" />
          <line className={`fork-conn up ${connActive('pr-up') ? 'active' : ''}`} x1="150" y1="172" x2="150" y2="110" markerEnd="url(#fork-arrow)" />
          <line className={`fork-conn ${connActive('clone-down') ? 'active' : ''}`} x1="300" y1="258" x2="300" y2="320" markerEnd="url(#fork-arrow)" />
          <line className={`fork-conn up ${connActive('push-up') ? 'active' : ''}`} x1="150" y1="326" x2="150" y2="264" markerEnd="url(#fork-arrow)" />

          <text className="fork-conn-label" x="312" y="142">fork / sync</text>
          <text className="fork-conn-label end" x="138" y="142">pull request</text>
          <text className="fork-conn-label" x="312" y="296">clone</text>
          <text className="fork-conn-label end" x="138" y="296">push</text>

          <Node x={110} y={18} title="Upstream repo" sub="the original project" commits={commits.upstream} active={activeNode === 'upstream'} dotY={88} />
          <Node x={110} y={172} title="Your fork" sub="your GitHub copy" commits={commits.fork} active={activeNode === 'fork'} dotY={242} />
          <Node x={110} y={326} title="Your computer" sub="local clone" commits={commits.local} active={activeNode === 'local'} dotY={396} />

          {packet && (
            <circle key={flow} className={`fork-packet ${packet.feat ? 'feat' : ''}`} cx={packet.x} cy={packet.y} r="7" style={{ '--dist': `${packet.d}px` }} />
          )}
        </svg>

        <div className="fork-side">
          {current ? (
            <div className="fork-current">
              <div className="fork-current-head">
                <span className="fork-step-badge"><current.Icon size={16} strokeWidth={2} /></span>
                <strong>Next: {current.label}</strong>
              </div>
              <p>Type this in the terminal:</p>
              <code className="fork-cmd">{current.cmd}</code>
            </div>
          ) : (
            <div className="fork-current done">
              <div className="fork-current-head"><Check size={16} strokeWidth={3} /> <strong>Workflow complete</strong></div>
              <p>Your fix went from a fork all the way into the upstream project — that’s the open-source contribution loop.</p>
            </div>
          )}

          {pr !== 'none' && (
            <div className={`fork-pr-card ${pr}`}>
              <div className="fork-pr-top">
                <GitPullRequest size={15} strokeWidth={2} />
                <span className="fork-pr-title">Fix: handle the bug</span>
                <span className={`fork-pr-status ${pr}`}>{pr === 'merged' ? 'Merged' : 'Open'}</span>
              </div>
              <div className="fork-pr-branches">
                <code>octo:main</code> <span>←</span> <code>you:fix-bug</code>
              </div>
              {pr === 'merged'
                ? <div className="fork-pr-merged"><Check size={14} strokeWidth={3} /> Merged into upstream</div>
                : <div className="fork-pr-merged" style={{ color: '#6ee7b7' }}>Awaiting merge — run <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>gh pr merge</code></div>}
            </div>
          )}

          <div className="fork-terminal-hint">
            <Terminal size={14} strokeWidth={2} /> Run the commands in the terminal below. Stuck? Open the <strong>Cheatsheet</strong>.
          </div>

          <div className="fork-legend">
            <span><i className="dot base" /> existing commits</span>
            <span><i className="dot feature" /> your change</span>
            <span><i className="dot mate" /> teammate’s change</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Node({ x, y, title, sub, commits, active, dotY }) {
  return (
    <g className={`fork-node ${active ? 'active' : ''}`}>
      <rect x={x} y={y} width="220" height="86" rx="14" />
      <text className="fork-node-title" x={x + 16} y={y + 28}>{title}</text>
      <text className="fork-node-sub" x={x + 16} y={y + 46}>{sub}</text>
      {commits.length === 0 ? (
        <text className="fork-node-empty" x={x + 16} y={dotY + 2}>— empty —</text>
      ) : (
        commits.slice(0, 7).map((c, i) => (
          <circle key={c.id + i} className={`fork-commit kind-${c.kind}`} cx={x + 22 + i * 26} cy={dotY} r="8" />
        ))
      )}
    </g>
  )
}
