import React, { useMemo, useState, useEffect } from 'react'
import PretextCanvas from './PretextCanvas.jsx'

const resolutionText = {
  ours: '  theme: "dark"',
  theirs: '  theme: "light"',
  manual: '  theme: "system"'
}

const resolutionLabels = {
  ours: 'Keep Ours (HEAD)',
  theirs: 'Keep Theirs',
  manual: 'Edit Manually'
}

export default function MergeConflictsLesson({ onSuccess, setTerminalSyncListener }) {
  const [stage, setStage] = useState(0)
  const [resolution, setResolution] = useState(null)
  const [manualValue, setManualValue] = useState('  theme: "system"')
  const [isAdded, setIsAdded] = useState(false)
  const [isCommitted, setIsCommitted] = useState(false)
  const [previewChoice, setPreviewChoice] = useState('theirs')

  useEffect(() => {
    if (setTerminalSyncListener) {
      setTerminalSyncListener(() => (syncState) => {
        if (syncState.picked && syncState.picked.length > 1) {
          setIsCommitted(true)
          setIsAdded(true)
          setResolution('ours')
          setStage(2)
        }
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
        lesson_id: 3,
        state: {
          isCommitted: isCommitted,
          resolution: resolution
        }
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.verified) {
          alert("✓ " + data.message)
          if (onSuccess) onSuccess()
        } else {
          alert("✗ Verification failed: " + data.message)
        }
      })
      .catch(err => {
        console.warn("Backend verifier offline, validating locally:", err)
        if (isCommitted && resolution) {
          alert("✓ Lesson successfully completed (offline)!")
          if (onSuccess) onSuccess()
        } else {
          alert("✗ Offline validation: Please resolve the merge conflict and commit it first.")
        }
      })
  }

  const resolvedLine = useMemo(() => {
    if (resolution === 'manual') return manualValue || resolutionText.manual
    return resolution ? resolutionText[resolution] : ''
  }, [manualValue, resolution])

  const resetConflict = () => {
    setStage(0)
    setResolution(null)
    setManualValue('  theme: "system"')
    setIsAdded(false)
    setIsCommitted(false)
    setPreviewChoice('theirs')
  }

  const triggerConflict = () => {
    setStage(1)
    setResolution(null)
    setIsAdded(false)
    setIsCommitted(false)
  }

  const chooseResolution = (choice) => {
    setResolution(choice)
    setIsAdded(false)
    setIsCommitted(false)
    setStage(1)
  }

  const markResolved = () => {
    if (!resolution) return
    setIsAdded(true)
    setStage(2)
  }

  const completeMerge = () => {
    if (!isAdded) return
    setIsCommitted(true)
    setStage(2)
  }

  return (
    <div className="merge-lesson">
      <header className="lesson-header">
        <span className="lesson-kicker">Lesson 3</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0 }}>Merge Conflicts</h1>
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
              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
            }}
          >
            Verify Exercise
          </button>
        </div>
        <p>When two branches edit the same part of the same file, Git asks you to choose what survives.</p>
      </header>
      <PretextCanvas scene="conflictDiff" height={220} />

      <main className="merge-layout">
        <section className="merge-panel setup-panel">
          <div className="panel-heading">
            <span>Stage 1</span>
            <h2>Setup</h2>
          </div>
          <p>
            Alex worked on <code>feature/auth</code>. Sam worked on <code>feature/ui</code>.
            Both touched <code>config.js</code> line 7.
          </p>

          <div className={`branch-race ${stage > 0 ? 'conflict-active' : ''}`}>
            <BranchLane name="main" commits={['base config']} tone="main" />
            <BranchLane name="feature/auth" commits={['auth config', 'theme: dark']} tone="auth" hot />
            <BranchLane name="feature/ui" commits={['ui polish', 'theme: light']} tone="ui" hot />
          </div>

          <button className="primary-action" onClick={triggerConflict}>
            Merge into main
          </button>
        </section>

        <section className="merge-panel conflict-panel">
          <div className="panel-heading">
            <span>Stage 2</span>
            <h2>Conflict Zone</h2>
          </div>

          <div className="status-strip">
            <strong>git status</strong>
            <span>{stage === 0 ? 'Ready to merge' : resolution ? 'config.js resolved in editor' : 'config.js has conflicts'}</span>
          </div>

          <div className="conflict-editor">
            <div className="editor-topbar">
              <span>config.js</span>
              <span>{resolution ? 'resolved' : stage > 0 ? 'conflicted' : 'clean'}</span>
            </div>
            <pre>
              <code>{renderCode(stage, resolution, resolvedLine)}</code>
            </pre>
          </div>

          <div className="resolution-grid">
            <button
              className={resolution === 'ours' ? 'selected' : ''}
              disabled={stage === 0}
              onClick={() => chooseResolution('ours')}
            >
              <strong>Keep Ours (HEAD)</strong>
              <span>Use Alex's dark theme line.</span>
            </button>
            <button
              className={resolution === 'theirs' ? 'selected' : ''}
              disabled={stage === 0}
              onClick={() => chooseResolution('theirs')}
            >
              <strong>Keep Theirs</strong>
              <span>Use Sam's light theme line.</span>
            </button>
            <button
              className={resolution === 'manual' ? 'selected' : ''}
              disabled={stage === 0}
              onClick={() => chooseResolution('manual')}
            >
              <strong>Edit Manually</strong>
              <span>Write a custom answer.</span>
            </button>
          </div>

          {resolution === 'manual' && (
            <label className="manual-editor">
              Custom resolution
              <input
                value={manualValue}
                onChange={(event) => setManualValue(event.target.value)}
                placeholder='  theme: "system"'
              />
            </label>
          )}
        </section>

        <section className="merge-panel resolution-panel">
          <div className="panel-heading">
            <span>Stage 3</span>
            <h2>Resolution & Merge</h2>
          </div>

          <div className="command-steps">
            <CommandStep command="git merge feature/ui" complete={stage > 0} active={stage === 1 && !resolution} />
            <CommandStep command="git status" complete={stage > 0} active={stage === 1 && !isAdded} />
            <CommandStep command="git add config.js" complete={isAdded} active={Boolean(resolution) && !isAdded} />
            <CommandStep command="git commit" complete={isCommitted} active={isAdded && !isCommitted} />
          </div>

          <div className={`merge-result ${isCommitted ? 'merged' : ''}`}>
            <div className="main-line">
              <span>base</span>
              <span>Alex auth</span>
              {isCommitted && <span className="merge-commit">merge commit</span>}
            </div>
            <div className="incoming-line">
              <span>Sam UI</span>
            </div>
          </div>

          <div className="action-row">
            <button onClick={markResolved} disabled={!resolution || isAdded}>
              git add
            </button>
            <button onClick={completeMerge} disabled={!isAdded || isCommitted}>
              git commit
            </button>
            <button onClick={resetConflict}>
              Restart
            </button>
          </div>
        </section>

        <section className="merge-panel explorer-panel">
          <div className="panel-heading">
            <span>Stage 4</span>
            <h2>What If Explorer</h2>
          </div>

          <div className="toggle-row">
            {['ours', 'theirs', 'manual'].map((choice) => (
              <button
                key={choice}
                className={previewChoice === choice ? 'selected' : ''}
                onClick={() => setPreviewChoice(choice)}
              >
                {resolutionLabels[choice]}
              </button>
            ))}
          </div>

          <div className="preview-box">
            <span>Alternate outcome</span>
            <code>{previewChoice === 'manual' ? resolutionText.manual : resolutionText[previewChoice]}</code>
          </div>

          <div className="insight-callout">
            <strong>Key insight:</strong> Conflicts are not Git failing. They are Git asking you a
            question it cannot answer alone.
          </div>
        </section>
      </main>
    </div>
  )
}

function BranchLane({ name, commits, tone, hot }) {
  return (
    <div className={`branch-lane lane-${tone} ${hot ? 'shared-file' : ''}`}>
      <div className="branch-name">{name}</div>
      <div className="commit-row">
        {commits.map((commit) => (
          <div className="mini-commit" key={commit}>
            <span></span>
            <small>{commit}</small>
          </div>
        ))}
      </div>
      {hot && <div className="file-touch">config.js line 7</div>}
    </div>
  )
}

function CommandStep({ command, complete, active }) {
  return (
    <div className={`command-step ${complete ? 'complete' : ''} ${active ? 'active' : ''}`}>
      <span>{complete ? 'done' : active ? 'now' : 'next'}</span>
      <code>{command}</code>
    </div>
  )
}

function renderCode(stage, resolution, resolvedLine) {
  if (stage === 0) {
    return `export const config = {
  api: "/v1",
  retries: 3,
  theme: "dark"
}`
  }

  if (resolution) {
    return `export const config = {
  api: "/v1",
  retries: 3,
${resolvedLine}
}`
  }

  return `export const config = {
  api: "/v1",
  retries: 3,
<<<<<<< HEAD
  theme: "dark"
=======
  theme: "light"
>>>>>>> feature/ui
}`
}
