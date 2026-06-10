import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'

const initialFiles = [
  { id: 1, name: 'index.js', status: 'working' },
  { id: 2, name: 'App.jsx', status: 'working' }
]

export default function Flow({ setTerminalSyncListener, onSuccess }) {
  const [files, setFiles] = useState(initialFiles)
  const [log, setLog] = useState([])

  const containerRef = useRef(null)
  const boardRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]
  const [layouts, setLayouts] = useState([])

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
      setFiles(f => {
        const nextFiles = f.map(x => (x.status === 'committed' ? { ...x, status: 'pushed' } : x))
        if (nextFiles.some(x => x.status === 'pushed')) {
          onSuccess?.()
        }
        return nextFiles
      })
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

  const updateLayouts = () => {
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const newLayouts = boardRefs.map(ref => {
      if (!ref.current) return null
      const rect = ref.current.getBoundingClientRect()
      return {
        left: rect.left - containerRect.left,
        top: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height
      }
    })
    setLayouts(newLayouts)
  }

  useLayoutEffect(() => {
    updateLayouts()
    window.addEventListener('resize', updateLayouts)
    return () => window.removeEventListener('resize', updateLayouts)
  }, [])



  // Trigger layout updates on file list changes (timeout ensures DOM has adjusted)
  useEffect(() => {
    const timer = setTimeout(updateLayouts, 50)
    return () => clearTimeout(timer)
  }, [files])

  const colIndices = { working: 0, staged: 1, committed: 2, pushed: 3 }
  const counts = { working: 0, staged: 0, committed: 0, pushed: 0 }
  const positionedFiles = files.map(file => {
    const colIndex = colIndices[file.status]
    const idx = counts[file.status]
    counts[file.status] += 1
    return {
      ...file,
      colIndex,
      idx
    }
  })

  return (
    <div className="flow">
      <div className="controls">
        <button onClick={modify}>Edit / Modify File</button>
        <button onClick={gitAdd}>git add</button>
        <button onClick={gitCommit}>git commit</button>
        <button onClick={gitPush}>git push</button>
        <button onClick={reset}>Reset</button>
      </div>

      <div className="boards-container" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
        <div className="boards">
          <Board 
            title="Working Directory" 
            boardRef={boardRefs[0]} 
            isEmpty={groups.working.length === 0} 
            className="board-working" 
            minHeight={Math.max(200, 52 + groups.working.length * 52 + 12)}
          />
          <Board 
            title="Staging Area" 
            boardRef={boardRefs[1]} 
            isEmpty={groups.staged.length === 0} 
            className="board-staged" 
            minHeight={Math.max(200, 52 + groups.staged.length * 52 + 12)}
          />
          <Board 
            title="Local Repo" 
            boardRef={boardRefs[2]} 
            isEmpty={groups.committed.length === 0} 
            className="board-committed" 
            minHeight={Math.max(200, 52 + groups.committed.length * 52 + 12)}
          />
          <Board 
            title="Remote" 
            boardRef={boardRefs[3]} 
            isEmpty={groups.pushed.length === 0} 
            className="board-pushed" 
            minHeight={Math.max(200, 52 + groups.pushed.length * 52 + 12)}
          />
        </div>

        {/* Floating files layer */}
        {layouts.length === 4 && positionedFiles.map(f => {
          const layout = layouts[f.colIndex]
          if (!layout) return null
          
          return (
            <div 
              className={`file file-${f.status}`} 
              key={f.id}
              style={{
                position: 'absolute',
                left: `${layout.left + 14}px`,
                top: `${layout.top + 52 + (f.idx * 52)}px`,
                width: `${layout.width - 28}px`,
                transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
                zIndex: 10,
                pointerEvents: 'auto'
              }}
            >
              {f.name}
            </div>
          )
        })}
      </div>

      <aside className="log" style={{ marginTop: '24px' }}>
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

function Board({ title, boardRef, isEmpty, className, minHeight }) {
  return (
    <div 
      className={`board ${className}`} 
      ref={boardRef} 
      style={{ 
        minHeight: `${minHeight}px`,
        transition: 'min-height 0.4s ease'
      }}
    >
      <h4>{title}</h4>
      <div className="fileList">
        {isEmpty && <div className="empty">—</div>}
      </div>
    </div>
  )
}
