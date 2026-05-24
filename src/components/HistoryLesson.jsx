import React, { useMemo, useState } from 'react'

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

export default function HistoryLesson() {
  const [selectedIndex, setSelectedIndex] = useState(4)
  const [headIndex, setHeadIndex] = useState(7)
  const [hasReverted, setHasReverted] = useState(false)
  const [resetIndex, setResetIndex] = useState(7)
  const [resetMode, setResetMode] = useState('mixed')
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

  const selected = commits[selectedIndex] || commits[4]
  const headCommit = commits[headIndex] || commits[commits.length - 1]
  const resetCommit = commits[Number(resetIndex)] || commits[commits.length - 1]
  const correctCount = matrixTargets.filter((target) => matrixAnswers[target.id] === target.answer).length

  const jumpToCommit = () => {
    setHeadIndex(selectedIndex)
  }

  const revertBadCommit = () => {
    setHasReverted(true)
    setHeadIndex(baseCommits.length)
    setSelectedIndex(baseCommits.length)
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

      <main className="history-layout">
        <section className="history-panel timeline-panel">
          <div className="panel-heading">
            <span>Stage 1</span>
            <h2>The Timeline</h2>
          </div>

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
                  <small><Avatar name={commit.author} /> {commit.author} · {commit.time}</small>
                </button>
              ))}
            </div>
          </div>

          <DiffPanel commit={selected} />
        </section>

        <section className="history-panel checkout-panel">
          <div className="panel-heading">
            <span>Stage 2</span>
            <h2>Detached HEAD</h2>
          </div>

          <div className="snapshot-grid">
            <div>
              <p>Click a commit, then jump to that snapshot. HEAD moves away from the branch tip.</p>
              <button className="history-action" onClick={jumpToCommit}>
                Jump to this commit
              </button>
            </div>
            <div className="working-snapshot">
              <h3>Working directory</h3>
              <span className="snapshot-hash">{headCommit.hash}</span>
              {headCommit.files.map((file) => <div className="snapshot-file" key={file}>{file}</div>)}
            </div>
          </div>

          {headIndex !== commits.length - 1 && (
            <div className="warning-badge" title="Detached HEAD means you are viewing a commit directly instead of working on a branch. New commits here can be hard to keep unless you create a branch.">
              You're in detached HEAD state
            </div>
          )}
        </section>

        <section className="history-panel revert-panel">
          <div className="panel-heading">
            <span>Stage 3</span>
            <h2>Safe Undo</h2>
          </div>

          <p>The production break came from <code>e17b90</code>. Revert adds a new commit that undoes it while keeping history intact.</p>
          <button className="history-action" onClick={revertBadCommit} disabled={hasReverted}>
            Revert this commit
          </button>
          <div className={`safe-badge ${hasReverted ? 'active' : ''}`}>
            Safe for shared branches
          </div>
        </section>

        <section className="history-panel reset-panel">
          <div className="panel-heading">
            <span>Stage 4</span>
            <h2>Dangerous Undo</h2>
          </div>

          <div className="reset-tabs">
            {['soft', 'mixed', 'hard'].map((mode) => (
              <button
                key={mode}
                className={resetMode === mode ? `selected mode-${mode}` : ''}
                onClick={() => setResetMode(mode)}
              >
                --{mode}{mode === 'hard' ? ' skull' : ''}
              </button>
            ))}
          </div>

          <label className="reset-slider">
            Reset pointer: <strong>{resetCommit.hash}</strong>
            <input
              type="range"
              min="0"
              max={baseCommits.length - 1}
              value={resetIndex}
              onChange={(event) => setResetIndex(event.target.value)}
            />
          </label>

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
              This cannot be undone. Remote history will diverge.
            </div>
          )}
        </section>

        <section className="history-panel safety-panel">
          <div className="panel-heading">
            <span>Stage 5</span>
            <h2>The Safety Matrix</h2>
          </div>

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
          <div className="matrix-score">{correctCount} of {matrixTargets.length} matched</div>
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
