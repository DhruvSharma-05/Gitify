import React, { useState, useEffect } from 'react'
import './FileInspector.css'
import { apiUrl } from '../api.js'

function computeLineDiff(original, modified) {
  const a = original.split('\n')
  const b = modified.split('\n')
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1])
  const result = []
  let i = 0, j = 0
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) { result.push({ type: 'context', text: a[i] }); i++; j++ }
    else if (j < n && (i >= m || dp[i+1][j] <= dp[i][j+1])) { result.push({ type: 'added', text: b[j] }); j++ }
    else { result.push({ type: 'removed', text: a[i] }); i++ }
  }
  return result
}

export default function FileInspector({ files = [], fileContents = {}, sessionId, lessonId, onFileEdit }) {
  const [selectedFile, setSelectedFile] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editBuffer, setEditBuffer] = useState('')
  const [showDiff, setShowDiff] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Auto-select the first file when files load, or prioritize config.js / index.js
  useEffect(() => {
    if (files.length > 0) {
      if (files.includes('config.js')) {
        setSelectedFile('config.js')
      } else if (files.includes('index.js')) {
        setSelectedFile('index.js')
      } else if (!files.includes(selectedFile)) {
        setSelectedFile(files[0])
      }
    } else {
      setSelectedFile('')
    }
    // Cancel any active edit if files reload
    setIsEditing(false)
    setSaveMsg('')
  }, [files])

  const content = selectedFile ? fileContents[selectedFile] || '// Empty file or no content' : ''

  const startEdit = () => {
    setEditBuffer(content)
    setIsEditing(true)
    setShowDiff(false)
    setSaveMsg('')
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setShowDiff(false)
    setSaveMsg('')
  }

  const saveEdit = async () => {
    if (!selectedFile) return
    setIsSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch(apiUrl('/api/terminal/write-file'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          lesson_id: lessonId,
          filename: selectedFile,
          content: editBuffer
        })
      })
      const data = await res.json()
      if (data.status === 'success') {
        setIsEditing(false)
        setSaveMsg('✓ Saved')
        if (onFileEdit) onFileEdit(selectedFile, editBuffer, data.sync_state)
        setTimeout(() => setSaveMsg(''), 3000)
      } else {
        setSaveMsg('✗ Save failed')
      }
    } catch (err) {
      console.warn('Backend offline, applying edit locally:', err)
      // Offline fallback: update through callback directly
      setIsEditing(false)
      setSaveMsg('✓ Saved (local)')
      if (onFileEdit) onFileEdit(selectedFile, editBuffer, null)
      setTimeout(() => setSaveMsg(''), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  // Split lines and identify conflict blocks for premium highlights
  const lines = content.split('\n')
  let conflictZone = null

  const renderedLines = lines.map((line, idx) => {
    const isConflictStart = line.startsWith('<<<<<<<')
    const isConflictMiddle = line.startsWith('=======')
    const isConflictEnd = line.startsWith('>>>>>>>')

    if (isConflictStart) conflictZone = 'ours'
    else if (isConflictMiddle) conflictZone = 'theirs'
    else if (isConflictEnd) conflictZone = null

    let lineClass = 'code-line-normal'
    if (isConflictStart) lineClass = 'conflict-marker ours-marker'
    else if (isConflictMiddle) lineClass = 'conflict-marker divider-marker'
    else if (isConflictEnd) lineClass = 'conflict-marker theirs-marker'
    else if (conflictZone === 'ours') lineClass = 'conflict-line ours-line'
    else if (conflictZone === 'theirs') lineClass = 'conflict-line theirs-line'

    return (
      <div key={idx} className={`code-line-row ${lineClass}`}>
        <span className="line-number">{idx + 1}</span>
        <span className="line-text">{line}</span>
      </div>
    )
  })

  return (
    <div className="file-inspector-panel glassmorphic">
      <div className="inspector-header">
        <span>📂 Live Workspace Files</span>
      </div>

      {files.length === 0 ? (
        <div className="empty-inspector">
          <p>No active files in the workspace. Initialize a repository or touch files to inspect contents.</p>
        </div>
      ) : (
        <>
          <div className="inspector-tabs">
            {files.map(file => (
              <button
                key={file}
                className={`tab-btn ${selectedFile === file ? 'active' : ''}`}
                onClick={() => { setSelectedFile(file); setIsEditing(false); setSaveMsg('') }}
              >
                📄 {file}
              </button>
            ))}
          </div>

          <div className="code-viewer-container">
            <div className="code-viewer-header">
              <span>{selectedFile}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {content.includes('<<<<<<<') && (
                  <span className="conflict-badge">⚠️ MERGE CONFLICT</span>
                )}
                {saveMsg && (
                  <span className={`save-status-msg ${saveMsg.startsWith('✓') ? 'save-ok' : 'save-err'}`}>
                    {saveMsg}
                  </span>
                )}
                {!isEditing ? (
                  <button
                    className="edit-toggle-btn"
                    onClick={startEdit}
                    title="Edit this file"
                    aria-label={`Edit ${selectedFile}`}
                  >
                    ✏️ Edit
                  </button>
                ) : (
                  <div className="edit-actions-bar">
                    <button
                      className={`diff-toggle-btn ${showDiff ? 'active' : ''}`}
                      onClick={() => setShowDiff(d => !d)}
                      aria-label="Toggle diff preview"
                      title="Preview changes"
                    >
                      {showDiff ? '✏️ Edit' : '± Diff'}
                    </button>
                    <button
                      className="save-btn"
                      onClick={saveEdit}
                      disabled={isSaving || showDiff}
                      aria-label="Save file changes"
                    >
                      {isSaving ? '⏳' : '💾 Save'}
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={cancelEdit}
                      aria-label="Cancel editing"
                    >
                      ✖ Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="code-pretext-wrapper">
              {isEditing && showDiff ? (
                <pre className="code-editor-pre diff-preview">
                  <code>
                    {computeLineDiff(content, editBuffer).map((entry, i) => (
                      <div
                        key={i}
                        className={`code-line-row diff-line-${entry.type}`}
                        style={{
                          background: entry.type === 'added' ? 'rgba(34,197,94,0.12)' : entry.type === 'removed' ? 'rgba(239,68,68,0.12)' : 'transparent',
                          color: entry.type === 'added' ? '#86efac' : entry.type === 'removed' ? '#fca5a5' : undefined
                        }}
                      >
                        <span className="line-number" style={{ color: entry.type === 'added' ? '#4ade80' : entry.type === 'removed' ? '#f87171' : undefined }}>
                          {entry.type === 'added' ? '+' : entry.type === 'removed' ? '-' : ' '}
                        </span>
                        <span className="line-text">{entry.text}</span>
                      </div>
                    ))}
                  </code>
                </pre>
              ) : isEditing ? (
                <textarea
                  className="edit-textarea"
                  value={editBuffer}
                  onChange={e => setEditBuffer(e.target.value)}
                  spellCheck={false}
                  aria-label={`Edit content of ${selectedFile}`}
                />
              ) : (
                <pre className="code-editor-pre">
                  <code>{renderedLines}</code>
                </pre>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
