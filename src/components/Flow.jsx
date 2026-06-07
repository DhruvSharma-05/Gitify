import React, { useState, useEffect } from 'react'

const initialFiles = [
  { id: 1, name: 'index.js', status: 'working' },
  { id: 2, name: 'App.jsx', status: 'working' }
]

export default function Flow({ setTerminalSyncListener, onSuccess }) {
  const [files, setFiles] = useState(initialFiles)
  const [log, setLog] = useState([])

  useEffect(() => {
    if (setTerminalSyncListener) {
      setTerminalSyncListener(() => (syncState) => {
        if (syncState.files_status) {
          const mapped = syncState.files_status.map((f, idx) => ({
            id: idx + 1,
            name: f.name,
            status: f.status
          }))
          setFiles(mapped)
          
          const changedStatuses = syncState.files_status.map(f => `${f.name}:${f.status}`).join(', ')
          addLog(`Terminal sync: files updated (${changedStatuses})`)
          
          const hasPushed = syncState.files_status.some(f => f.status === 'pushed')
          if (hasPushed && onSuccess) {
            onSuccess()
          }
        }
      })
    }
    return () => {
      if (setTerminalSyncListener) {
        setTerminalSyncListener(null)
      }
    }
  }, [setTerminalSyncListener, onSuccess])

  function addLog(text) {
    setLog(l => [text, ...l].slice(0, 8))
  }

  function modify() {
    const id = Math.random()
    const file = { id, name: `new-file-${String(id).slice(2, 6)}.js`, status: 'working' }
    setFiles(f => [file, ...f])
    addLog(`Edited ${file.name} (working directory)`)
  }

  function gitAdd() {
    setFiles(f => f.map(x => (x.status === 'working' ? { ...x, status: 'staged' } : x)))
    addLog('git add: files staged')
  }

  function gitCommit() {
    setFiles(f => f.map(x => (x.status === 'staged' ? { ...x, status: 'committed' } : x)))
    addLog('git commit: staged -> local repository')
  }

  function gitPush() {
    addLog('git push: pushing to remote...')
    setTimeout(() => {
      setFiles(f => f.map(x => (x.status === 'committed' ? { ...x, status: 'pushed' } : x)))
      addLog('Push complete: local -> remote')
    }, 900)
  }

  function reset() {
    setFiles(initialFiles)
    setLog([])
  }

  const groups = {
    working: files.filter(f => f.status === 'working'),
    staged: files.filter(f => f.status === 'staged'),
    committed: files.filter(f => f.status === 'committed'),
    pushed: files.filter(f => f.status === 'pushed')
  }

  return (
    <div className="flow">
      <div className="controls">
        <button onClick={modify}>Edit / Modify File</button>
        <button onClick={gitAdd}>git add</button>
        <button onClick={gitCommit}>git commit</button>
        <button onClick={gitPush}>git push</button>
        <button onClick={reset}>Reset</button>
      </div>

      <div className="boards">
        <Board title="Working Directory" files={groups.working} className="board-working" />
        <Board title="Staging Area" files={groups.staged} className="board-staged" />
        <Board title="Local Repo" files={groups.committed} className="board-committed" />
        <Board title="Remote" files={groups.pushed} className="board-pushed" />
      </div>

      <aside className="log">
        <h3>Activity</h3>
        <ul>
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

function Board({ title, files, className }) {
  return (
    <div className={`board ${className}`}>
      <h4>{title}</h4>
      <div className="fileList">
        {files.length === 0 && <div className="empty">—</div>}
        {files.map(f => (
          <div className={`file file-${f.status}`} key={f.id}>
            {f.name}
          </div>
        ))}
      </div>
    </div>
  )
}
