import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'

const initialFiles = [
  { id: 1, name: 'index.js', status: 'working' },
  { id: 2, name: 'App.jsx', status: 'working' }
]

export default function Flow({ onSuccess, setTerminalSyncListener }) {
  const [files, setFiles] = useState(initialFiles)
  const [log, setLog] = useState([])

  const containerRef = useRef(null)
  const boardRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]
  const [layouts, setLayouts] = useState([])

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
    
    let observer
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(() => {
        updateLayouts()
      })
      observer.observe(containerRef.current)
      boardRefs.forEach(ref => {
        if (ref.current) observer.observe(ref.current)
      })
    }
    
    window.addEventListener('resize', updateLayouts)
    
    return () => {
      if (observer) {
        observer.disconnect()
      }
      window.removeEventListener('resize', updateLayouts)
    }
  }, [])

  // Sync listener setup
  useEffect(() => {
    if (setTerminalSyncListener) {
      setTerminalSyncListener(() => (syncState) => {
        if (!syncState) return
        
        const workspaceFilesList = syncState.files || []
        const stagedList = syncState.staged || []
        const unstagedList = syncState.unstaged || []
        const commits = syncState.commits_graph || []
        const pushedOffline = syncState.pushed_offline || false
        
        const hasPushedCommits = commits.some(c => 
          c.branches && c.branches.some(b => b.startsWith('origin/'))
        )
        
        setFiles(prev => {
          return workspaceFilesList.map(filename => {
            const existing = prev.find(f => f.name === filename)
            const id = existing ? existing.id : Math.random()
            
            let status = 'working'
            if (stagedList.includes(filename)) {
              status = 'staged'
            } else if (unstagedList.includes(filename)) {
              status = 'working'
            } else if (hasPushedCommits || pushedOffline) {
              status = 'pushed'
            } else if (commits.length > 0) {
              status = 'committed'
            } else {
              status = 'working'
            }
            
            return {
              id,
              name: filename,
              status
            }
          })
        })
      })
    }
    return () => {
      if (setTerminalSyncListener) setTerminalSyncListener(null)
    }
  }, [setTerminalSyncListener])

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
            minHeight={Math.max(200, 68 + groups.working.length * 52 + 20)}
          />
          <Board 
            title="Staging Area" 
            boardRef={boardRefs[1]} 
            isEmpty={groups.staged.length === 0} 
            className="board-staged" 
            minHeight={Math.max(200, 68 + groups.staged.length * 52 + 20)}
          />
          <Board 
            title="Local Repo" 
            boardRef={boardRefs[2]} 
            isEmpty={groups.committed.length === 0} 
            className="board-committed" 
            minHeight={Math.max(200, 68 + groups.committed.length * 52 + 20)}
          />
          <Board 
            title="Remote" 
            boardRef={boardRefs[3]} 
            isEmpty={groups.pushed.length === 0} 
            className="board-pushed" 
            minHeight={Math.max(200, 68 + groups.pushed.length * 52 + 20)}
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
                left: `${layout.left + 20}px`,
                top: `${layout.top + 68 + (f.idx * 52)}px`,
                width: `${layout.width - 40}px`,
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
