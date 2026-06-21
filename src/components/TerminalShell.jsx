import React, { useState, useEffect, useRef } from 'react'
import { Terminal, BookOpen } from 'lucide-react'
import { apiUrl, getInitialOfflineState } from '../api.js'
import { simulateCommandOffline, checkOfflineProgress } from '../offlineGit.js'

// --- Autocomplete command dictionaries (single source of truth) ---
const GIT_SUBCOMMANDS = [
  'status', 'log', 'add', 'commit', 'checkout', 'branch', 'merge',
  'stash', 'rebase', 'pull', 'push', 'remote', 'switch', 'restore',
  'diff', 'bisect', 'fetch', 'revert', 'cherry-pick', 'tag', 'reset', 'rm', 'show'
]
const ALLOWED_BASE_CMDS = [
  'git', 'gh', 'ls', 'cat', 'cd', 'pwd', 'echo', 'touch', 'mkdir',
  'rm', 'mv', 'cp', 'head', 'tail', 'grep', 'wc', 'clear'
]

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
  let bestMatch = null
  let minDistance = 3 // Suggest only if distance is <= 2
  
  for (const item of GIT_SUBCOMMANDS) {
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
    return "Tip: You're not inside a git repo yet. Run 'git init' to initialize one."
  }
  if (out.includes('nothing to commit') && out.includes('working tree clean')) {
    return "Tip: Nothing to commit — your working tree is clean. Make a change or add a file first."
  }
  if (out.includes('nothing added to commit') || out.includes('no changes added to commit')) {
    return "Tip: Changes exist but aren't staged. Run 'git add <filename>' or 'git add .' to stage them."
  }
  if (out.includes('pathspec') && out.includes('did not match')) {
    const fileGuess = (command.match(/\b([\w./]+\.[\w]+)\b/) || [])[1]
    return `Tip: File not found. Run 'ls' to see what's in the workspace${fileGuess ? ` — did you mean '${fileGuess}'?` : '.'}`
  }
  if (out.includes('conflict') || out.includes('<<<<<<<')) {
    return "Tip: Merge conflict detected. Open the file in the inspector, edit out the conflict markers (<<<, ===, >>>), then 'git add <file>' and 'git commit'."
  }
  if (out.includes('your branch is behind') || out.includes('updates were rejected')) {
    return "Tip: Your local branch is behind the remote. Try 'git pull --rebase' to sync up."
  }
  if (out.includes('needs merge') || out.includes('unresolved conflicts')) {
    return "Tip: Unresolved conflicts exist. Resolve them in the editor, then 'git add' the file."
  }
  if (cmd.includes('git stash') && (out.includes('no local changes') || out.includes('nothing to stash'))) {
    return "Tip: There's nothing to stash. Make a change to a tracked file first."
  }
  if (out.includes('already up to date')) {
    return "Tip: Already up to date — no new commits to merge or pull."
  }
  if (out.includes('error: failed to push') || out.includes('rejected')) {
    return "Tip: Push rejected. Run 'git pull' first to integrate remote changes."
  }
  if (out.includes('detached head')) {
    return "Tip: You're in detached HEAD state. Create a branch with 'git checkout -b <branch-name>' to keep your work."
  }
  return null
}

function welcomeBanner(lessonId) {
  if (lessonId === 8) {
    return [
      { type: 'system', text: 'Welcome — Lesson 8: Fork & Contribute (simulated GitHub workflow)' },
      { type: 'system', text: 'Goal: fork a project, clone it, commit a fix, push, then open and merge a pull request.' },
      { type: 'system', text: 'Start by forking the repo:  gh repo fork octo/awesome-lib   (open the Cheatsheet for every command)' }
    ]
  }
  return [
    { type: 'system', text: `Welcome to Gitify Sandbox Console - Lesson ${lessonId}` },
    { type: 'system', text: 'Type Git commands to solve the exercise tasks in real time.' },
    { type: 'system', text: 'Try "git status", "git log", "git stash", or "ls". Type "clear" to empty console. Hit [Tab] to autocomplete!' }
  ]
}

export default function TerminalShell({ lessonId, onSyncState, onSuccess, resetTrigger, onRebaseInteractive, liveCommits, onSessionChange, hydration }) {
  const [pwd, setPwd] = useState('')
  const [branch, setBranch] = useState('main')
  const [history, setHistory] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [cmdHistory, setCmdHistory] = useState([])
  const [historyPointer, setHistoryPointer] = useState(-1)
  const [sessionId, setSessionId] = useState(null)
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

  // Per-lesson scrollback persistence: each lesson keeps its own terminal log so
  // navigating between lessons doesn't wipe what you typed.
  const scrollbackCache = useRef({})
  const liveHistoryRef = useRef([])
  const prevLessonRef = useRef(lessonId)
  useEffect(() => { liveHistoryRef.current = history }, [history])

  // Autocomplete calculator
  const calculateSuggestions = (value) => {
    if (!value) {
      setSuggestions([])
      return
    }

    const trimmed = value.replace(/^\s+/, '')
    const words = trimmed.split(/\s+/)
    const currentWord = words[words.length - 1]

    if (words.length === 1) {
      const matches = ALLOWED_BASE_CMDS.filter(c => c.startsWith(currentWord.toLowerCase()) && c !== currentWord.toLowerCase())
      setSuggestions(matches)
    } else if (words[0] === 'git' && words.length === 2) {
      const matches = GIT_SUBCOMMANDS.filter(c => c.startsWith(currentWord.toLowerCase()) && c !== currentWord.toLowerCase())
      setSuggestions(matches)
    } else if (words.length > 1 && (
      (words[0] === 'git' && ['add', 'rm', 'restore', 'diff'].includes(words[1])) ||
      ['cat', 'rm', 'cd', 'head', 'tail', 'wc', 'cp', 'mv'].includes(words[0])
    )) {
      const matches = files.filter(f => f.toLowerCase().startsWith(currentWord.toLowerCase()) && f.toLowerCase() !== currentWord.toLowerCase())
      setSuggestions(matches)
    } else if (words.length > 1 && (['checkout', 'merge', 'rebase', 'switch'].includes(words[words.length - 2]))) {
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

  // Initialize unique session ID
  useEffect(() => {
    let activeSession = localStorage.getItem("gitify_session_id")
    if (!activeSession || activeSession === "null" || activeSession === "undefined") {
      activeSession = `session_${Math.random().toString(36).substring(2, 11)}`
      localStorage.setItem("gitify_session_id", activeSession)
    }
    setSessionId(activeSession)
  }, [])

  // Lesson change: stash the outgoing lesson's scrollback, restore this lesson's
  // (or show a fresh welcome banner if it's the first visit).
  useEffect(() => {
    const prev = prevLessonRef.current
    if (prev !== lessonId) {
      scrollbackCache.current[prev] = liveHistoryRef.current
    }
    prevLessonRef.current = lessonId

    const cached = scrollbackCache.current[lessonId]
    setHistory(cached && cached.length ? cached : welcomeBanner(lessonId))
    setPwd('')
    setBranch('main')
    setFiles([])
    setBranches(['main'])
    setOfflineState(getInitialOfflineState(lessonId))
  }, [lessonId])

  // Explicit reset: wipe this lesson's scrollback and start clean.
  useEffect(() => {
    scrollbackCache.current[lessonId] = null
    setHistory(welcomeBanner(lessonId))
    setPwd('')
    setBranch('main')
    setFiles([])
    setBranches(['main'])
    setOfflineState(getInitialOfflineState(lessonId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger])

  // Hydrate prompt (branch/files/cwd) from the lesson's seeded sandbox state.
  useEffect(() => {
    if (!hydration) return
    if (hydration.branch !== undefined) setBranch(hydration.branch || 'main')
    if (hydration.files) setFiles(hydration.files)
    if (hydration.pwd !== undefined) setPwd(hydration.pwd || '')
  }, [hydration])

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

    // Lesson 8 (Fork & Contribute) is a pure GitHub-workflow simulation — fork and
    // pull requests aren't real local-git commands, so we run it entirely in-browser.
    if (lessonId === 8) {
      setIsExecuting(false)
      const result = simulateCommandOffline(rawCmd, offlineState, 8)
      const ns = result.nextState
      setOfflineState(ns)
      if (ns.branch) setBranch(ns.branch)   // keep the prompt's branch in sync
      if (result.output === 'CLEAR_CONSOLE') { setHistory([]); return }
      setHistory(prev => [...prev, { type: result.status === 'success' ? 'output' : 'error', text: result.output || '(No output)' }])
      const check = checkOfflineProgress(ns, 8)
      if (onSyncState) {
        onSyncState({ fork: ns.fork, subtasks: check.subtasks, verified: check.verified, validation_message: check.msg })
      }
      if (check.verified) {
        setHistory(prev => [...prev, { type: 'success', text: `✓ EXERCISE SOLVED: ${check.msg}` }])
        if (onSuccess) onSuccess()
      }
      return
    }

    // Intercept: git rebase -i — open modal instead of sending to backend
    const rebaseInteractiveMatch = rawCmd.match(/^git\s+rebase\s+-i/i)
    if (rebaseInteractiveMatch && onRebaseInteractive) {
        setIsExecuting(false)
        setBackendOnline(true)

        setHistory(prev => [...prev, {
        type: 'system',
        text: 'Opening interactive rebase editor… (Use the modal to arrange commits, then click Save & Execute)'
      }])
      // Prefer live backend commits; fall back to offline seed only when server is unreachable
      const commitsForModal = (liveCommits && liveCommits.length > 0) ? liveCommits : (offlineState?.commits || [])
      onRebaseInteractive(commitsForModal, sessionId)
      return
    }

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
        setBackendOnline(true)
        if (data.session_id) {
          setSessionId(data.session_id)
          localStorage.setItem("gitify_session_id", data.session_id)
          if (onSessionChange) onSessionChange(data.session_id)
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
          const sub = parts[1].toLowerCase()
          if (!GIT_SUBCOMMANDS.includes(sub)) {
            const suggestion = getGitSuggestion(sub)
            if (suggestion) {
              setHistory(prev => [...prev, {
                type: 'system',
                text: `Hint: Did you mean "git ${suggestion}"?`
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
            text: `✓ EXERCISE SOLVED: ${data.validation_message}`
          }])
          if (onSuccess) onSuccess()
        }
      })
      .catch(err => {
        setIsExecuting(false)
        const wasOnline = backendOnline   // only announce the switch once
        setBackendOnline(false)
        console.warn("Terminal server error, using offline mock simulation:", err)

        const result = simulateCommandOffline(rawCmd, offlineState, lessonId)
        const updatedOfflineState = result.nextState
        setOfflineState(updatedOfflineState)

        if (result.output === 'CLEAR_CONSOLE') {
          setHistory([])
          return
        }

        const lines = [
          {
            type: result.status === 'success' ? 'output' : 'error',
            text: result.output || '(No output)'
          }
        ]
        // Announce offline mode only on the first command after losing the server —
        // the header status pill shows it persistently after that.
        if (wasOnline) {
          lines.push({
            type: 'system',
            text: 'Server unreachable — switched to Offline Mode (commands simulated locally).'
          })
        }
        setHistory(prev => [...prev, ...lines])

        // Smart hint in offline mode too
        if (result.status === 'error') {
          const hint = getSmartHint(rawCmd, result.output, lessonId)
          if (hint) {
            setHistory(prev => [...prev, { type: 'system', text: hint }])
          }
        }

        // Typo suggestion in offline mode (parity with the live path)
        const offlineParts = rawCmd.split(/\s+/)
        if (offlineParts[0] === 'git' && offlineParts.length > 1) {
          const offlineSub = offlineParts[1].toLowerCase()
          if (!GIT_SUBCOMMANDS.includes(offlineSub)) {
            const suggestion = getGitSuggestion(offlineSub)
            if (suggestion) {
              setHistory(prev => [...prev, { type: 'system', text: `Hint: Did you mean "git ${suggestion}"?` }])
            }
          }
        }

        if (updatedOfflineState.pwd !== undefined) setPwd(updatedOfflineState.pwd)
        if (updatedOfflineState.branch !== undefined) setBranch(updatedOfflineState.branch)
        if (updatedOfflineState.files) setFiles(updatedOfflineState.files)
        if (updatedOfflineState.branches) setBranches(updatedOfflineState.branches)
        
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
          validation_message: checkResult.msg,
          staged: updatedOfflineState.staged || [],
          pushed_offline: updatedOfflineState.pushed_offline || false
        }

        if (onSyncState) {
          onSyncState(syncStatePayload)
        }

        if (checkResult.verified) {
          setHistory(prev => [...prev, { 
            type: 'success', 
            text: `✓ EXERCISE SOLVED (Offline): ${checkResult.msg}`
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
      const match = ALLOWED_BASE_CMDS.find(c => c.startsWith(text.toLowerCase()))
      if (match) {
        setInputValue(match + ' ')
      }
      return
    }

    // Completing git subcommands
    if (words[0] === 'git' && words.length === 2) {
      const match = GIT_SUBCOMMANDS.find(c => c.startsWith(currentWord.toLowerCase()))
      if (match) {
        setInputValue(`git ${match} `)
      }
      return
    }

    // Completing file names
    if (words.length > 1 && (
      (words[0] === 'git' && ['add', 'rm', 'restore', 'diff'].includes(words[1])) ||
      ['cat', 'rm', 'cd', 'head', 'tail', 'wc', 'cp', 'mv'].includes(words[0])
    )) {
      const match = files.find(f => f.toLowerCase().startsWith(currentWord.toLowerCase()))
      if (match) {
        words[words.length - 1] = match
        setInputValue(words.join(' ') + ' ')
      }
      return
    }

    // Completing branch names
    if (words.length > 1 && (['checkout', 'merge', 'rebase', 'switch'].includes(words[words.length - 2]))) {
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
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Terminal size={15} strokeWidth={2} /> Open Terminal Console</span>
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
          {/* Connection status pill. Lesson 8 is a designed in-browser simulation
              (fork/PR aren't real git), so it shows a neutral "Simulation" state
              instead of implying a server connection or failure. */}
          {lessonId === 8 ? (
            <div
              title="This lesson runs as an in-browser GitHub-workflow simulation"
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontSize: '0.7rem', fontWeight: '600',
                color: '#38bdf8',
                background: 'rgba(56,189,248,0.1)',
                border: '1px solid rgba(56,189,248,0.25)',
                padding: '2px 8px', borderRadius: '20px'
              }}
            >
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#38bdf8', display: 'inline-block', boxShadow: '0 0 6px #38bdf8'
              }} />
              Interactive Simulation
            </div>
          ) : (
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
          )}
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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><BookOpen size={13} strokeWidth={2} /> Cheatsheet</span>
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
              <BookOpen size={15} strokeWidth={2} /> Git Command Cheatsheet
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
    case 8:
      return [
        { cmd: "gh repo fork octo/awesome-lib", desc: "Fork: Create your own copy of the upstream project on your GitHub account." },
        { cmd: "git clone https://github.com/you/awesome-lib", desc: "Clone: Download your fork to your computer so you can edit it." },
        { cmd: "git checkout -b fix-bug", desc: "Branch: Make a dedicated branch for your change." },
        { cmd: "git commit -am \"fix the bug\"", desc: "Commit: Save your fix locally (stage + commit in one step)." },
        { cmd: "git push origin fix-bug", desc: "Push: Upload your branch to your fork on GitHub." },
        { cmd: "gh pr create", desc: "Pull request: Propose your change to the original upstream project." },
        { cmd: "gh pr merge", desc: "Merge: Accept the pull request into the upstream project." },
        { cmd: "gh repo sync", desc: "Sync: Pull the latest upstream changes back into your fork." }
      ]
    default:
      return []
  }
}
