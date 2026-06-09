import React, { useState, useEffect, useRef } from 'react'
import { apiUrl } from '../api.js'

// Levenshtein distance matcher for typos suggestion
function getLevenshteinDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,    // deletion
          matrix[i][j - 1] + 1,    // insertion
          matrix[i - 1][j - 1] + 1 // substitution
        )
      }
    }
  }
  return matrix[a.length][b.length]
}

function getGitSuggestion(cmd) {
  const dictionary = ['status', 'log', 'add', 'commit', 'checkout', 'branch', 'merge', 'stash', 'rebase', 'pull', 'push', 'remote']
  let bestMatch = null
  let minDistance = 3 // Suggest only if distance is <= 2
  
  for (const item of dictionary) {
    const dist = getLevenshteinDistance(cmd, item)
    if (dist < minDistance) {
      minDistance = dist
      bestMatch = item
    }
  }
  return bestMatch
}

export default function TerminalShell({ lessonId, onSyncState, onSuccess, resetTrigger }) {
  const [pwd, setPwd] = useState('')
  const [branch, setBranch] = useState('main')
  const [history, setHistory] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [cmdHistory, setCmdHistory] = useState([])
  const [historyPointer, setHistoryPointer] = useState(-1)
  const [sessionId, setSessionId] = useState(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [minimized, setMinimized] = useState(false)
  
  // Local caches for autocompletion
  const [files, setFiles] = useState([])
  const [branches, setBranches] = useState(['main'])

  const historyRef = useRef(null)
  const inputRef = useRef(null)

  // Initialize unique session ID
  useEffect(() => {
    let activeSession = localStorage.getItem("gitify_session_id")
    if (!activeSession || activeSession === "null" || activeSession === "undefined") {
      activeSession = `session_${Math.random().toString(36).substring(2, 11)}`
      localStorage.setItem("gitify_session_id", activeSession)
    }
    setSessionId(activeSession)
  }, [])

  // Handle lesson change or reset trigger
  useEffect(() => {
    setHistory([
      { type: 'system', text: `📟 Welcome to Gitify Sandbox Console - Lesson ${lessonId}` },
      { type: 'system', text: 'Type Git commands to solve the exercise tasks in real time.' },
      { type: 'system', text: 'Try "git status", "git log", "git stash", or "ls". Type "clear" to empty console. Hit [Tab] to autocomplete!' }
    ])
    setPwd('')
    setBranch('main')
    setFiles([])
    setBranches(['main'])
  }, [lessonId, resetTrigger])

  // Auto scroll to bottom of the terminal container (without scrolling the main window)
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [history])

  const handleCommandSubmit = (e) => {
    e.preventDefault()
    const rawCmd = inputValue.trim()
    if (!rawCmd) return
    
    // Construct dynamic prompt prefix for history print
    const promptPath = pwd ? `/${pwd.replace(/\\/g, '/')}` : ''
    const promptBranch = branch ? ` (${branch})` : ''
    const fullPromptPrefix = `student@gitify:~/workspace${promptPath}${promptBranch}$ `

    // Add to history lines
    setHistory(prev => [...prev, { type: 'input', text: `${fullPromptPrefix}${rawCmd}` }])
    setCmdHistory(prev => [rawCmd, ...prev])
    setHistoryPointer(-1)
    setInputValue('')
    setIsExecuting(true)

    // Execute via FastAPI
    fetch(apiUrl('/api/terminal/execute'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: rawCmd,
        session_id: sessionId,
        lesson_id: lessonId,
        username: 'student'
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

        // Typo suggestion check: if failed or warning, look for mistyped Git commands
        const parts = rawCmd.split(/\s+/)
        if (parts[0] === 'git' && parts.length > 1) {
          const dict = ['status', 'log', 'add', 'commit', 'checkout', 'branch', 'merge', 'stash', 'rebase', 'pull', 'push', 'remote']
          const sub = parts[1].toLowerCase()
          if (!dict.includes(sub)) {
            const suggestion = getGitSuggestion(sub)
            if (suggestion) {
              setHistory(prev => [...prev, {
                type: 'system',
                text: `💡 Gitify Hint: Did you mean "git ${suggestion}"?`
              }])
            }
          }
        }

        // Update active prompt path & branch
        if (data.sync_state) {
          if (data.sync_state.pwd !== undefined) {
            setPwd(data.sync_state.pwd)
          }
          if (data.sync_state.branch !== undefined) {
            setBranch(data.sync_state.branch)
          }

          // Cache files list for autocomplete
          if (data.sync_state.files) {
            setFiles(data.sync_state.files)
          }

          // Cache branches list from DAG graph for autocomplete
          if (data.sync_state.commits_graph) {
            const brList = new Set(['main', 'master'])
            data.sync_state.commits_graph.forEach(c => {
              c.branches.forEach(b => {
                if (b !== 'HEAD') brList.add(b)
              })
            })
            setBranches(Array.from(brList))
          }
        }

        // Sync with React visualizer
        if (onSyncState) {
          onSyncState({
            ...data.sync_state,
            subtasks: data.subtasks || [],
            verified: data.verified || false,
            validation_message: data.validation_message || ''
          })
        }

        // Show verification success
        if (data.verified) {
          setHistory(prev => [...prev, { 
            type: 'success', 
            text: `🎉 EXERCISE SOLVED: ${data.validation_message}` 
          }])
          if (onSuccess) onSuccess()
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

  // Intercept keys
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
    } else if (e.key === 'Tab') {
      e.preventDefault()
      handleTabComplete()
    }
  }

  const handleTabComplete = () => {
    const text = inputValue
    if (!text) return

    const words = text.split(/\s+/)
    const currentWord = words[words.length - 1]

    // Completing the base command
    if (words.length === 1) {
      const allowedBase = ['git', 'ls', 'cat', 'cd', 'touch', 'mkdir', 'rm', 'mv', 'cp', 'clear']
      const match = allowedBase.find(c => c.startsWith(text.toLowerCase()))
      if (match) {
        setInputValue(match + ' ')
      }
      return
    }

    // Completing git subcommands
    if (words[0] === 'git' && words.length === 2) {
      const gitCmds = ['status', 'log', 'add', 'commit', 'checkout', 'branch', 'merge', 'stash', 'rebase', 'pull', 'push', 'remote']
      const match = gitCmds.find(c => c.startsWith(currentWord.toLowerCase()))
      if (match) {
        setInputValue(`git ${match} `)
      }
      return
    }

    // Completing file names
    if (words.length > 1 && (words[words.length - 2] === 'add' || words[0] === 'cat' || words[0] === 'rm' || words[0] === 'cd')) {
      const match = files.find(f => f.toLowerCase().startsWith(currentWord.toLowerCase()))
      if (match) {
        words[words.length - 1] = match
        setInputValue(words.join(' ') + ' ')
      }
      return
    }

    // Completing branch names
    if (words.length > 1 && (words[words.length - 2] === 'checkout' || words[words.length - 2] === 'merge' || words[words.length - 2] === 'rebase')) {
      const match = branches.find(b => b.toLowerCase().startsWith(currentWord.toLowerCase()))
      if (match) {
        words[words.length - 1] = match
        setInputValue(words.join(' ') + ' ')
      }
      return
    }
  }

  const focusInput = () => {
    inputRef.current?.focus()
  }

  const promptPath = pwd ? `/${pwd.replace(/\\/g, '/')}` : ''
  const promptBranch = branch ? ` (${branch})` : ''

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
          <span style={{ marginLeft: '6px', fontWeight: '500' }}>
            gitify@sandbox:~/workspace{promptPath}{promptBranch}
          </span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation()
            setMinimized(true)
          }}
          aria-label="Minimize terminal"
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
        ref={historyRef}
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
            <span style={{
              color: line.type === 'error' ? '#fecaca' : 
                     line.type === 'success' ? '#6ee7b7' : 
                     line.type === 'input' ? '#38bdf8' : '#8b949e'
            }}>
              {line.text}
            </span>
          </div>
        ))}
        {isExecuting && (
          <div style={{ color: '#8b949e', fontStyle: 'italic' }}>Running subprocess command...</div>
        )}
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
        <span style={{ color: '#10b981', marginRight: '8px', userSelect: 'none', fontWeight: '600' }}>
          student@gitify:~/workspace{promptPath}{promptBranch}$
        </span>
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
