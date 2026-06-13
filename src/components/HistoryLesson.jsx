import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Target, Check, AlertTriangle, CornerUpLeft, RotateCcw, Eye } from 'lucide-react'
import PretextCanvas from './PretextCanvas.jsx'
import { useToast } from './Toast.jsx'

const baseCommits = [
  {
    hash: 'a3f9c2',
    message: 'Initial dashboard',
    author: 'Alex',
    time: '2 days ago',
    files: ['App.jsx', 'Dashboard.jsx', 'styles.css'],
    diff: { removed: ['-  return <EmptyState />'], added: ['+  return <Dashboard />'] }
  },
  {
    hash: 'b81d4a',
    message: 'Add auth guard',
    author: 'Sam',
    time: '36 hours ago',
    files: ['App.jsx', 'auth.js', 'Dashboard.jsx'],
    diff: { removed: ['-  const user = null'], added: ['+  const user = getSessionUser()'] }
  },
  {
    hash: 'c04e77',
    message: 'Cache metrics',
    author: 'Mira',
    time: '28 hours ago',
    files: ['metrics.js', 'cache.js', 'Dashboard.jsx'],
    diff: { removed: ['-  return fetchMetrics()'], added: ['+  return cache.remember("metrics", fetchMetrics)'] }
  },
  {
    hash: 'd92aa1',
    message: 'Tune chart layout',
    author: 'Alex',
    time: '20 hours ago',
    files: ['Chart.jsx', 'styles.css', 'theme.js'],
    diff: { removed: ['-  gridTemplateColumns: "1fr"'], added: ['+  gridTemplateColumns: "2fr 1fr"'] }
  },
  {
    hash: 'e17b90',
    message: 'Skip null metric check',
    author: 'Sam',
    time: '14 hours ago',
    bad: true,
    files: ['metrics.js', 'Dashboard.jsx', 'alerts.js'],
    diff: { removed: ['-  if (!metric) return "No data"'], added: ['+  return metric.value.toFixed(2)'] }
  },
  {
    hash: 'f63c18',
    message: 'Polish loading state',
    author: 'Mira',
    time: '8 hours ago',
    files: ['Spinner.jsx', 'Dashboard.jsx', 'styles.css'],
    diff: { removed: ['-  <p>Loading</p>'], added: ['+  <Spinner label="Loading metrics" />'] }
  },
  {
    hash: '9ac2d5',
    message: 'Update deploy config',
    author: 'Alex',
    time: '3 hours ago',
    files: ['deploy.yml', 'env.js', 'README.md'],
    diff: { removed: ['-  replicas: 1'], added: ['+  replicas: 3'] }
  },
  {
    hash: '18be44',
    message: 'Release production',
    author: 'Sam',
    time: '25 mins ago',
    files: ['CHANGELOG.md', 'package.json', 'deploy.yml'],
    diff: { removed: ['-  version: 1.3.1'], added: ['+  version: 1.3.2'] }
  }
]

const matrixTargets = [
  { id: 'shared', situation: 'Already pushed to shared branch', answer: 'revert' },
  { id: 'clean', situation: 'Local only, want clean history', answer: 'reset --soft' },
  { id: 'nuke', situation: 'Want to nuke everything', answer: 'reset --hard' }
]

const matrixLabels = ['revert', 'reset --soft', 'reset --hard']

const BAD_INDEX = baseCommits.findIndex((c) => c.bad)

export default function HistoryLesson({ onSuccess } = {}) {
  const toast = useToast()
  const [selectedIndex, setSelectedIndex] = useState(BAD_INDEX)
  const [headIndex, setHeadIndex] = useState(baseCommits.length - 1)
  const [hasReverted, setHasReverted] = useState(false)
  const [resetIndex, setResetIndex] = useState(baseCommits.length - 1)
  const [resetMode, setResetMode] = useState('mixed')
  const [triedHardReset, setTriedHardReset] = useState(false)
  const [matrixAnswers, setMatrixAnswers] = useState({})

  const commits = useMemo(() => {
    if (!hasReverted) return baseCommits
    return [
      ...baseCommits,
      {
        hash: '7f21ab',
        message: 'Revert "Skip null metric check"',
        author: 'You',
        time: 'now',
        revert: true,
        files: ['metrics.js', 'Dashboard.jsx', 'alerts.js'],
        diff: { removed: ['-  return metric.value.toFixed(2)'], added: ['+  if (!metric) return "No data"'] }
      }
    ]
  }, [hasReverted])

  const selected = commits[selectedIndex] || commits[BAD_INDEX]
  const headCommit = commits[headIndex] || commits[commits.length - 1]
  const resetCommit = commits[Number(resetIndex)] || commits[commits.length - 1]
  const correctCount = matrixTargets.filter((target) => matrixAnswers[target.id] === target.answer).length
  const matrixDone = correctCount === matrixTargets.length
  const atTip = headIndex === commits.length - 1
  const discarded = baseCommits.slice(Number(resetIndex) + 1)

  // Live objective tracker — gives the lesson a clear goal & sense of progress
  const objectives = [
    { id: 'revert', label: 'Revert the broken commit safely', done: hasReverted },
    { id: 'reset', label: 'See what a hard reset destroys', done: triedHardReset },
    { id: 'matrix', label: 'Match all 3 situations in the Safety Matrix', done: matrixDone },
  ]
  const allDone = objectives.every((o) => o.done)

  // Fire completion exactly once when every objective is met
  const firedRef = useRef(false)
  useEffect(() => {
    if (allDone && !firedRef.current) {
      firedRef.current = true
      toast.success('You inspected, reverted, and learned when each undo is safe.', { title: 'Lesson 4 complete' })
      if (onSuccess) onSuccess()
    }
  }, [allDone, onSuccess, toast])

  const jumpToCommit = () => {
    setHeadIndex(selectedIndex)
    if (selectedIndex !== commits.length - 1) {
      toast.info(`HEAD detached at ${commits[selectedIndex].hash}. You're viewing an old snapshot, not the branch tip.`, { title: 'Detached HEAD' })
    }
  }

  const returnToLatest = () => setHeadIndex(commits.length - 1)

  const revertBadCommit = () => {
    setHasReverted(true)
    setHeadIndex(baseCommits.length)
    setSelectedIndex(baseCommits.length)
    toast.success('A new "Revert" commit was added on top — original history is preserved, so this is safe to push.', { title: 'Reverted safely' })
  }

  const pickResetMode = (mode) => {
    setResetMode(mode)
    if (mode === 'hard') setTriedHardReset(true)
  }

  const handleDrop = (event, targetId) => {
    const label = event.dataTransfer.getData('text/plain')
    setMatrixAnswers((answers) => ({ ...answers, [targetId]: label }))
  }

  return (
    <div className="history-lesson">
      <header className="lesson-header">
        <span className="lesson-kicker">Lesson 4</span>
        <h1>Git History & Time Travel</h1>
        <p>Every commit is a snapshot. Inspect it, jump to it, undo it, or rewrite it with care.</p>
      </header>

      {/* Scenario + live objectives so the user always knows the goal */}
      <div className="history-mission">
        <div className="mission-text">
          <div className="mission-tag"><Target size={15} strokeWidth={2.2} /> Your mission</div>
          <p>
            Commit <code>e17b90</code> (“Skip null metric check”) shipped to production and
            <strong> broke the metrics dashboard</strong>. Work down the stages below to inspect what
            went wrong, undo it <em>safely</em>, and learn when each kind of undo is the right tool.
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

      <PretextCanvas scene="historyLog" height={220} />

      <main className="history-layout">
        <section className="history-panel timeline-panel">
          <div className="panel-heading">
            <span className="stage-num">1</span>
            <h2>The Timeline</h2>
          </div>

          <p className="stage-instruction"><Eye size={14} strokeWidth={2} /> Click any commit to read its diff below. The red node is the commit that broke production.</p>

          <div className="timeline-scroller">
            <div className="history-track">
              {commits.map((commit, index) => (
                <button
                  key={commit.hash}
                  className={`history-node ${selectedIndex === index ? 'selected' : ''} ${commit.bad ? 'bad' : ''} ${commit.revert ? 'revert' : ''}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  {headIndex === index && <span className="head-pointer">HEAD</span>}
                  <span className="node-dot"></span>
                  <strong>{commit.hash}</strong>
                  <em>{commit.message}</em>
                  <small><Avatar name={commit.author} /> {commit.author} - {commit.time}</small>
                  {commit.bad && <span className="commit-tag bad">broke prod</span>}
                  {commit.revert && <span className="commit-tag revert">undo</span>}
                </button>
              ))}
            </div>
          </div>

          <DiffPanel commit={selected} />
        </section>

        <section className="history-panel checkout-panel">
          <div className="panel-heading">
            <span className="stage-num">2</span>
            <h2>Detached HEAD</h2>
          </div>

          <p className="stage-instruction">Select a commit in Stage 1, then jump to it. Watch the <strong>HEAD</strong> tag and the working directory below change to that snapshot.</p>

          <div className="snapshot-grid">
            <div>
              <button className="history-action" onClick={jumpToCommit} disabled={selectedIndex === headIndex}>
                Jump to {selected.hash}
              </button>
              {!atTip && (
                <button className="history-action ghost" onClick={returnToLatest}>
                  <CornerUpLeft size={14} strokeWidth={2} /> Return to latest
                </button>
              )}
            </div>
            <div className="working-snapshot">
              <h3>Working directory</h3>
              <span className="snapshot-hash">{headCommit.hash}</span>
              {headCommit.files.map((file) => <div className="snapshot-file" key={file}>{file}</div>)}
            </div>
          </div>

          {atTip ? (
            <div className="detached-status ok">HEAD is on the branch tip — new commits attach normally.</div>
          ) : (
            <div className="detached-status warn">
              <AlertTriangle size={14} strokeWidth={2.2} />
              Detached HEAD: you're viewing <code>{headCommit.hash}</code> directly, not a branch. Commits made here are easy to lose — create a branch or return to the tip.
            </div>
          )}
        </section>

        <section className="history-panel revert-panel">
          <div className="panel-heading">
            <span className="stage-num">3</span>
            <h2>Safe Undo — <code>git revert</code></h2>
          </div>

          <p className="stage-instruction">The break came from <code>e17b90</code>. <strong>Revert</strong> doesn't erase it — it adds a <em>new</em> commit that applies the opposite change, so the shared history stays intact.</p>
          <button className="history-action" onClick={revertBadCommit} disabled={hasReverted}>
            <RotateCcw size={14} strokeWidth={2} /> {hasReverted ? 'Reverted ✓' : 'Revert e17b90'}
          </button>
          <div className={`safe-badge ${hasReverted ? 'active' : ''}`}>
            {hasReverted ? 'Done — see the new "undo" commit at the end of Stage 1' : 'Safe for shared branches'}
          </div>
        </section>

        <section className="history-panel reset-panel">
          <div className="panel-heading">
            <span className="stage-num">4</span>
            <h2>Dangerous Undo — <code>git reset</code></h2>
          </div>

          <p className="stage-instruction">Drag the slider to move the branch pointer back in time, then compare the three modes. Unlike revert, reset <strong>rewrites</strong> history.</p>

          <div className="reset-tabs">
            {['soft', 'mixed', 'hard'].map((mode) => (
              <button
                key={mode}
                className={resetMode === mode ? `selected mode-${mode}` : ''}
                onClick={() => pickResetMode(mode)}
              >
                --{mode}{mode === 'hard' ? <AlertTriangle size={12} strokeWidth={2.4} style={{ marginLeft: 4, verticalAlign: '-1px' }} /> : null}
              </button>
            ))}
          </div>

          <label className="reset-slider">
            Move branch pointer to: <strong>{resetCommit.hash}</strong> — {resetCommit.message}
            <input
              type="range"
              min="0"
              max={baseCommits.length - 1}
              value={resetIndex}
              onChange={(event) => setResetIndex(event.target.value)}
            />
          </label>

          {discarded.length > 0 && (
            <div className="discarded-block">
              <span className="discarded-label">{discarded.length} commit{discarded.length > 1 ? 's' : ''} after the pointer:</span>
              <div className="discarded-list">
                {discarded.map((c) => (
                  <span key={c.hash} className={`discarded-commit mode-${resetMode}`}>{c.hash} {c.message}</span>
                ))}
              </div>
              <small className="discarded-fate">
                {resetMode === 'soft'
                  ? 'kept and re-staged, ready to re-commit'
                  : resetMode === 'mixed'
                    ? 'kept in your files but unstaged'
                    : 'permanently deleted from your working tree'}
              </small>
            </div>
          )}

          <div className={`reset-state mode-${resetMode}`}>
            <div>
              <h3>Staging area</h3>
              <p>{resetMode === 'soft' ? 'Removed commits are staged as changes.' : resetMode === 'mixed' ? 'Removed commits are unstaged.' : 'No staged changes remain.'}</p>
            </div>
            <div>
              <h3>Working directory</h3>
              <p>{resetMode === 'hard' ? 'Files match the reset commit. Later changes are gone.' : 'Files keep the removed commit changes.'}</p>
            </div>
          </div>

          {resetMode === 'hard' && (
            <div className="danger-warning">
              <AlertTriangle size={14} strokeWidth={2.2} /> This cannot be undone, and rewriting pushed history makes the remote diverge from teammates.
            </div>
          )}
        </section>

        <section className="history-panel safety-panel">
          <div className="panel-heading">
            <span className="stage-num">5</span>
            <h2>The Safety Matrix</h2>
          </div>

          <p className="stage-instruction">Now put it together: drag each command onto the situation where it's the right choice.</p>

          <div className="label-bank">
            {matrixLabels.map((label) => (
              <button
                key={label}
                draggable
                onDragStart={(event) => event.dataTransfer.setData('text/plain', label)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="matrix-table">
            {matrixTargets.map((target) => {
              const answer = matrixAnswers[target.id]
              return (
                <div
                  key={target.id}
                  className={`matrix-row ${answer === target.answer ? 'correct' : answer ? 'wrong' : ''}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, target.id)}
                >
                  <span>{target.situation}</span>
                  <strong>{answer || 'Drop command here'}</strong>
                </div>
              )
            })}
          </div>

          <div className="insight-callout">
            <strong>Key insight:</strong> revert adds to history. reset rewrites it. On shared branches,
            rewriting history breaks everyone else.
          </div>
          <div className={`matrix-score ${matrixDone ? 'complete' : ''}`}>
            {matrixDone ? <><Check size={14} strokeWidth={3} /> All matched — you've got it</> : `${correctCount} of ${matrixTargets.length} matched`}
          </div>
        </section>
      </main>
    </div>
  )
}

function Avatar({ name }) {
  return <span className="avatar-initial">{name.slice(0, 1)}</span>
}

function DiffPanel({ commit }) {
  return (
    <div className="diff-panel">
      <div className="diff-title">
        <strong>git diff {commit.hash}</strong>
        {commit.bad && <span>bad commit found</span>}
      </div>
      <pre>
        {commit.diff.removed.map((line) => <code className="removed" key={line}>{line}{'\n'}</code>)}
        {commit.diff.added.map((line) => <code className="added" key={line}>{line}{'\n'}</code>)}
      </pre>
    </div>
  )
}
