import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Target, Check, Pencil, Plus, Save, Upload, RotateCcw } from 'lucide-react'
import { useToast } from './Toast.jsx'

const initialFiles = [
  { id: 1, name: 'index.js', status: 'working' },
  { id: 2, name: 'App.jsx', status: 'working' }
]

const boardCaptions = {
  working: 'Changes on your computer, not saved to Git yet',
  staged: 'Files you’ve marked for the next save',
  committed: 'Saved snapshots, stored on your machine',
  pushed: 'Published to GitHub for your team',
}

export default function Flow({ onSuccess, setTerminalSyncListener }) {
  const toast = useToast()
  const [files, setFiles] = useState(initialFiles)
  const [log, setLog] = useState([])
  const [reached, setReached] = useState({ stage: false, commit: false, push: false })
  const celebratedRef = useRef(false)

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
    setReached({ stage: false, commit: false, push: false })
    celebratedRef.current = false
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

  // Track furthest stage reached (works for both button + terminal-driven paths)
  // and celebrate the first time a file reaches the remote.
  useEffect(() => {
    const anyStaged = files.some(f => f.status === 'staged')
    const anyCommitted = files.some(f => f.status === 'committed')
    const anyPushed = files.some(f => f.status === 'pushed')
    setReached(prev => ({
      stage: prev.stage || anyStaged || anyCommitted || anyPushed,
      commit: prev.commit || anyCommitted || anyPushed,
      push: prev.push || anyPushed,
    }))
    if (anyPushed && !celebratedRef.current) {
      celebratedRef.current = true
      toast.success('Your file traveled Working → Staging → Local → GitHub — that\'s the whole Git workflow!', { title: 'Pushed to GitHub' })
    }
  }, [files, toast])

  // Which step should the user take next? Drives the pulsing highlight.
  const hasWorking = groups.working.length > 0
  const hasStaged = groups.staged.length > 0
  const hasCommitted = groups.committed.length > 0
  const nextAction = hasWorking ? 'add' : hasStaged ? 'commit' : hasCommitted ? 'push' : 'edit'

  const objectives = [
    { id: 'stage', label: 'Stage your changes — git add', done: reached.stage },
    { id: 'commit', label: 'Save a snapshot — git commit', done: reached.commit },
    { id: 'push', label: 'Publish to GitHub — git push', done: reached.push },
  ]

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
      {/* Scenario + live objectives so the user always knows the goal */}
      <div className="flow-mission history-mission">
        <div className="mission-text">
          <div className="mission-tag"><Target size={15} strokeWidth={2.2} /> Your goal</div>
          <p>
            These files start in your <strong>Working Directory</strong> (your computer).
            Move them step-by-step all the way to <strong>GitHub</strong> using the buttons below.
            Follow the <span className="glow-hint">glowing</span> button at each step.
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

      <div className="controls">
        <button className={nextAction === 'edit' ? 'is-next' : ''} onClick={modify}>
          <Pencil size={15} strokeWidth={2} /> Edit / Modify File
        </button>
        <button className={nextAction === 'add' ? 'is-next' : ''} onClick={gitAdd} disabled={!hasWorking}>
          <Plus size={15} strokeWidth={2.4} /> git add
        </button>
        <button className={nextAction === 'commit' ? 'is-next' : ''} onClick={gitCommit} disabled={!hasStaged}>
          <Save size={15} strokeWidth={2} /> git commit
        </button>
        <button className={nextAction === 'push' ? 'is-next' : ''} onClick={gitPush} disabled={!hasCommitted}>
          <Upload size={15} strokeWidth={2} /> git push
        </button>
        <button className="flow-reset" onClick={reset}>
          <RotateCcw size={14} strokeWidth={2} /> Reset
        </button>
      </div>

      <div className="boards-container" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
        <div className="boards">
          <Board
            title="Working Directory"
            caption={boardCaptions.working}
            count={groups.working.length}
            boardRef={boardRefs[0]}
            isEmpty={groups.working.length === 0}
            className="board-working"
            minHeight={Math.max(200, 96 + groups.working.length * 52 + 20)}
          />
          <Board
            title="Staging Area"
            caption={boardCaptions.staged}
            count={groups.staged.length}
            boardRef={boardRefs[1]}
            isEmpty={groups.staged.length === 0}
            className="board-staged"
            minHeight={Math.max(200, 96 + groups.staged.length * 52 + 20)}
          />
          <Board
            title="Local Repo"
            caption={boardCaptions.committed}
            count={groups.committed.length}
            boardRef={boardRefs[2]}
            isEmpty={groups.committed.length === 0}
            className="board-committed"
            minHeight={Math.max(200, 96 + groups.committed.length * 52 + 20)}
          />
          <Board
            title="Remote"
            caption={boardCaptions.pushed}
            count={groups.pushed.length}
            boardRef={boardRefs[3]}
            isEmpty={groups.pushed.length === 0}
            className={`board-pushed ${groups.pushed.length > 0 ? 'celebrate' : ''}`}
            minHeight={Math.max(200, 96 + groups.pushed.length * 52 + 20)}
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
                top: `${layout.top + 96 + (f.idx * 52)}px`,
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

function Board({ title, caption, count, boardRef, isEmpty, className, minHeight }) {
  return (
    <div
      className={`board ${className}`}
      ref={boardRef}
      style={{
        minHeight: `${minHeight}px`,
        transition: 'min-height 0.4s ease'
      }}
    >
      <div className="board-head">
        <h4>{title}</h4>
        <span className="board-count">{count}</span>
      </div>
      <p className="board-caption">{caption}</p>
      <div className="fileList">
        {isEmpty && <div className="empty">No files here yet</div>}
      </div>
    </div>
  )
}
