import React, { useState, useRef } from 'react'
import {
  GitFork, Download, GitCommitHorizontal, Upload, GitPullRequest,
  GitMerge, RefreshCw, Check, Target, Cloud, Laptop
} from 'lucide-react'
import { useToast } from './Toast.jsx'

const BASE = [{ id: 'a1c', kind: 'base' }, { id: 'b2d', kind: 'base' }, { id: 'c3e', kind: 'base' }]
const FEATURE = { id: 'f9a', kind: 'feature' }
const MATE = { id: 'm4b', kind: 'mate' }

const STEPS = [
  { id: 'fork',   label: 'Fork the repo',      Icon: GitFork,            desc: 'Copy the upstream project into your own GitHub account. This is your personal copy you can change freely.' },
  { id: 'clone',  label: 'Clone your fork',    Icon: Download,           desc: 'Download your fork to your computer so you can edit the code locally.' },
  { id: 'commit', label: 'Commit a change',    Icon: GitCommitHorizontal,desc: 'Make an improvement and save it as a commit on your machine — shown in purple.' },
  { id: 'push',   label: 'Push to your fork',  Icon: Upload,             desc: 'Upload your new commit from your computer to your fork on GitHub.' },
  { id: 'pr',     label: 'Open a Pull Request',Icon: GitPullRequest,     desc: 'Ask the original project to pull in your change. A PR is a polite “please review & merge this”.' },
  { id: 'merge',  label: 'Merge the PR',       Icon: GitMerge,           desc: 'A maintainer reviews and merges your commit into the upstream project. Your code is now part of it!' },
  { id: 'sync',   label: 'Sync your fork',     Icon: RefreshCw,          desc: 'Pull the latest upstream changes (including others’ merged work) back into your fork and computer.' },
]

export default function ForkLesson({ onComplete } = {}) {
  const toast = useToast()
  const [commits, setCommits] = useState({ upstream: BASE, fork: [], local: [] })
  const [pr, setPr] = useState('none') // none | open | merged
  const [done, setDone] = useState({})
  const [flow, setFlow] = useState(null)
  const [busy, setBusy] = useState(false)
  const completedRef = useRef(false)

  const currentStep = STEPS.find((s) => !done[s.id])?.id || null
  const allDone = STEPS.every((s) => done[s.id])

  function applyStep(id) {
    setCommits((c) => {
      switch (id) {
        case 'fork':   return { ...c, fork: [...c.upstream] }
        case 'clone':  return { ...c, local: [...c.fork] }
        case 'commit': return { ...c, local: [...c.local, FEATURE] }
        case 'push':   return { ...c, fork: [...c.fork, FEATURE] }
        case 'pr':     return { ...c, upstream: [...c.upstream, MATE] } // project moves on while your PR waits
        case 'merge':  return { ...c, upstream: [...c.upstream, FEATURE] }
        case 'sync':   return { ...c, fork: [...c.fork, MATE], local: [...c.local, MATE] }
        default:       return c
      }
    })
    if (id === 'pr') setPr('open')
    if (id === 'merge') setPr('merged')

    const msgs = {
      fork:   ['Fork created', 'A personal copy now lives on your GitHub account.'],
      clone:  ['Cloned locally', 'Your fork is now on your computer, ready to edit.'],
      commit: ['Committed', 'Your purple feature commit is saved locally.'],
      push:   ['Pushed', 'Your commit is now on your fork on GitHub.'],
      pr:     ['Pull request opened', 'The maintainers can now review your change.'],
      merge:  ['Merged into upstream', 'Your contribution is part of the original project!'],
      sync:   ['Fork synced', 'You now have everyone’s latest changes.'],
    }
    const [title, body] = msgs[id]
    if (id === 'merge') toast.success(body, { title })
    else if (id === 'sync') toast.success(body, { title })
    else toast.info(body, { title })

    if (id === 'sync' && !completedRef.current) {
      completedRef.current = true
      setTimeout(() => {
        toast.success('You forked, contributed, merged a PR, and synced — the full open-source workflow!', { title: 'Lesson 8 complete' })
        onComplete?.()
      }, 600)
    }
  }

  function runStep(id) {
    if (busy || id !== currentStep) return
    setBusy(true)
    setFlow(id)
    setTimeout(() => {
      applyStep(id)
      setDone((d) => ({ ...d, [id]: true }))
      setFlow(null)
      setBusy(false)
    }, 950)
  }

  function reset() {
    setCommits({ upstream: BASE, fork: [], local: [] })
    setPr('none')
    setDone({})
    setFlow(null)
    setBusy(false)
    completedRef.current = false
  }

  // node highlight + connector/packet helpers
  const activeNode = {
    fork: 'fork', clone: 'local', commit: 'local', push: 'fork',
    pr: 'upstream', merge: 'upstream', sync: 'local',
  }[flow]

  // packet config per flow: x lane, start y, distance (+down/-up), feature?
  const packet = {
    fork:   { x: 300, y: 104, d: 64,  feat: false },
    clone:  { x: 300, y: 258, d: 64,  feat: false },
    push:   { x: 150, y: 326, d: -64, feat: true },
    pr:     { x: 150, y: 172, d: -64, feat: true },
    merge:  { x: 150, y: 172, d: -64, feat: true },
    sync:   { x: 300, y: 104, d: 218, feat: false },
  }[flow]

  const connActive = (id) => {
    if (id === 'fork-down') return flow === 'fork' || flow === 'sync'
    if (id === 'pr-up') return flow === 'pr' || flow === 'merge'
    if (id === 'clone-down') return flow === 'clone' || flow === 'sync'
    if (id === 'push-up') return flow === 'push'
    return false
  }

  const stepObj = STEPS.find((s) => s.id === currentStep)

  return (
    <div className="fork-lesson">
      <header className="lesson-header">
        <span className="lesson-kicker">Lesson 8</span>
        <h1>Fork &amp; Contribute</h1>
        <p>How you contribute to a project you don’t own — fork it, change your copy, and propose your work back with a pull request.</p>
      </header>

      <div className="flow-mission history-mission">
        <div className="mission-text">
          <div className="mission-tag"><Target size={15} strokeWidth={2.2} /> Your goal</div>
          <p>
            You found a bug in an open-source project, but you can’t push to it directly.
            Take your fix all the way from a <strong>fork</strong> to being <strong>merged</strong> into
            the original project. Follow the <span className="glow-hint">glowing</span> step.
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
        {/* The interactive diagram */}
        <svg className="fork-diagram" viewBox="0 0 440 430" role="img" aria-label="Fork workflow diagram">
          <defs>
            <marker id="fork-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="rgba(255,255,255,0.45)" />
            </marker>
          </defs>

          {/* Connectors */}
          <line className={`fork-conn ${connActive('fork-down') ? 'active' : ''}`} x1="300" y1="104" x2="300" y2="166" markerEnd="url(#fork-arrow)" />
          <line className={`fork-conn up ${connActive('pr-up') ? 'active' : ''}`} x1="150" y1="172" x2="150" y2="110" markerEnd="url(#fork-arrow)" />
          <line className={`fork-conn ${connActive('clone-down') ? 'active' : ''}`} x1="300" y1="258" x2="300" y2="320" markerEnd="url(#fork-arrow)" />
          <line className={`fork-conn up ${connActive('push-up') ? 'active' : ''}`} x1="150" y1="326" x2="150" y2="264" markerEnd="url(#fork-arrow)" />

          {/* Connector labels */}
          <text className="fork-conn-label" x="312" y="142">fork / sync</text>
          <text className="fork-conn-label end" x="138" y="142">pull request</text>
          <text className="fork-conn-label" x="312" y="296">clone</text>
          <text className="fork-conn-label end" x="138" y="296">push</text>

          <Node x={110} y={18} title="Upstream repo" sub="the original project" commits={commits.upstream} active={activeNode === 'upstream'} dotY={88} />
          <Node x={110} y={172} title="Your fork" sub="your GitHub copy" commits={commits.fork} active={activeNode === 'fork'} dotY={242} />
          <Node x={110} y={326} title="Your computer" sub="local clone" commits={commits.local} active={activeNode === 'local'} dotY={396} />

          {/* Animated packet */}
          {packet && (
            <circle
              key={flow}
              className={`fork-packet ${packet.feat ? 'feat' : ''}`}
              cx={packet.x}
              cy={packet.y}
              r="7"
              style={{ '--dist': `${packet.d}px` }}
            />
          )}
        </svg>

        {/* Side: current instruction, PR card, legend */}
        <div className="fork-side">
          {stepObj ? (
            <div className="fork-current">
              <div className="fork-current-head">
                <span className="fork-step-badge"><stepObj.Icon size={16} strokeWidth={2} /></span>
                <strong>Next: {stepObj.label}</strong>
              </div>
              <p>{stepObj.desc}</p>
            </div>
          ) : (
            <div className="fork-current done">
              <div className="fork-current-head"><Check size={16} strokeWidth={3} /> <strong>Workflow complete</strong></div>
              <p>You took a change from your fork all the way into the upstream project. That’s exactly how open-source contributions work.</p>
            </div>
          )}

          {pr !== 'none' && (
            <div className={`fork-pr-card ${pr}`}>
              <div className="fork-pr-top">
                <GitPullRequest size={15} strokeWidth={2} />
                <span className="fork-pr-title">Fix: handle null metric</span>
                <span className={`fork-pr-status ${pr}`}>{pr === 'merged' ? 'Merged' : 'Open'}</span>
              </div>
              <div className="fork-pr-branches">
                <code>upstream:main</code> <span>←</span> <code>you:fix-null</code>
              </div>
              {pr === 'open' ? (
                <button className="fork-merge-btn" onClick={() => runStep('merge')} disabled={busy || currentStep !== 'merge'}>
                  <GitMerge size={14} strokeWidth={2.2} /> Merge pull request
                </button>
              ) : (
                <div className="fork-pr-merged"><Check size={14} strokeWidth={3} /> Merged by maintainer</div>
              )}
            </div>
          )}

          <div className="fork-legend">
            <span><i className="dot base" /> existing commits</span>
            <span><i className="dot feature" /> your change</span>
            <span><i className="dot mate" /> teammate’s change</span>
          </div>
        </div>
      </div>

      {/* Interactive step controls */}
      <div className="controls fork-steps">
        {STEPS.map((s) => (
          <button
            key={s.id}
            className={`${currentStep === s.id && !busy ? 'is-next' : ''} ${done[s.id] ? 'is-done' : ''}`}
            onClick={() => runStep(s.id)}
            disabled={busy || done[s.id] || s.id !== currentStep}
          >
            {done[s.id] ? <Check size={15} strokeWidth={3} /> : <s.Icon size={15} strokeWidth={2} />}
            {s.label}
          </button>
        ))}
        <button className="flow-reset" onClick={reset}>
          <RefreshCw size={14} strokeWidth={2} /> Reset
        </button>
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
