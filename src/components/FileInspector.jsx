import React, { useState, useEffect } from 'react'
import './FileInspector.css'

export default function FileInspector({ files = [], fileContents = {} }) {
  const [selectedFile, setSelectedFile] = useState('')

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
  }, [files])

  const content = selectedFile ? fileContents[selectedFile] || '// Empty file or no content' : ''

  // Split lines and identify conflict blocks for premium highlights
  const lines = content.split('\n')
  
  let conflictZone = null // 'ours', 'theirs', or null

  const renderedLines = lines.map((line, idx) => {
    const isConflictStart = line.startsWith('<<<<<<<')
    const isConflictMiddle = line.startsWith('=======')
    const isConflictEnd = line.startsWith('>>>>>>>')

    if (isConflictStart) {
      conflictZone = 'ours'
    } else if (isConflictMiddle) {
      conflictZone = 'theirs'
    } else if (isConflictEnd) {
      conflictZone = null
    }

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
                onClick={() => setSelectedFile(file)}
              >
                📄 {file}
              </button>
            ))}
          </div>

          <div className="code-viewer-container">
            <div className="code-viewer-header">
              <span>{selectedFile}</span>
              {content.includes('<<<<<<<') && (
                <span className="conflict-badge">⚠️ MERGE CONFLICT DETECTED</span>
              )}
            </div>
            <div className="code-pretext-wrapper">
              <pre className="code-editor-pre">
                <code>{renderedLines}</code>
              </pre>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
