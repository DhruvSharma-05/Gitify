import React, { useState, useEffect, useRef } from 'react'
import { apiUrl, getInitialOfflineState } from '../api.js'

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

/**
 * Returns a contextual hint for common git errors to guide students.
 */
function getSmartHint(command, output, lessonId) {
  if (!output) return null
  const out = output.toLowerCase()
  const cmd = command.toLowerCase()

  if (out.includes('fatal: not a git repository')) {
    return "💡 Tip: You're not inside a git repo yet. Run 'git init' to initialize one."
  }
  if (out.includes('nothing to commit') && out.includes('working tree clean')) {
    return "💡 Tip: Nothing to commit — your working tree is clean. Make a change or add a file first."
  }
  if (out.includes('nothing added to commit') || out.includes('no changes added to commit')) {
    return "💡 Tip: Changes exist but aren't staged. Run 'git add <filename>' or 'git add .' to stage them."
  }
  if (out.includes('pathspec') && out.includes('did not match')) {
    const fileGuess = (command.match(/\b([\w./]+\.[\w]+)\b/) || [])[1]
    return `💡 Tip: File not found. Run 'ls' to see what's in the workspace${fileGuess ? ` — did you mean '${fileGuess}'?` : '.'}`
  }
  if (out.includes('conflict') || out.includes('<<<<<<<')) {
    return "💡 Tip: Merge conflict detected. Open the file in the inspector, edit out the conflict markers (<<<, ===, >>>), then 'git add <file>' and 'git commit'."
  }
  if (out.includes('your branch is behind') || out.includes('updates were rejected')) {
    return "💡 Tip: Your local branch is behind the remote. Try 'git pull --rebase' to sync up."
  }
  if (out.includes('needs merge') || out.includes('unresolved conflicts')) {
    return "💡 Tip: Unresolved conflicts exist. Resolve them in the editor, then 'git add' the file."
  }
  if (cmd.includes('git stash') && (out.includes('no local changes') || out.includes('nothing to stash'))) {
    return "💡 Tip: There's nothing to stash. Make a change to a tracked file first."
  }
  if (out.includes('already up to date')) {
    return "💡 Tip: Already up to date — no new commits to merge or pull."
  }
  if (out.includes('error: failed to push') || out.includes('rejected')) {
    return "💡 Tip: Push rejected. Run 'git pull' first to integrate remote changes."
  }
  if (out.includes('detached head')) {
    return "💡 Tip: You're in detached HEAD state. Create a branch with 'git checkout -b <branch-name>' to keep your work."
  }
  return null
}

export default function TerminalShell({ lessonId, onSyncState, onSuccess, resetTrigger, isExerciseMode, onRebaseInteractive }) {
  const [pwd, setPwd] = useState('')
  const [branch, setBranch] = useState('main')
  const [history, setHistory] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [cmdHistory, setCmdHistory] = useState([])
  const [historyPointer, setHistoryPointer] = useState(-1)
  const [isExecuting, setIsExecuting] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [offlineState, setOfflineState] = useState(() => getInitialOfflineState(lessonId))
  const [backendOnline, setBackendOnline] = useState(true)
  
  // Local caches for autocompletion
  const [files, setFiles] = useState([])
  const [branches, setBranches] = useState(['main'])

  // Autocomplete and Cheatsheet states
  const [suggestions, setSuggestions] = useState([])
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false)

  const historyRef = useRef(null)
  const inputRef = useRef(null)

  // Autocomplete calculator
  const calculateSuggestions = (value) => {
    if (!value) {
      setSuggestions([])
      return
    }

    const trimmed = value.replace(/^\s+/, '')
    const words = trimmed.split(/\s+/)
    const currentWord = words[words.length - 1]

    const allowedBase = ['git', 'ls', 'cat', 'cd', 'touch', 'mkdir', 'rm', 'mv', 'cp', 'clear']
    const gitSubcommands = ['status', 'log', 'add', 'commit', 'checkout', 'branch', 'merge', 'stash', 'rebase', 'pull', 'push', 'remote']

    if (words.length === 1) {
      const matches = allowedBase.filter(c => c.startsWith(currentWord.toLowerCase()) && c !== currentWord.toLowerCase())
      setSuggestions(matches)
    } else if (words[0] === 'git' && words.length === 2) {
      const matches = gitSubcommands.filter(c => c.startsWith(currentWord.toLowerCase()) && c !== currentWord.toLowerCase())
      setSuggestions(matches)
    } else if (words.length > 1 && (words[words.length - 2] === 'add' || words[0] === 'cat' || words[0] === 'rm' || words[0] === 'cd')) {
      const matches = files.filter(f => f.toLowerCase().startsWith(currentWord.toLowerCase()) && f.toLowerCase() !== currentWord.toLowerCase())
      setSuggestions(matches)
    } else if (words.length > 1 && (words[words.length - 2] === 'checkout' || words[words.length - 2] === 'merge' || words[words.length - 2] === 'rebase')) {
      const matches = branches.filter(b => b.toLowerCase().startsWith(currentWord.toLowerCase()) && b.toLowerCase() !== currentWord.toLowerCase())
      setSuggestions(matches)
    } else {
      setSuggestions([])
    }
  }

  const selectSuggestion = (suggestion) => {
    const trimmed = inputValue.replace(/^\s+/, '')
    const words = trimmed.split(/\s+/)
    words[words.length - 1] = suggestion
    const newValue = words.join(' ') + ' '
    setInputValue(newValue)
    setSuggestions([])
    inputRef.current?.focus()
  }
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
    setOfflineState(getInitialOfflineState(lessonId))
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
    setSuggestions([])
    setIsExecuting(true)

    // Intercept: git rebase -i — open modal instead of sending to backend
    const rebaseInteractiveMatch = rawCmd.match(/^git\s+rebase\s+-i/i)
    if (rebaseInteractiveMatch && onRebaseInteractive) {
        setIsExecuting(false)
        setBackendOnline(true)

        setHistory(prev => [...prev, {
        type: 'system',
        text: '📟 Opening interactive rebase editor… (Use the modal to arrange commits, then click Save & Execute)'
      }])
      // Pass current commit graph from offline state or cached data
      const commitsForModal = offlineState?.commits || []
      onRebaseInteractive(commitsForModal)
      return
    }

    // Execute via FastAPI
    fetch(apiUrl('/api/terminal/execute'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: rawCmd,
        lesson_id: lessonId,
        username: 'student',
        is_exercise_mode: isExerciseMode
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
        setBackendOnline(true)

        if (data.output === 'CLEAR_CONSOLE') {
          setHistory([])
          return
        }

        // Print output
        setHistory(prev => [...prev, { 
          type: data.status === 'success' ? 'output' : 'error', 
          text: data.output || '(No output)' 
        }])

        // Show smart contextual hint if output suggests an error
        if (data.status === 'error' || data.status === 'warning') {
          const hint = getSmartHint(rawCmd, data.output, lessonId)
          if (hint) {
            setHistory(prev => [...prev, { type: 'system', text: hint }])
          }
        }

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
        setBackendOnline(false)
        console.warn("Terminal server error, using offline mock simulation:", err)
        
        const result = simulateCommandOffline(rawCmd, offlineState, lessonId)
        const updatedOfflineState = result.nextState
        setOfflineState(updatedOfflineState)
        
        if (result.output === 'CLEAR_CONSOLE') {
          setHistory([])
          return
        }

        setHistory(prev => [
          ...prev, 
          { 
            type: result.status === 'success' ? 'output' : 'error', 
            text: result.output || '(No output)' 
          },
          {
            type: 'system',
            text: '📟 [Offline Fallback Mode — server unreachable, simulating in memory]'
          }
        ])

        // Smart hint in offline mode too
        if (result.status === 'error') {
          const hint = getSmartHint(rawCmd, result.output, lessonId)
          if (hint) {
            setHistory(prev => [...prev, { type: 'system', text: hint }])
          }
        }

        if (updatedOfflineState.pwd !== undefined) setPwd(updatedOfflineState.pwd)
        if (updatedOfflineState.branch !== undefined) setBranch(updatedOfflineState.branch)
        if (updatedOfflineState.files) setFiles(updatedOfflineState.files)
        
        const checkResult = checkOfflineProgress(updatedOfflineState, lessonId)
        
        const syncStatePayload = {
          branch: updatedOfflineState.branch,
          files: updatedOfflineState.files,
          stashes: updatedOfflineState.stashes,
          picked: updatedOfflineState.commits.filter(c => c.message.toLowerCase().includes("fix tax rounding")).map(c => c.hash),
          pwd: updatedOfflineState.pwd,
          commits_graph: updatedOfflineState.commits,
          file_contents: updatedOfflineState.fileContents,
          subtasks: checkResult.subtasks,
          verified: checkResult.verified,
          validation_message: checkResult.msg
        }

        if (onSyncState) {
          onSyncState(syncStatePayload)
        }

        if (checkResult.verified) {
          setHistory(prev => [...prev, { 
            type: 'success', 
            text: `🎉 EXERCISE SOLVED (Offline): ${checkResult.msg}` 
          }])
          if (onSuccess) onSuccess()
        }
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
    if (suggestions.length > 0) {
      selectSuggestion(suggestions[0])
      return
    }
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
        fontSize: '0.85rem',
        position: 'relative'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Connection status pill */}
          <div
            title={backendOnline ? 'Connected to Gitify backend' : 'Offline — commands simulated in memory'}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '0.7rem', fontWeight: '600',
              color: backendOnline ? '#34d399' : '#fbbf24',
              background: backendOnline ? 'rgba(16,185,129,0.1)' : 'rgba(251,191,36,0.1)',
              border: `1px solid ${backendOnline ? 'rgba(16,185,129,0.25)' : 'rgba(251,191,36,0.25)'}`,
              padding: '2px 8px', borderRadius: '20px', transition: 'all 0.3s ease'
            }}
          >
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: backendOnline ? '#10b981' : '#f59e0b',
              display: 'inline-block',
              boxShadow: backendOnline ? '0 0 6px #10b981' : '0 0 6px #f59e0b'
            }} />
            {backendOnline ? 'Server Connected' : 'Offline Mode'}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCheatsheetOpen(true);
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              padding: '2px 8px',
              color: '#cbd5e1',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            className="cheatsheet-toggle-btn"
          >
            📖 Cheatsheet
          </button>
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
      </div>

      {/* Terminal History */}
      <div 
        ref={historyRef}
        className="terminal-history"
        aria-live="polite"
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

      {/* Autocomplete Suggestions Bar */}
      {suggestions.length > 0 && (
        <div 
          className="terminal-suggestions-bar"
          style={{
            display: 'flex',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderBottom: 'none',
            borderRadius: '6px 6px 0 0',
            padding: '6px 10px',
            marginBottom: '-1px',
            alignItems: 'center',
            flexWrap: 'wrap',
            zIndex: 10
          }}
        >
          <span style={{ color: '#8b949e', fontSize: '0.75rem', marginRight: '4px', fontWeight: '500' }}>Suggestions:</span>
          {suggestions.map((sug, idx) => (
            <button
              key={sug}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                selectSuggestion(sug);
              }}
              style={{
                background: idx === 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.04)',
                border: idx === 0 ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: idx === 0 ? '#38bdf8' : '#e2e8f0',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontWeight: idx === 0 ? '700' : 'normal',
                transition: 'all 0.15s'
              }}
              className="suggestion-pill"
            >
              {sug} {idx === 0 && <span style={{ fontSize: '0.65rem', opacity: 0.8, marginLeft: '2px' }}>[Tab]</span>}
            </button>
          ))}
        </div>
      )}

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
          onChange={(e) => {
            setInputValue(e.target.value)
            calculateSuggestions(e.target.value)
          }}
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

      {/* Cheatsheet Sliding Panel */}
      {cheatsheetOpen && (
        <div 
          className="cheatsheet-drawer glassmorphic"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(15, 23, 42, 0.96)',
            borderRadius: '12px',
            zIndex: 100,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📖</span> Git Command Cheatsheet
            </h3>
            <button 
              onClick={() => setCheatsheetOpen(false)}
              aria-label="Close cheatsheet"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8b949e',
                fontSize: '1.4rem',
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          {/* List of commands */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
            {getCheatsheetCommands(lessonId).map((item, idx) => (
              <CheatItem key={idx} cmd={item.cmd} desc={item.desc} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CheatItem({ cmd, desc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
      <code style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: 'bold' }}>{cmd}</code>
      <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{desc}</span>
    </div>
  )
}

function getCheatsheetCommands(lessonId) {
  switch (lessonId) {
    case 0:
    case 1:
      return [
        { cmd: "ls", desc: "List files: Shows all files in the current workspace directory." },
        { cmd: "git init", desc: "Initialize: Creates a new local Git repository in the sandbox directory." },
        { cmd: "git status", desc: "Check status: Displays which files are staged, unstaged/modified, or untracked." },
        { cmd: "git add index.js App.jsx", desc: "Stage files: Stages 'index.js' and 'App.jsx', preparing them to be committed." },
        { cmd: "git commit -m 'first commit'", desc: "Commit snapshot: Permanently saves your staged changes in a commit snapshot with a description." },
        { cmd: "git push origin main", desc: "Push to remote: Sends your main branch commits to the remote repository (origin)." }
      ]
    case 2:
      return [
        { cmd: "git branch", desc: "List branches: Lists all local branches. The active branch has an asterisk (*) next to it." },
        { cmd: "git checkout -b feature/auth", desc: "Create & switch branch: Creates a new branch named 'feature/auth' and immediately switches your HEAD to it." },
        { cmd: "git commit -a -m 'auth changes'", desc: "Stage & commit: Automatically stages all modified files and commits them in one step." },
        { cmd: "git checkout main", desc: "Switch branch: Switches your active branch back to the 'main' branch." },
        { cmd: "git merge feature/auth", desc: "Merge branches: Merges the commits from 'feature/auth' into your current active branch ('main')." }
      ]
    case 3:
      return [
        { cmd: "git merge feature/ui", desc: "Trigger merge: Merges the UI branch. Since both main and feature/ui modified config.js, this triggers conflict markers." },
        { cmd: "cat config.js", desc: "Inspect file: Reads the config.js file to find the conflict markers (<<<<<<<, =======, >>>>>>>)." },
        { cmd: "git add config.js", desc: "Stage resolved: Marks config.js as conflict-free and ready for the merge commit." },
        { cmd: "git commit -m 'resolve merge conflict'", desc: "Finalize merge: Finalizes the merge and commits the resolved changes." }
      ]
    case 4:
      return [
        { cmd: "git log --oneline", desc: "Show history: Lists recent commits with short hashes and messages so you can identify the buggy commit." },
        { cmd: "git show <commit-hash>", desc: "Inspect commit: Displays the exact code changes and message of a specific commit." },
        { cmd: "git revert <commit-hash>", desc: "Safe revert: Creates a new commit that applies the exact opposite changes of the buggy commit, safely undoing it." },
        { cmd: "git reset --hard <commit-hash>", desc: "Hard reset: Moves your branch pointer back to the specified commit, permanently discarding all commits and work after it." }
      ]
    case 5:
      return [
        { cmd: "git stash", desc: "Stash WIP: Saves your dirty working directory changes to a temporary stack, leaving a clean workspace." },
        { cmd: "git stash list", desc: "List stashes: Displays your saved stashes (e.g. stash@{0})." },
        { cmd: "git checkout hotfix/invoice", desc: "Switch branch: Switches to the hotfix branch to find the commit hash you need to pick." },
        { cmd: "git log --oneline", desc: "Show history: Helps you locate the 'Fix tax rounding' commit hash." },
        { cmd: "git checkout feature/payments", desc: "Switch back: Returns you to your working branch." },
        { cmd: "git cherry-pick <commit-hash>", desc: "Cherry-pick: Copies the tax fix commit from the hotfix branch directly onto feature/payments." },
        { cmd: "git stash pop", desc: "Restore stashed work: Applies your stashed changes back to your working directory and removes them from the stash." }
      ]
    case 6:
      return [
        { cmd: "git fetch", desc: "Fetch remote: Downloads the latest branch pointers and commits from origin without changing your local workspace." },
        { cmd: "git branch -r", desc: "List remote branches: Shows remote-tracking branches, such as origin/main." },
        { cmd: "git pull --rebase", desc: "Pull with rebase: Fetches origin/main and replays your local commits on top of teammate changes to maintain a clean linear timeline." },
        { cmd: "git push origin main", desc: "Push updates: Uploads your rebased commits to origin/main remote repository." }
      ]
    case 7:
      return [
        { cmd: "git log --oneline", desc: "Check history: View all commits and count them (e.g. 5 commits) to determine the rebase depth." },
        { cmd: "git rebase -i HEAD~5", desc: "Interactive rebase: Opens the interactive rebase editor for the last 5 commits, where you can pick, squash, drop, or reword." }
      ]
    default:
      return []
  }
}

function checkOfflineProgress(state, lessonId) {
  let subtasks = []
  let verified = false
  let msg = "Keep executing commands."

  if (lessonId === 0) {
    const init_done = state.initialized
    const stage_done = state.staged.length > 0 || state.commits.length > 0
    const commit_done = state.commits.length > 0

    subtasks = [
      { id: "init", title: "Initialize Git repository ('git init')", completed: init_done },
      { id: "stage", title: "Stage changes ('git add')", completed: stage_done },
      { id: "commit", title: "Commit a snapshot ('git commit')", completed: commit_done }
    ]
    verified = init_done && stage_done && commit_done
    msg = verified ? "Git repository initialized, files staged and committed successfully!" : "Keep working on your terminal steps."
  }
  else if (lessonId === 1) {
    const init_done = state.initialized
    const stage_done = state.staged.length > 0 || state.commits.length > 0
    const commit_done = state.commits.length > 0
    const push_done = state.commits.some(c => c.branches.includes('origin/main') || c.branches.includes('origin/master')) || state.pushed_offline === true

    subtasks = [
      { id: "init", title: "Initialize Git repository ('git init')", completed: init_done },
      { id: "stage", title: "Stage files ('git add')", completed: stage_done },
      { id: "commit", title: "Create a commit snapshot ('git commit')", completed: commit_done },
      { id: "push", title: "Push commit to remote ('git push')", completed: push_done }
    ]
    verified = init_done && stage_done && commit_done && push_done
    msg = verified ? "Visual playground complete! Repository initialized, committed, and pushed successfully!" : "Keep executing commands."
  }
  else if (lessonId === 2) {
    const br_exists = state.branches.includes("feature/auth")
    const commit_on_br = state.commits.length >= 2
    const back_to_main = state.branch === "main"
    const merged = br_exists && state.branch === "main" && (state.commits.some(c => c.branches.includes("main") && c.parents.length > 1) || state.merged_offline === true)
    
    subtasks = [
      { id: "create_branch", title: "Create branch 'feature/auth'", completed: br_exists },
      { id: "commit_feature", title: "Make a commit on 'feature/auth'", completed: commit_on_br },
      { id: "checkout_main", title: "Switch back to 'main' branch", completed: back_to_main },
      { id: "merge_branch", title: "Merge 'feature/auth' into 'main'", completed: merged }
    ]
    verified = br_exists && commit_on_br && back_to_main && merged
    msg = verified ? "Advanced branching exercise solved successfully!" : "Keep resolving advanced branching steps."
  }
  else if (lessonId === 3) {
    const conflict_triggered = state.conflict_active === true || state.conflict_triggered === true
    const resolved = conflict_triggered && state.conflict_resolved === true
    const staged = resolved && state.staged.includes("config.js")
    const committed = state.commits.length >= 4
    
    subtasks = [
      { id: "trigger_conflict", title: "Trigger conflict by merging 'feature/ui'", completed: conflict_triggered },
      { id: "resolve_conflict", title: "Resolve merge conflicts in config.js", completed: resolved },
      { id: "stage_resolved", title: "Stage resolved config.js ('git add')", completed: staged },
      { id: "commit_merge", title: "Commit the resolved merge", completed: committed }
    ]
    verified = conflict_triggered && resolved && staged && committed
    msg = verified ? "Merge conflict resolved and committed successfully!" : "Keep working on resolving config.js conflict."
  }
  else if (lessonId === 4) {
    const revert_done = state.commits.some(c => c.message.toLowerCase().includes("revert") && c.message.toLowerCase().includes("skip null"))
    const reset_done = !state.commits.some(c => c.message.toLowerCase().includes("skip null metric check"))
    
    subtasks = [
      { id: "revert_commit", title: "Revert the buggy commit ('git revert')", completed: revert_done },
      { id: "reset_clean", title: "Explore soft/hard resets ('git reset')", completed: reset_done },
      { id: "safety_matrix", title: "Match situations in the Safety Matrix", completed: revert_done || reset_done }
    ]
    verified = revert_done || reset_done
    msg = verified ? "Git history repaired successfully!" : "Inspect git log and revert or reset buggy commits."
  }
  else if (lessonId === 5) {
    const stashed = state.stashes.length > 0 || state.stashed_offline === true
    const switched = state.branch === "feature/payments"
    const picked = state.commits.some(c => c.message.toLowerCase().includes("fix tax rounding"))
    const popped = picked && state.files.includes("Checkout.jsx") && state.files.includes("styles.css")
    
    subtasks = [
      { id: "stash_wip", title: "Stash uncommitted changes ('git stash')", completed: stashed },
      { id: "switch_branch", title: "Switch branch safely ('git checkout')", completed: switched },
      { id: "cherry_pick", title: "Cherry-pick hotfix commit ('git cherry-pick')", completed: picked },
      { id: "pop_stash", title: "Pop stashed changes back ('git stash pop')", completed: popped }
    ]
    verified = stashed && switched && picked && popped
    msg = verified ? "Stash and Cherry-Pick checkpoints cleared successfully!" : "Keep managing your stashes and cherry-picks."
  }
  else if (lessonId === 6) {
    const fetched = state.fetched_offline === true
    const pulled = state.pulled_offline === true || (state.commits.some(c => c.message.includes("nav polish")) && state.commits.some(c => c.message.includes("retry logic")))
    const resolved = state.pushed_offline === true && state.commits.some(c => c.message.includes("login form")) && state.commits.some(c => c.message.includes("nav polish")) && state.commits.some(c => c.message.includes("retry logic"))
    
    subtasks = [
      { id: "fetch_remote", title: "Fetch remote branches ('git fetch')", completed: fetched },
      { id: "pull_remote", title: "Pull remote commits ('git pull')", completed: pulled },
      { id: "resolve_push", title: "Handle push conflict via rebase ('git pull --rebase')", completed: resolved }
    ]
    verified = fetched && pulled && resolved
    msg = verified ? "Drift sync and rebase push successful!" : "Pull remote changes and rebase to resolve pushing conflicts."
  }
  else if (lessonId === 7) {
    const rebase_started = !state.commits.some(c => c.message.includes("debug payment state"))
    const commits_squashed = rebase_started && !state.commits.some(c => c.message.includes("Fix typo"))
    const timeline_clean = rebase_started && commits_squashed && state.commits.length <= 4
    
    subtasks = [
      { id: "interactive_rebase", title: "Configure interactive rebase N commits", completed: rebase_started },
      { id: "squash_commits", title: "Squash and reorder target commits", completed: commits_squashed },
      { id: "clean_timeline", title: "Complete clean linear rebase history", completed: timeline_clean}
    ]
    verified = rebase_started && commits_squashed && timeline_clean
    msg = verified ? "Commits squashed and timeline clean!" : "Organize commits using 'pick', 'squash', or 'drop' in rebase."
  }

  return { verified, msg, subtasks }
}

function simulateCommandOffline(commandText, state, lessonId) {
  const parts = commandText.trim().split(/\s+/)
  const baseCmd = parts[0]
  let output = ""
  let status = "success"

  const nextState = JSON.parse(JSON.stringify(state))

  if (baseCmd === "ls") {
    if (nextState.files.length === 0) {
      output = "(Empty directory)"
    } else {
      output = nextState.files.join("  ")
    }
  } 
  else if (baseCmd === "cat") {
    const filename = parts[1]
    if (!filename) {
      output = "cat: missing filename"
      status = "error"
    } else if (!nextState.files.includes(filename)) {
      output = `cat: ${filename}: No such file or directory`
      status = "error"
    } else {
      output = nextState.fileContents[filename] || "(empty file)"
    }
  }
  else if (baseCmd === "touch") {
    const filename = parts[1]
    if (!filename) {
      output = "touch: missing filename"
      status = "error"
    } else {
      if (!nextState.files.includes(filename)) {
        nextState.files.push(filename)
        nextState.fileContents[filename] = `// created ${filename}`
      }
      output = ""
    }
  }
  else if (baseCmd === "rm") {
    const filename = parts[1]
    if (!filename) {
      output = "rm: missing filename"
      status = "error"
    } else if (!nextState.files.includes(filename)) {
      output = `rm: ${filename}: No such file or directory`
      status = "error"
    } else {
      nextState.files = nextState.files.filter(f => f !== filename)
      delete nextState.fileContents[filename]
      nextState.staged = nextState.staged.filter(f => f !== filename)
      output = ""
    }
  }
  else if (baseCmd === "clear") {
    output = "CLEAR_CONSOLE"
  }
  else if (baseCmd === "git") {
    const sub = parts[1]
    if (!sub) {
      output = "Usage: git <command> [<args>]"
      status = "error"
    } 
    else if (sub === "init") {
      if (nextState.initialized) {
        output = "Reinitialized existing Git repository in /workspace/.git/"
      } else {
        nextState.initialized = true
        output = "Initialized empty Git repository in /workspace/.git/"
      }
    }
    else {
      if (!nextState.initialized) {
        output = "fatal: not a git repository (or any of the parent directories): .git"
        status = "error"
      }
      else if (sub === "status") {
        const stagedFiles = nextState.staged
        const untracked = nextState.files.filter(f => !stagedFiles.includes(f))
        
        let out = `On branch ${nextState.branch}\n`
        if (nextState.lessonId === 6) {
          out += `Your branch is up to date with 'origin/${nextState.branch}'.\n\n`
        } else {
          out += `Your branch is up to date.\n\n`
        }

        if (nextState.conflict_active) {
          out += `You have unmerged paths.\n  (fix conflicts and run "git commit")\n\nUnmerged paths:\n  (use "git add <file>..." to mark resolution)\n\tboth modified:   config.js\n\n`
        } else if (stagedFiles.length > 0) {
          out += `Changes to be committed:\n  (use "git restore --staged <file>..." to unstage)\n`
          stagedFiles.forEach(f => {
            out += `\tnew file:   ${f}\n`
          })
          out += `\n`
        }

        if (untracked.length > 0 && !nextState.conflict_active) {
          out += `Untracked files:\n  (use "git add <file>..." to include in what will be committed)\n`
          untracked.forEach(f => {
            out += `\t${f}\n`
          })
          out += `\n`
        }

        if (stagedFiles.length === 0 && untracked.length === 0 && !nextState.conflict_active) {
          out += `nothing to commit, working tree clean`
        }
        output = out
      }
      else if (sub === "add") {
        const filePattern = parts[2]
        if (!filePattern) {
          output = "Nothing specified, nothing added."
          status = "error"
        } else {
          if (filePattern === "." || filePattern === "-A" || filePattern === "--all") {
            nextState.staged = [...nextState.files]
            if (nextState.conflict_active) {
              nextState.conflict_resolved = true
              nextState.conflict_active = false
            }
            output = ""
          } else {
            if (nextState.files.includes(filePattern)) {
              if (!nextState.staged.includes(filePattern)) {
                nextState.staged.push(filePattern)
              }
              if (filePattern === "config.js" && nextState.conflict_active) {
                nextState.conflict_resolved = true
                nextState.conflict_active = false
              }
              output = ""
            } else {
              output = `fatal: pathspec '${filePattern}' did not match any files`
              status = "error"
            }
          }
        }
      }
      else if (sub === "commit") {
        let msg = ""
        const mIdx = parts.indexOf("-m")
        if (mIdx !== -1 && parts[mIdx + 1]) {
          msg = parts.slice(mIdx + 1).join(" ").replace(/['"]/g, "")
        } else {
          msg = "Minor updates"
        }

        if (nextState.staged.length === 0 && !nextState.conflict_resolved) {
          output = `On branch ${nextState.branch}\nnothing to commit, working tree clean`
        } else {
          const hash = Math.random().toString(16).substring(2, 9)
          const fullHash = hash + '0'.repeat(33)
          
          nextState.commits = nextState.commits.map(c => ({
            ...c,
            is_head: c.branches.includes(nextState.branch) ? false : c.is_head
          }))

          const activeBranch = nextState.branch
          const currentHead = nextState.commits.find(c => c.branches.includes(activeBranch))
          
          const newCommit = {
            hash: hash,
            full_hash: fullHash,
            message: msg,
            branches: [activeBranch],
            parents: currentHead ? [currentHead.hash] : [],
            is_head: true
          }

          nextState.commits.push(newCommit)
          nextState.staged = []
          output = `[${activeBranch} ${hash}] ${msg}\n ${nextState.files.length} files changed`
        }
      }
      else if (sub === "log") {
        if (nextState.commits.length === 0) {
          output = `fatal: your current branch '${nextState.branch}' does not have any commits yet`
          status = "error"
        } else {
          const reversed = [...nextState.commits].reverse()
          output = reversed.map(c => {
            const brText = c.branches.length > 0 ? ` (${c.is_head ? 'HEAD -> ' : ''}${c.branches.join(', ')})` : ''
            return `commit ${c.full_hash}${brText}\nAuthor: Gitify Offline Student <student@gitify.edu>\nDate: Wed Jun 10 2026\n\n    ${c.message}\n`
          }).join("\n")
        }
      }
      else if (sub === "branch") {
        const newBranchName = parts[2]
        if (!newBranchName) {
          output = nextState.branches.map(b => (b === nextState.branch ? `* ${b}` : `  ${b}`)).join("\n")
        } else {
          if (nextState.branches.includes(newBranchName)) {
            output = `fatal: A branch named '${newBranchName}' already exists.`
            status = "error"
          } else {
            nextState.branches.push(newBranchName)
            const currentHead = nextState.commits.find(c => c.is_head)
            if (currentHead) {
              currentHead.branches.push(newBranchName)
            }
            output = ""
          }
        }
      }
      else if (sub === "checkout") {
        let targetBranch = parts[2]
        const isBFlag = parts[2] === "-b"
        if (isBFlag) {
          targetBranch = parts[3]
        }

        if (!targetBranch) {
          output = "fatal: Branch name required."
          status = "error"
        } else {
          if (isBFlag) {
            if (nextState.branches.includes(targetBranch)) {
              output = `fatal: A branch named '${targetBranch}' already exists.`
              status = "error"
            } else {
              nextState.branches.push(targetBranch)
              nextState.branch = targetBranch
              nextState.commits = nextState.commits.map(c => ({
                ...c,
                is_head: c.branches.includes(targetBranch)
              }))
              output = `Switched to a new branch '${targetBranch}'`
            }
          } else {
            if (nextState.branches.includes(targetBranch)) {
              nextState.branch = targetBranch
              nextState.commits = nextState.commits.map(c => ({
                ...c,
                is_head: c.branches.includes(targetBranch)
              }))
              output = `Switched to branch '${targetBranch}'`
            } else {
              output = `error: pathspec '${targetBranch}' did not match any file(s) known to git`
              status = "error"
            }
          }
        }
      }
      else if (sub === "merge") {
        const mergeSrc = parts[2]
        if (!mergeSrc) {
          output = "fatal: Branch to merge required."
          status = "error"
        } else if (!nextState.branches.includes(mergeSrc)) {
          output = `merge: ${mergeSrc} - not something we can merge`
          status = "error"
        } else {
          if (nextState.lessonId === 3 && mergeSrc === "feature/ui" && nextState.branch === "main") {
            nextState.conflict_active = true
            nextState.conflict_triggered = true
            output = "Auto-merging config.js\nCONFLICT (content): Merge conflict in config.js\nAutomatic merge failed; fix conflicts and then commit the result."
            status = "error"
          } else {
            nextState.merged_offline = true
            output = `Updating ${nextState.branch}... Fast-forward merge of '${mergeSrc}' complete.`
          }
        }
      }
      else if (sub === "stash") {
        const action = parts[2]
        if (action === "pop") {
          if (nextState.stashes.length === 0) {
            output = "No stash entries found."
            status = "error"
          } else {
            nextState.stashes.pop()
            if (!nextState.files.includes("Checkout.jsx")) nextState.files.push("Checkout.jsx")
            if (!nextState.files.includes("styles.css")) nextState.files.push("styles.css")
            output = "Dropped refs/stash@{0} (offline)"
          }
        } else {
          nextState.stashes.push({
            id: 0,
            name: "stash@{0}",
            label: `WIP on ${nextState.branch}`,
            files: ["Checkout.jsx", "styles.css"]
          })
          nextState.stashed_offline = true
          nextState.files = nextState.files.filter(f => f !== "Checkout.jsx" && f !== "styles.css")
          output = `Saved working directory and index state WIP on ${nextState.branch}: WIP stash`
        }
      }
      else if (sub === "cherry-pick") {
        const hash = parts[2]
        if (!hash) {
          output = "fatal: Commit hash required."
          status = "error"
        } else {
          const newCommit = {
            hash: 'b7a91c0',
            full_hash: 'b7a91c01c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1',
            message: "Fix tax rounding",
            branches: [nextState.branch],
            parents: [],
            is_head: true
          }
          nextState.commits = nextState.commits.map(c => ({
            ...c,
            is_head: false
          }))
          nextState.commits.push(newCommit)
          output = `[${nextState.branch} b7a91c0] Fix tax rounding\n 1 file changed`
        }
      }
      else if (sub === "fetch") {
        nextState.fetched_offline = true
        output = "From remote\n * [new branch]      main     -> origin/main"
      }
      else if (sub === "pull") {
        const isRebase = parts.includes("--rebase")
        if (isRebase) {
          nextState.pulled_offline = true
          nextState.pushed_offline = true
          output = "Successfully rebased and updated."
        } else {
          output = "From remote\n * branch            main       -> FETCH_HEAD\nMerge conflict in remote merge."
          status = "error"
        }
      }
      else if (sub === "push") {
        nextState.pushed_offline = true
        output = "Everything up-to-date"
      }
      else if (sub === "revert") {
        const hash = parts[2]
        if (!hash) {
          output = "fatal: Commit hash required."
          status = "error"
        } else {
          const newCommit = {
            hash: 'rev1234',
            full_hash: 'rev12345c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1',
            message: "Revert \"Skip null metric check\"",
            branches: [nextState.branch],
            parents: [],
            is_head: true
          }
          nextState.commits = nextState.commits.map(c => ({
            ...c,
            is_head: false
          }))
          nextState.commits.push(newCommit)
          output = `[${nextState.branch} rev1234] Revert "Skip null metric check"`
        }
      }
      else if (sub === "rebase") {
        const isInteractive = parts.includes("-i")
        if (isInteractive) {
          nextState.commits = nextState.commits.filter(c => !c.message.includes("debug payment state"))
          nextState.commits = nextState.commits.filter(c => !c.message.includes("Fix typo"))
          output = "Successfully rebased and updated timeline offline."
        } else {
          output = "Rebase complete."
        }
      }
      else {
        output = `Unknown git subcommand: ${sub}`
        status = "error"
      }
    }
  } 
  else {
    output = `bash: ${baseCmd}: command not found`
    status = "error"
  }

  return { nextState, output, status }
}
