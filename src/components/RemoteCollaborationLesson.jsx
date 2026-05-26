import React, { useState } from 'react'
import PretextCanvas from './PretextCanvas.jsx'

const team = [
  { name: 'Alex', branch: 'feature/auth', commits: ['login form', 'token refresh'], color: '#3b82f6' },
  { name: 'Sam', branch: 'feature/ui', commits: ['nav polish', 'empty state'], color: '#10b981' },
  { name: 'Priya', branch: 'feature/api', commits: ['endpoint cache', 'retry logic'], color: '#ec4899' }
]

const reviewComments = [
  { author: 'Sam', text: 'Can we rename this helper before merging?' },
  { author: 'Priya', text: 'Looks good after the null check.' }
]

export default function RemoteCollaborationLesson() {
  const [remoteSeen, setRemoteSeen] = useState(false)
  const [workingUpdated, setWorkingUpdated] = useState(false)
  const [trackingSynced, setTrackingSynced] = useState(false)
  const [reviewState, setReviewState] = useState('waiting')
  const [pushState, setPushState] = useState('ready')

  const drift = trackingSynced ? 'up to date' : '2 commits behind, 1 ahead'
  const canMerge = reviewState === 'approved'

  const runFetch = () => {
    setRemoteSeen(true)
    setWorkingUpdated(false)
  }

  const runPull = () => {
    setRemoteSeen(true)
    setWorkingUpdated(true)
    setTrackingSynced(true)
  }

  const rejectPush = () => {
    setPushState('rejected')
  }

  const rebaseAndPush = () => {
    setPushState('rebased')
    setTimeout(() => setPushState('pushed'), 450)
  }

  return (
    <div className="remote-lesson">
      <header className="lesson-header">
        <span className="lesson-kicker">Lesson 6</span>
        <h1>Remote Collaboration</h1>
        <p>Git is local. GitHub is shared. Teamwork means syncing, reviewing, and pushing without stepping on each other.</p>
      </header>
      <PretextCanvas scene="remotePackets" height={180} />

      <main className="remote-layout">
        <section className="remote-panel team-panel">
          <div className="panel-heading">
            <span>Team Setup</span>
            <h2>Three people, three branches</h2>
          </div>
          <div className="team-grid">
            {team.map((person) => (
              <div className="teammate-card" key={person.name} style={{ '--person-color': person.color }}>
                <div className="avatar-large">{person.name[0]}</div>
                <h3>{person.name}</h3>
                <code>{person.branch}</code>
                {person.commits.map((commit) => <span key={commit}>{commit}</span>)}
              </div>
            ))}
          </div>
        </section>

        <section className="remote-panel fetch-panel">
          <div className="panel-heading">
            <span>Pull vs Fetch</span>
            <h2>Feel the difference</h2>
          </div>
          <div className="remote-actions">
            <button onClick={runFetch}>git fetch</button>
            <button onClick={runPull}>git pull</button>
          </div>
          <div className="sync-diagram">
            <RepoBox title="origin/main" items={remoteSeen ? ['Sam: empty state', 'Priya: retry logic'] : ['last known remote']} active={remoteSeen} />
            <div className={workingUpdated ? 'sync-arrow merged' : 'sync-arrow'}>{workingUpdated ? 'fetch + merge' : 'fetch only'}</div>
            <RepoBox title="your files" items={workingUpdated ? ['local files updated', 'new commits merged'] : ['unchanged working directory']} active={workingUpdated} />
          </div>
          <div className="remote-note">
            {workingUpdated
              ? 'git pull fetched remote commits and merged them into your current branch.'
              : remoteSeen
                ? 'git fetch updated your remote-tracking branch, but your files did not change.'
                : 'Choose fetch or pull to see how much Git touches.'}
          </div>
        </section>

        <section className="remote-panel tracking-panel">
          <div className="panel-heading">
            <span>Upstream Tracking</span>
            <h2>Local branch linked to remote</h2>
          </div>
          <div className="tracking-visual">
            <div className="branch-pill local">feature/auth</div>
            <div className={trackingSynced ? 'tracking-line synced' : 'tracking-line'}></div>
            <div className="branch-pill remote">origin/feature/auth</div>
          </div>
          <div className={`drift-badge ${trackingSynced ? 'synced' : ''}`}>{drift}</div>
          <button className="remote-full-button" onClick={runPull}>Sync tracking branch</button>
          <code className="remote-command">git remote -v</code>
        </section>

        <section className="remote-panel pr-panel">
          <div className="panel-heading">
            <span>Pull Requests</span>
            <h2>A conversation over a diff</h2>
          </div>
          <div className="pr-shell">
            <div className="pr-diff">
              <strong>feature/auth into main</strong>
              <code className="removed">- if (!user) return null</code>
              <code className="added">+ if (!user) redirectToLogin()</code>
              <code className="added">+ refreshTokenBeforeExpiry()</code>
            </div>
            <div className="review-thread">
              {reviewComments.map((comment) => (
                <div key={comment.text}><strong>{comment.author}</strong>{comment.text}</div>
              ))}
            </div>
          </div>
          <div className="remote-actions">
            <button onClick={() => setReviewState('approved')}>Approve</button>
            <button onClick={() => setReviewState('changes')}>Request Changes</button>
            <button disabled={!canMerge} onClick={() => setReviewState('merged')}>Merge PR</button>
          </div>
          <div className={`review-status status-${reviewState}`}>{reviewCopy(reviewState)}</div>
        </section>

        <section className="remote-panel fork-panel">
          <div className="panel-heading">
            <span>Fork vs Clone</span>
            <h2>GitHub copy, local copy</h2>
          </div>
          <div className="fork-diagram">
            <DiagramNode title="Original repo" subtitle="github.com/team/app" />
            <span>fork</span>
            <DiagramNode title="Your fork" subtitle="github.com/you/app" />
            <span>clone</span>
            <DiagramNode title="Local clone" subtitle="on your machine" />
          </div>
        </section>

        <section className="remote-panel push-panel">
          <div className="panel-heading">
            <span>Conflicts on Push</span>
            <h2>Someone pushed first</h2>
          </div>
          <div className={`push-terminal push-${pushState}`}>
            <code>$ git push</code>
            <span>{pushMessage(pushState)}</span>
          </div>
          <div className="remote-actions">
            <button onClick={rejectPush}>Try push</button>
            <button disabled={pushState !== 'rejected'} onClick={rebaseAndPush}>git pull --rebase</button>
            <button disabled={pushState !== 'rebased' && pushState !== 'pushed'} onClick={() => setPushState('pushed')}>Push again</button>
          </div>
          <div className="insight-callout">
            <strong>Key insight:</strong> git pull is just git fetch + git merge. Knowing that makes the surprises make sense.
          </div>
        </section>
      </main>
    </div>
  )
}

function RepoBox({ title, items, active }) {
  return (
    <div className={`repo-box ${active ? 'active' : ''}`}>
      <h3>{title}</h3>
      {items.map((item) => <span key={item}>{item}</span>)}
    </div>
  )
}

function DiagramNode({ title, subtitle }) {
  return (
    <div className="diagram-node">
      <strong>{title}</strong>
      <small>{subtitle}</small>
    </div>
  )
}

function reviewCopy(state) {
  if (state === 'approved') return 'Approved. The merge button is now available.'
  if (state === 'changes') return 'Changes requested. The branch needs another commit before merge.'
  if (state === 'merged') return 'Merged into main with a merge commit.'
  return 'Waiting for review.'
}

function pushMessage(state) {
  if (state === 'rejected') return 'rejected: remote contains work that you do not have locally.'
  if (state === 'rebased') return 'rebased local commits on top of origin/main.'
  if (state === 'pushed') return 'push accepted: remote branch updated.'
  return 'ready to push your local branch.'
}
