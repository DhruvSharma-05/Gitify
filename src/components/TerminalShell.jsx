import React, { useState, useEffect, useRef } from 'react'

export default function TerminalShell({ lessonId, onSyncState, onSuccess }) {
  const [history, setHistory] = useState([
    { type: 'system', text: 'Welcome to Gitify Interactive Console v0.1.0' },
    { type: 'system', text: 'Type real Git commands here to modify the visual workspace.' },
    { type: 'system', text: 'Try "git status", "git log", "git stash", or "ls". Type "clear" to empty console.' }
  ])
  const [inputValue, setInputValue] = useState('')
  const [cmdHistory, setCmdHistory] = useState([])
  const [historyPointer, setHistoryPointer] = useState(-1)
  const [sessionId, setSessionId] = useState(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [minimized, setMinimized] = useState(false)
  
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Initialize unique session ID
  useEffect(() => {
    let activeSession = localStorage.getItem("gitify_session_id")
    if (!activeSession) {
      activeSession = `session_${Math.random().toString(36).substring(2, 11)}`
      localStorage.setItem("gitify_session_id", activeSession)
    }
    setSessionId(activeSession)
  }, [])

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  const handleCommandSubmit = (e) => {
    e.preventDefault()
    const rawCmd = inputValue.trim()
    if (!rawCmd) return
    
    // Add to history lines
    setHistory(prev => [...prev, { type: 'input', text: rawCmd }])
    setCmdHistory(prev => [rawCmd, ...prev])
    setHistoryPointer(-1)
    setInputValue('')
    setIsExecuting(true)

    // Execute via FastAPI
    fetch('http://localhost:8000/api/terminal/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: rawCmd,
        session_id: sessionId,
        lesson_id: lessonId
      })
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        setIsExecuting(false)
        if (data.session_id) {
          setSessionId(data.session_id)
          localStorage.setItem("gitify_session_id", data.session_id)
        }

        if (data.output === 'CLEAR_CONSOLE') {
          setHistory([])
          return
        }

        // Print output
        setHistory(prev => [...prev, { 
          type: data.status === 'success' ? 'output' : 'error', 
          text: data.output || '(No output)' 
        }])

        // Show verification success
        if (data.verified) {
          setHistory(prev => [...prev, { 
            type: 'success', 
            text: `🎉 EXERCISE SOLVED: ${data.validation_message}` 
          }])
          if (onSuccess) onSuccess()
        }

        // Sync with React visualizer
        if (data.sync_state && onSyncState) {
          onSyncState(data.sync_state)
        }
      })
      .catch(err => {
        setIsExecuting(false)
        console.warn("Terminal server error:", err)
        setHistory(prev => [...prev, { 
          type: 'error', 
          text: 'Error: Failed to connect to Python backend server. Make sure FastAPI is running.' 
        }])
      })
  }

  // Handle command history up/down keypresses
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (cmdHistory.length === 0) return
      const nextPointer = historyPointer + 1
      if (nextPointer < cmdHistory.length) {
        setHistoryPointer(nextPointer)
        setInputValue(cmdHistory[nextPointer])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextPointer = historyPointer - 1
      if (nextPointer >= 0) {
        setHistoryPointer(nextPointer)
        setInputValue(cmdHistory[nextPointer])
      } else {
        setHistoryPointer(-1)
        setInputValue('')
      }
    }
  }

  const focusInput = () => {
    inputRef.current?.focus()
  }

  if (minimized) {
    return (
      <div 
        className="terminal-shell minimized" 
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '8px 16px',
          color: '#10b981',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          zIndex: 9999
        }}
      >
        <span>📟 Open Terminal Console</span>
      </div>
    )
  }

  return (
    <div 
      className="terminal-shell" 
      onClick={focusInput}
      style={{
        marginTop: '30px',
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        height: '280px',
        fontFamily: "'Fira Code', 'Consolas', monospace",
        fontSize: '0.85rem'
      }}
    >
      {/* Top bar */}
      <div 
        className="terminal-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          paddingBottom: '8px',
          marginBottom: '10px',
          color: '#8b949e',
          fontSize: '0.8rem',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }}></span>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          <span style={{ marginLeft: '6px', fontWeight: '500' }}>gitify@sandbox:~/workspace</span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation()
            setMinimized(true)
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#8b949e',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          _
        </button>
      </div>

      {/* Terminal History */}
      <div 
        className="terminal-history"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          paddingRight: '6px',
          marginBottom: '8px'
        }}
      >
        {history.map((line, idx) => (
          <div key={idx} className={`terminal-line line-${line.type}`} style={{ whiteSpace: 'pre-wrap' }}>
            {line.type === 'input' && (
              <span style={{ color: '#10b981', marginRight: '6px' }}>student@gitify:~$</span>
            )}
            <span style={{
              color: line.type === 'error' ? '#fecaca' : 
                     line.type === 'success' ? '#6ee7b7' : 
                     line.type === 'input' ? '#f0f6fc' : '#8b949e'
            }}>
              {line.text}
            </span>
          </div>
        ))}
        {isExecuting && (
          <div style={{ color: '#8b949e', fontStyle: 'italic' }}>Running subprocess command...</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Prompt */}
      <form 
        onSubmit={handleCommandSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.2)',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.03)'
        }}
      >
        <span style={{ color: '#10b981', marginRight: '8px', userSelect: 'none' }}>student@gitify:~$</span>
        <input 
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Type command (e.g. "git status")...'
          disabled={isExecuting}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#f0f6fc',
            fontFamily: 'inherit',
            fontSize: 'inherit'
          }}
        />
      </form>
    </div>
  )
}
