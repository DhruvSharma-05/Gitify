import React, { useState, useEffect } from 'react'
import PretextCanvas from './PretextCanvas.jsx'

const stashSeed = [
  { id: 0, name: 'stash@{0}', label: 'wip: payment form cleanup', files: ['Checkout.jsx', 'styles.css'] },
  { id: 1, name: 'stash@{1}', label: 'wip: debug coupon state', files: ['CouponBox.jsx'] }
]

const hotfixCommits = [
  { hash: 'b7a91c', message: 'Fix tax rounding', safe: true },
  { hash: 'c4f20e', message: 'Patch invoice export', safe: true },
  { hash: 'd82aa8', message: 'Refactor checkout state', conflict: true }
]

export default function StashCherryPickLesson({ onSuccess, setTerminalSyncListener }) {
  const [dirtyFiles, setDirtyFiles] = useState(['Checkout.jsx', 'styles.css'])
  const [stashes, setStashes] = useState(stashSeed)
  const [selectedStash, setSelectedStash] = useState(0)
  const [stashMessage, setStashMessage] = useState('wip: checkout experiment')
  const [branch, setBranch] = useState('feature/payments')
  const [appliedNote, setAppliedNote] = useState('Dirty work is still in your working directory.')
  const [picked, setPicked] = useState([])
  const [pickConflict, setPickConflict] = useState(false)

  const activeStash = stashes.find((stash) => stash.id === selectedStash) || stashes[0]
  const canSwitch = dirtyFiles.length === 0

  useEffect(() => {
    if (setTerminalSyncListener) {
      setTerminalSyncListener(() => (syncState) => {
        if (syncState.branch) setBranch(syncState.branch)
        if (syncState.files !== undefined) setDirtyFiles(syncState.files)
        if (syncState.stashes !== undefined) setStashes(syncState.stashes)
        if (syncState.picked !== undefined) setPicked(syncState.picked)
        setAppliedNote('✓ Synced workspace elements with global terminal console command.')
      })
    }
    return () => {
      if (setTerminalSyncListener) setTerminalSyncListener(null)
    }
  }, [setTerminalSyncListener])

  const verifyLessonState = () => {
    fetch('http://localhost:8000/api/exercises/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lesson_id: 5,
        state: {
          files: dirtyFiles,
          stashes: stashes,
          picked: picked,
          branch: branch
        }
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.verified) {
          setAppliedNote("✓ " + data.message)
          if (onSuccess) onSuccess()
        } else {
          setAppliedNote("✗ Verification failed: " + data.message)
        }
      })
      .catch(err => {
        console.warn("Backend verifier offline, validating locally:", err)
        // Fallback local validation:
        if (stashes.length > stashSeed.length && picked.includes('b7a91c')) {
          setAppliedNote("✓ Lesson successfully completed (offline)!")
          if (onSuccess) onSuccess()
        } else {
          setAppliedNote("✗ Offline validation: Please stash your uncommitted work and cherry-pick commit b7a91c first.")
        }
      })
  }

  const createStash = () => {
    if (dirtyFiles.length === 0) return
    const next = {
      id: Date.now(),
      name: `stash@{${stashes.length}}`,
      label: stashMessage || 'wip: unnamed changes',
      files: dirtyFiles
    }
    setStashes([next, ...stashes])
    setSelectedStash(next.id)
    setDirtyFiles([])
    setAppliedNote('Working directory is clean. You can switch branches safely.')
  }

  const applyStash = () => {
    if (!activeStash) return
    setDirtyFiles(activeStash.files)
    setAppliedNote('git stash apply restored the files and kept the stash in the list.')
  }

  const popStash = () => {
    if (!activeStash) return
    setDirtyFiles(activeStash.files)
    setStashes(stashes.filter((stash) => stash.id !== activeStash.id))
    setAppliedNote('git stash pop restored the files and removed that stash.')
  }

  const switchBranch = () => {
    if (!canSwitch) {
      setAppliedNote('Branch switch blocked: stash or commit your dirty work first.')
      return
    }
    setBranch(branch === 'feature/payments' ? 'hotfix/invoice' : 'feature/payments')
    setAppliedNote('Branch switched cleanly because the working directory is clean.')
  }

  const cherryPick = (commit) => {
    if (commit.conflict) {
      setPickConflict(true)
      return
    }
    if (!picked.includes(commit.hash)) {
      setPicked([...picked, commit.hash])
    }
    setPickConflict(false)
  }

  const pickRange = () => {
    setPicked(['b7a91c', 'c4f20e'])
    setPickConflict(true)
  }

  const resolvePickConflict = () => {
    setPickConflict(false)
    setPicked((items) => items.includes('d82aa8') ? items : [...items, 'd82aa8'])
  }

  return (
    <div className="stash-lesson">
      <header className="lesson-header" style={{ paddingBottom: '20px' }}>
        <span className="lesson-kicker">Lesson 5</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0 }}>Stash & Cherry-Pick</h1>
          <button 
            className="control-btn verify-btn" 
            onClick={verifyLessonState}
            style={{ 
              background: '#10b981', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              padding: '10px 20px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
            }}
          >
            Verify Exercise
          </button>
        </div>
        <p>Save work-in-progress without committing, then transplant individual commits across branches.</p>
      </header>
      <PretextCanvas scene="stashPick" height={220} />

      <main className="stash-layout">
        <section className="stash-panel workspace-panel">
          <div className="panel-heading">
            <span>Stash</span>
            <h2>Shelve dirty work instantly</h2>
          </div>
          <div className="branch-status">
            <strong>{branch}</strong>
            <span>{canSwitch ? 'clean' : 'dirty working directory'}</span>
          </div>
          <div className="dirty-files">
            <h3>Working directory</h3>
            {dirtyFiles.length === 0 ? (
              <div className="empty-worktree">No uncommitted changes</div>
            ) : (
              dirtyFiles.map((file) => <div className="dirty-file" key={file}>{file}</div>)
            )}
          </div>
          <label className="stash-name">
            Named stash
            <input value={stashMessage} onChange={(event) => setStashMessage(event.target.value)} />
          </label>
          <div className="stash-actions">
            <button onClick={createStash} disabled={dirtyFiles.length === 0}>git stash push -m</button>
            <button onClick={switchBranch}>Switch branch</button>
          </div>
          <div className="stash-note">{appliedNote}</div>
        </section>

        <section className="stash-panel stash-list-panel">
          <div className="panel-heading">
            <span>Stash List</span>
            <h2>Juggle multiple stashes</h2>
          </div>
          <div className="stash-list">
            {stashes.map((stash) => (
              <button
                key={stash.id}
                className={selectedStash === stash.id ? 'selected' : ''}
                onClick={() => setSelectedStash(stash.id)}
              >
                <strong>{stash.name}</strong>
                <span>{stash.label}</span>
              </button>
            ))}
          </div>
          <div className="stash-compare">
            <div>
              <h3>git stash apply</h3>
              <p>Restores the changes but keeps the stash for later reuse.</p>
            </div>
            <div>
              <h3>git stash pop</h3>
              <p>Restores the changes and removes that stash from the list.</p>
            </div>
          </div>
          <div className="stash-actions">
            <button onClick={applyStash} disabled={!activeStash}>git stash apply</button>
            <button onClick={popStash} disabled={!activeStash}>git stash pop</button>
          </div>
        </section>

        <section className="stash-panel cherry-panel">
          <div className="panel-heading">
            <span>Cherry-Pick</span>
            <h2>Transplant a single commit</h2>
          </div>
          <div className="pick-diagram">
            <BranchColumn title="hotfix/invoice" commits={hotfixCommits} picked={picked} onPick={cherryPick} />
            <div className="pick-arrow">git cherry-pick</div>
            <BranchColumn title="feature/payments" commits={hotfixCommits.filter((commit) => picked.includes(commit.hash))} picked={picked} target />
          </div>
          <div className="stash-actions">
            <button onClick={() => cherryPick(hotfixCommits[0])}>Pick b7a91c</button>
            <button onClick={pickRange}>Pick range b7a91c..d82aa8</button>
          </div>
        </section>

        <section className="stash-panel conflict-pick-panel">
          <div className="panel-heading">
            <span>During a Pick</span>
            <h2>Resolve conflicts, then continue</h2>
          </div>
          <div className={`pick-status ${pickConflict ? 'conflict' : ''}`}>
            {pickConflict ? 'Cherry-pick paused: checkout state conflicts with the target branch.' : 'No cherry-pick conflict right now.'}
          </div>
          <div className="pick-commands">
            <code>git cherry-pick &lt;hash&gt;</code>
            <code>git cherry-pick b7a91c..d82aa8</code>
            <code>git status</code>
            <code>git add Checkout.jsx</code>
            <code>git cherry-pick --continue</code>
          </div>
          <button className="resolve-pick" onClick={resolvePickConflict} disabled={!pickConflict}>
            Resolve and continue
          </button>
          <div className="insight-callout">
            <strong>Key insight:</strong> Stash protects unfinished work. Cherry-pick copies finished commits.
            One shelves your mess; the other moves one clean snapshot.
          </div>
        </section>
      </main>
    </div>
  )
}

function BranchColumn({ title, commits, picked, onPick, target }) {
  return (
    <div className={`pick-branch ${target ? 'target' : ''}`}>
      <h3>{title}</h3>
      {commits.length === 0 && <div className="empty-worktree">No picked commits yet</div>}
      {commits.map((commit) => (
        <button
          key={commit.hash}
          className={`pick-commit ${picked.includes(commit.hash) ? 'picked' : ''} ${commit.conflict ? 'conflict' : ''}`}
          onClick={() => onPick?.(commit)}
        >
          <code>{commit.hash}</code>
          <span>{commit.message}</span>
        </button>
      ))}
    </div>
  )
}
