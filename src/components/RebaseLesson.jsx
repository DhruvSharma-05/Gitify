import React, { useMemo, useState } from 'react'
import PretextCanvas from './PretextCanvas.jsx'

const startingCommits = [
  { id: 'p1', hash: 'p81a2c', message: 'Add checkout form', action: 'pick' },
  { id: 'p2', hash: 'c44ef8', message: 'Fix typo in payment copy', action: 'squash' },
  { id: 'p3', hash: 'a12d90', message: 'Wire Stripe token', action: 'pick' },
  { id: 'p4', hash: 'd73b11', message: 'debug payment state', action: 'drop' },
  { id: 'p5', hash: 'f09ab4', message: 'Handle declined cards', action: 'reword' }
]

const decisions = [
  { question: 'Is this branch shared with others?', yes: 'Merge', no: 'Continue' },
  { question: 'Do you want a clean linear history?', yes: 'Rebase', no: 'Merge' },
  { question: 'Is this a long-running branch?', yes: 'Merge', no: 'Continue' },
  { question: 'Is this a short feature branch?', yes: 'Rebase', no: 'Merge' }
]

export default function RebaseLesson() {
  const [view, setView] = useState('both')
  const [commits, setCommits] = useState(startingCommits)
  const [draggedId, setDraggedId] = useState(null)
  const [rebased, setRebased] = useState(false)
  const [sharedBroken, setSharedBroken] = useState(false)
  const [decisionIndex, setDecisionIndex] = useState(0)
  const [decisionAnswer, setDecisionAnswer] = useState('')

  const cleanedCommits = useMemo(() => {
    const result = []
    commits.forEach((commit) => {
      if (commit.action === 'drop') return
      if (commit.action === 'squash' && result.length) {
        result[result.length - 1] = {
          ...result[result.length - 1],
          message: `${result[result.length - 1].message} + ${commit.message}`,
          hash: `${result[result.length - 1].hash.slice(0, 3)}${commit.hash.slice(3, 6)}`
        }
        return
      }
      result.push({
        ...commit,
        hash: commit.action === 'reword' ? `new${commit.hash.slice(3, 6)}` : commit.hash,
        message: commit.action === 'reword' ? 'Handle card failures clearly' : commit.message
      })
    })
    return result
  }, [commits])

  const updateAction = (id, action) => {
    setCommits((items) => items.map((item) => item.id === id ? { ...item, action } : item))
    setRebased(false)
  }

  const moveCommit = (fromId, toId) => {
    if (!fromId || fromId === toId) return
    setCommits((items) => {
      const next = [...items]
      const fromIndex = next.findIndex((item) => item.id === fromId)
      const toIndex = next.findIndex((item) => item.id === toId)
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
    setRebased(false)
  }

  const nudgeCommit = (id, direction) => {
    setCommits((items) => {
      const index = items.findIndex((item) => item.id === id)
      const target = index + direction
      if (target < 0 || target >= items.length) return items
      const next = [...items]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
    setRebased(false)
  }

  const answerDecision = (choice) => {
    const step = decisions[decisionIndex]
    const result = choice === 'yes' ? step.yes : step.no
    if (result === 'Continue') {
      setDecisionIndex((index) => Math.min(index + 1, decisions.length - 1))
      setDecisionAnswer('')
    } else {
      setDecisionAnswer(result)
    }
  }

  return (
    <div className="rebase-lesson">
      <header className="lesson-header">
        <span className="lesson-kicker">Lesson 7</span>
        <h1>Rebase & Clean History</h1>
        <p>Merge preserves what happened. Rebase rewrites the story so it reads cleanly.</p>
      </header>
      <PretextCanvas scene="rebaseClean" height={220} />

      <div className="golden-rule">
        <strong>Golden Rule:</strong> Never rebase commits that others are already working on.
        <button onClick={() => setSharedBroken(true)}>Try rebasing a shared branch</button>
      </div>

      {sharedBroken && (
        <div className="broken-team">
          <div>Jordan rebased <code>feature/payments</code></div>
          <div>Sam's local branch still points at old hashes</div>
          <div className="broken-alert">Teammate repo broken: histories no longer match</div>
        </div>
      )}

      <main className="rebase-layout">
        <section className="rebase-panel compare-panel">
          <div className="panel-heading">
            <span>Merge vs Rebase</span>
            <h2>Same code, different story</h2>
          </div>
          <div className="compare-toggle">
            {['both', 'merge', 'rebase'].map((mode) => (
              <button key={mode} className={view === mode ? 'selected' : ''} onClick={() => setView(mode)}>
                {mode}
              </button>
            ))}
          </div>
          <div className={`graph-compare show-${view}`}>
            {(view === 'both' || view === 'merge') && <CommitGraph type="merge" />}
            {(view === 'both' || view === 'rebase') && <CommitGraph type="rebase" />}
          </div>
        </section>

        <section className="rebase-panel interactive-panel">
          <div className="panel-heading">
            <span>Interactive Rebase</span>
            <h2>git rebase -i HEAD~5</h2>
          </div>
          <div className="rebase-command-list">
            {commits.map((commit, index) => (
              <div
                key={commit.id}
                className={`rebase-card action-${commit.action}`}
                draggable
                onDragStart={() => setDraggedId(commit.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => moveCommit(draggedId, commit.id)}
              >
                <div className="rebase-card-main">
                  <span>{index + 1}</span>
                  <code>{commit.hash}</code>
                  <strong>{commit.message}</strong>
                </div>
                <div className="rebase-card-actions">
                  {['pick', 'squash', 'reword', 'drop'].map((action) => (
                    <button
                      key={action}
                      className={commit.action === action ? 'selected' : ''}
                      onClick={() => updateAction(commit.id, action)}
                    >
                      {action}
                    </button>
                  ))}
                  <button onClick={() => nudgeCommit(commit.id, -1)}>Up</button>
                  <button onClick={() => nudgeCommit(commit.id, 1)}>Down</button>
                </div>
              </div>
            ))}
          </div>
          <div className="git-cmd-line">
            <span className="label">runs</span>
            <span className="cmd-prompt">$</span>
            <code>git rebase -i HEAD~{commits.length}</code>
          </div>
          <button className="rebase-confirm" onClick={() => setRebased(true)}>Confirm rebase</button>
        </section>

        <section className="rebase-panel result-panel">
          <div className="panel-heading">
            <span>Clean Timeline</span>
            <h2>New commits, new hashes</h2>
          </div>
          <div className={`clean-history ${rebased ? 'active' : ''}`}>
            {(rebased ? cleanedCommits : commits).map((commit) => (
              <div className="clean-node" key={`${commit.id}-${commit.hash}`}>
                <span></span>
                <code>{rebased ? commit.hash : commit.hash}</code>
                <strong>{commit.message}</strong>
              </div>
            ))}
          </div>
          <div className="command-strip">
            <code>git rebase main</code>
            <code>git rebase -i HEAD~N</code>
            <code>git rebase --abort</code>
            <code>git push --force-with-lease</code>
          </div>
        </section>

        <section className="rebase-panel decision-panel">
          <div className="panel-heading">
            <span>When to Use Which</span>
            <h2>Decision tree</h2>
          </div>
          <div className="decision-box">
            <p>{decisions[decisionIndex].question}</p>
            <div className="decision-actions">
              <button onClick={() => answerDecision('yes')}>Yes</button>
              <button onClick={() => answerDecision('no')}>No</button>
              <button onClick={() => { setDecisionIndex(0); setDecisionAnswer('') }}>Reset</button>
            </div>
            <div className={`decision-answer answer-${decisionAnswer.toLowerCase()}`}>
              {decisionAnswer || 'Answer the questions to get a recommendation.'}
            </div>
          </div>
          <div className="insight-callout">
            <strong>Key insight:</strong> Rebase rewrites commit hashes. To you it looks the same,
            but to Git those are brand new commits. That is why sharing rebased branches breaks teammates.
          </div>
        </section>
      </main>
    </div>
  )
}

function CommitGraph({ type }) {
  const isRebase = type === 'rebase'
  return (
    <div className={`story-graph ${type}`}>
      <h3>{isRebase ? 'git rebase main' : 'git merge main'}</h3>
      <svg viewBox="0 0 520 220" role="img" aria-label={`${type} commit graph`}>
        <line x1="40" y1="150" x2="470" y2="150" className="main-graph-line" />
        {[40, 120, 200, 280].map((x, index) => <GraphNode key={x} x={x} y={150} label={`m${index + 1}`} />)}
        {isRebase ? (
          <>
            <line x1="280" y1="150" x2="470" y2="150" className="feature-graph-line" />
            {[340, 405, 470].map((x, index) => <GraphNode key={x} x={x} y={150} label={`p${index + 1}'`} feature />)}
          </>
        ) : (
          <>
            <path d="M120 150 C150 80, 250 70, 320 85" className="feature-graph-line" />
            <path d="M320 85 C360 90, 390 130, 430 150" className="merge-graph-line" />
            {[180, 250, 320].map((x, index) => <GraphNode key={x} x={x} y={index === 2 ? 85 : 92} label={`p${index + 1}`} feature />)}
            <GraphNode x={430} y={150} label="merge" merge />
          </>
        )}
      </svg>
    </div>
  )
}

function GraphNode({ x, y, label, feature, merge }) {
  return (
    <g>
      <circle cx={x} cy={y} r="15" className={merge ? 'graph-node merge' : feature ? 'graph-node feature' : 'graph-node'} />
      <text x={x} y={y + 34} textAnchor="middle">{label}</text>
    </g>
  )
}
