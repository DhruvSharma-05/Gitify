import React, { useState, useEffect } from 'react'
import { Search, Settings, Lightbulb, Loader, CheckCircle, GripVertical } from 'lucide-react'
import Flow from './components/Flow.jsx'
import Intro from './components/Intro.jsx'
import Sidebar from './components/Sidebar.jsx'
import BranchingLesson from './components/BranchingLesson.jsx'
import MergeConflictsLesson from './components/MergeConflictsLesson.jsx'
import HistoryLesson from './components/HistoryLesson.jsx'
import StashCherryPickLesson from './components/StashCherryPickLesson.jsx'
import RemoteCollaborationLesson from './components/RemoteCollaborationLesson.jsx'
import RebaseLesson from './components/RebaseLesson.jsx'
import TerminalShell from './components/TerminalShell.jsx'
import ExerciseGuide from './components/ExerciseGuide.jsx'
import FileInspector from './components/FileInspector.jsx'
import LiveCommitGraph from './components/LiveCommitGraph.jsx'
import PretextCanvas from './components/PretextCanvas.jsx'
import { apiUrl, getInitialOfflineState, getInitialSubtasks } from './api.js'

const lessonOrder = [0, 1, 2, 3, 4, 5, 6, 7]

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentLesson, setCurrentLesson] = useState(0)
  const [completedLessons, setCompletedLessons] = useState([])
  const [terminalSyncListener, setTerminalSyncListener] = useState(null)
  
  // Exercise and Verification State
  const [subtasks, setSubtasks] = useState([])
  const [isExerciseMode, setIsExerciseMode] = useState(false)
  const [isSolved, setIsSolved] = useState(false)
  const [resetTrigger, setResetTrigger] = useState(0)
  const [sessionId, setSessionId] = useState(null)

  // Live IDE dynamic states
  const [fileContents, setFileContents] = useState({})
  const [commitsGraph, setCommitsGraph] = useState([])
  const [workspaceFiles, setWorkspaceFiles] = useState([])
  // Snapshot fed to the terminal so its prompt reflects this lesson's seeded branch/files
  const [terminalHydration, setTerminalHydration] = useState(null)

  // Commit details inspection modal state
  const [selectedCommit, setSelectedCommit] = useState(null)
  const [commitDetails, setCommitDetails] = useState('')
  const [isLoadingCommit, setIsLoadingCommit] = useState(false)

  // Interactive rebase modal state
  const [rebaseModalOpen, setRebaseModalOpen] = useState(false)
  const [rebasePlan, setRebasePlan] = useState([]) // [{ hash, message, action }]
  const [rebaseSessionId, setRebaseSessionId] = useState(null)
  const [isRebasing, setIsRebasing] = useState(false)
  const [rebaseDragIdx, setRebaseDragIdx] = useState(null)

  const currentLessonIndex = lessonOrder.indexOf(currentLesson)
  const nextLesson = lessonOrder[currentLessonIndex + 1]

  // Initialize Session ID
  useEffect(() => {
    let activeSession = localStorage.getItem("gitify_session_id")
    if (!activeSession || activeSession === "null" || activeSession === "undefined") {
      activeSession = `session_${Math.random().toString(36).substring(2, 11)}`
      localStorage.setItem("gitify_session_id", activeSession)
    }
    setSessionId(activeSession)
  }, [])

  // Query progression on start
  useEffect(() => {
    fetch(apiUrl('/api/progress?username=student'))
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.progress) {
          const completedIds = data.progress
            .filter(p => p.completed)
            .map(p => p.lesson_id)
          setCompletedLessons(completedIds)
        }
      })
      .catch(err => console.warn("Backend not running or progress unavailable:", err))
  }, [])

  // On entering a lesson: clear transient UI, then hydrate that lesson's own
  // sandbox (its branch, files, commit DAG, checklist) from the backend. Each
  // lesson keeps its own independent terminal/repo, seeded on first visit.
  useEffect(() => {
    setIsSolved(false)
    setSubtasks([])
    setIsExerciseMode(false)
    setFileContents({})
    setCommitsGraph([])
    setWorkspaceFiles([])
    setTerminalHydration(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    if (!sessionId || currentLesson === 0) return

    let cancelled = false
    fetch(apiUrl('/api/lessons/enter'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: currentLesson, session_id: sessionId, username: 'student' })
    })
      .then(res => { if (!res.ok) throw new Error(`enter ${res.status}`); return res.json() })
      .then(data => {
        if (cancelled || data.status !== 'success') return
        const s = data.sync_state || {}
        if (s.commits_graph) setCommitsGraph(s.commits_graph)
        if (s.file_contents) setFileContents(s.file_contents)
        if (s.files) setWorkspaceFiles(s.files)
        if (data.subtasks) setSubtasks(data.subtasks)
        setTerminalHydration({ branch: s.branch, files: s.files, pwd: s.pwd, nonce: Date.now() })
      })
      .catch(err => {
        if (cancelled) return
        console.warn('Lesson enter failed, using offline seed:', err)
        const local = getInitialOfflineState(currentLesson)
        setCommitsGraph(local.commits || [])
        setFileContents(local.fileContents || {})
        setWorkspaceFiles(local.files || [])
        setSubtasks(getInitialSubtasks(currentLesson))
        setTerminalHydration({ branch: local.branch, files: local.files, pwd: '', nonce: Date.now() })
      })
    return () => { cancelled = true }
  }, [currentLesson, sessionId])

  // Close whichever modal is open on Escape (rebase stays open mid-run)
  useEffect(() => {
    if (!selectedCommit && !rebaseModalOpen) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (selectedCommit) setSelectedCommit(null)
      if (rebaseModalOpen && !isRebasing) setRebaseModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedCommit, rebaseModalOpen, isRebasing])

  const handleLessonSelect = (lessonId) => {
    setCurrentLesson(lessonId)
  }

  const handleVerifySuccess = (lessonId) => {
    if (completedLessons.includes(lessonId)) return
    
    // Sync completion with Python backend
    fetch(apiUrl('/api/progress'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson_id: lessonId, completed: true, score: 100, username: 'student' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setCompletedLessons(prev => [...prev, lessonId])
        }
      })
      .catch(err => {
        console.warn("Backend unavailable, saving locally:", err)
        setCompletedLessons(prev => [...prev, lessonId])
      })
  }

  const handleIntroComplete = () => {
    handleVerifySuccess(0)
    setCurrentLesson(1)
  }

  const handleNextLesson = () => {
    if (nextLesson === undefined) return
    setCurrentLesson(nextLesson)
  }

  const handleFileEdit = (filename, newContent, syncState) => {
    setFileContents(prev => ({ ...prev, [filename]: newContent }))
    if (syncState) {
      if (syncState.files) setWorkspaceFiles(syncState.files)
      if (syncState.file_contents) setFileContents(syncState.file_contents)
      if (syncState.commits_graph) setCommitsGraph(syncState.commits_graph)
    }
  }

  const handleRebaseInteractive = (commits, sid) => {
    // Build initial plan from live commits (most recent N, reverse chron = oldest first for rebase-todo)
    const plan = [...commits]
      .reverse()
      .slice(0, 5)
      .map(c => ({ hash: c.hash, full_hash: c.full_hash, message: c.message, action: 'pick' }))
    setRebasePlan(plan)
    setRebaseSessionId(sid)
    setRebaseModalOpen(true)
  }

  const handleRebaseDragStart = (idx) => setRebaseDragIdx(idx)
  const handleRebaseDragOver = (e, idx) => {
    e.preventDefault()
    if (rebaseDragIdx === null || rebaseDragIdx === idx) return
    const updated = [...rebasePlan]
    const [moved] = updated.splice(rebaseDragIdx, 1)
    updated.splice(idx, 0, moved)
    setRebasePlan(updated)
    setRebaseDragIdx(idx)
  }
  const handleRebaseDragEnd = () => setRebaseDragIdx(null)

  const submitRebasePlan = () => {
    setIsRebasing(true)
    fetch(apiUrl('/api/terminal/rebase-interactive'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: rebaseSessionId || sessionId,
        lesson_id: currentLesson,
        plan: rebasePlan.map(c => ({ hash: c.hash, action: c.action, message: c.message }))
      })
    })
      .then(res => {
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        return res.json()
      })
      .then(data => {
        setIsRebasing(false)
        setRebaseModalOpen(false)
        if (data.sync_state) {
          if (data.sync_state.files) setWorkspaceFiles(data.sync_state.files)
          if (data.sync_state.file_contents) setFileContents(data.sync_state.file_contents)
          if (data.sync_state.commits_graph) setCommitsGraph(data.sync_state.commits_graph)
        }
        if (data.subtasks) setSubtasks(data.subtasks)
        if (data.verified) {
          setIsSolved(true)
          handleVerifySuccess(currentLesson)
        }
      })
      .catch(err => {
        console.warn('Rebase backend offline, applying locally:', err)
        setIsRebasing(false)
        // Offline: filter commits by plan actions
        const kept = rebasePlan
          .filter(c => c.action !== 'drop')
          .map(c => ({ ...c, is_head: false }))
        if (kept.length) kept[kept.length - 1].is_head = true
        setCommitsGraph(kept)
        setRebaseModalOpen(false)
      })
  }

  const handleCommitSelect = (commit) => {
    setSelectedCommit(commit)
    setIsLoadingCommit(true)
    setCommitDetails('')
    
    fetch(apiUrl('/api/terminal/commit-details'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commit_hash: commit.full_hash || commit.hash,
        session_id: sessionId,
        lesson_id: currentLesson
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("Commit details not found or backend offline");
        return res.json()
      })
      .then(data => {
        setIsLoadingCommit(false)
        if (data.status === 'success') {
          setCommitDetails(data.details)
        } else {
          setCommitDetails("Failed to fetch details for this commit.")
        }
      })
      .catch(err => {
        setIsLoadingCommit(false)
        console.warn("Could not fetch commit details:", err)
        setCommitDetails(`Commit: ${commit.hash}\nMessage: ${commit.message}\nBranch: ${Array.isArray(commit.branches) && commit.branches.length ? commit.branches.join(', ') : 'none'}\n\n(Note: Connect to the running FastAPI backend to view full file diffs)`)
      })
  }

  const handleTerminalSync = (syncState) => {
    // 1. Sync visualizer
    if (terminalSyncListener) {
      terminalSyncListener(syncState)
    }
    // 2. Sync exercise subtasks checkpoints
    if (syncState.subtasks) {
      setSubtasks(syncState.subtasks)
      if (syncState.subtasks.length > 0 && syncState.subtasks.every(t => t.completed)) {
        setIsSolved(true)
        handleVerifySuccess(currentLesson)
      } else {
        setIsSolved(false)
      }
    }
    // 3. Cache dynamic commits graph, file lists and inspector contents
    if (syncState.file_contents) {
      setFileContents(syncState.file_contents)
    }
    if (syncState.commits_graph) {
      setCommitsGraph(syncState.commits_graph)
    }
    if (syncState.files) {
      setWorkspaceFiles(syncState.files)
    }
  }

  return (
    <div className="app">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentLesson={currentLesson}
        onSelectLesson={handleLessonSelect}
        completedLessons={completedLessons}
      />

      <button className="menu-btn" onClick={() => setIsSidebarOpen(true)} aria-label="Open sidebar menu">
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {currentLesson === 0 ? (
        <Intro onComplete={handleIntroComplete} />
      ) : (
        <div className="lesson-container-split" style={{ display: 'flex', gap: '24px', minHeight: '520px', alignItems: 'stretch', width: '100%', padding: '0 10px' }}>
          
          {/* Column 1: Visualizer and Live Commit DAG */}
          <div className="lesson-left-content" style={{ flex: 1.5, minWidth: '0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Dynamic Commit SVG DAG */}
            {commitsGraph.length > 0 && (
              <LiveCommitGraph commits={commitsGraph} onSelectCommit={handleCommitSelect} />
            )}

            {currentLesson === 2 ? (
              <BranchingLesson onSuccess={() => handleVerifySuccess(2)} setTerminalSyncListener={setTerminalSyncListener} />
            ) : currentLesson === 3 ? (
              <MergeConflictsLesson onSuccess={() => handleVerifySuccess(3)} setTerminalSyncListener={setTerminalSyncListener} />
            ) : currentLesson === 4 ? (
              <HistoryLesson onSuccess={() => handleVerifySuccess(4)} setTerminalSyncListener={setTerminalSyncListener} />
            ) : currentLesson === 5 ? (
              <StashCherryPickLesson onSuccess={() => handleVerifySuccess(5)} setTerminalSyncListener={setTerminalSyncListener} />
            ) : currentLesson === 6 ? (
              <RemoteCollaborationLesson onSuccess={() => handleVerifySuccess(6)} setTerminalSyncListener={setTerminalSyncListener} />
            ) : currentLesson === 7 ? (
              <RebaseLesson onSuccess={() => handleVerifySuccess(7)} setTerminalSyncListener={setTerminalSyncListener} />
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '8px' }}>
                    <a
                      href="https://docs.github.com/en/get-started"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="header-btn"
                    >
                      GitHub Docs
                    </a>
                  </div>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: '700', color: '#f0f6fc', textAlign: 'center' }}>GitHub Visual — Interactive demo</h2>
                  <p style={{ margin: 0, color: '#8b949e', fontSize: '0.88rem', textAlign: 'center' }}>Click actions to see files move through working/stage/commit/push.</p>
                </div>
                <PretextCanvas scene="playgroundFlow" height={150} />
                <main>
                  <Flow onSuccess={() => handleVerifySuccess(1)} setTerminalSyncListener={setTerminalSyncListener} />
                </main>
              </div>
            )}
          </div>

          {/* Column 2: Code File Inspector (Active only in Graded Exercise Mode) */}
          {isExerciseMode && (
            <div className="lesson-middle-inspector" style={{ flex: 1, minWidth: '280px', maxWidth: '380px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              <FileInspector
                files={workspaceFiles}
                fileContents={fileContents}
                sessionId={sessionId}
                lessonId={currentLesson}
                onFileEdit={handleFileEdit}
              />
            </div>
          )}
          
          {/* Column 3: Sidebar Checklists */}
          <div className="lesson-right-sidebar" style={{ flex: 0.9, minWidth: '300px', maxWidth: '380px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            <ExerciseGuide
              lessonId={currentLesson}
              sessionId={sessionId}
              subtasks={subtasks}
              onSubtasksChange={(updated, syncState) => {
                setSubtasks(updated)
                if (updated.length > 0 && updated.every(t => t.completed)) {
                  setIsSolved(true)
                  handleVerifySuccess(currentLesson)
                } else {
                  setIsSolved(false)
                }
                if (syncState) {
                  if (syncState.file_contents) setFileContents(syncState.file_contents)
                  if (syncState.commits_graph) setCommitsGraph(syncState.commits_graph)
                  if (syncState.files) setWorkspaceFiles(syncState.files)
                }
              }}
              isExerciseMode={isExerciseMode}
              onToggleMode={(mode) => {
                // Unified model: learning and exercise share the same per-lesson
                // sandbox. Toggling only reveals the grading overlay — it never
                // wipes the terminal. Use "Reset Sandbox Baseline" for a clean slate.
                setIsExerciseMode(mode)
              }}
              onResetExercise={() => {
                setResetTrigger(prev => prev + 1)
                setIsSolved(false)
              }}
              isSolved={isSolved}
              nextLessonTrigger={handleNextLesson}
            />
          </div>
        </div>
      )}

      {nextLesson !== undefined && (
        <nav className="lesson-next-nav" aria-label="Lesson navigation">
          <button className="lesson-next-btn" onClick={handleNextLesson}>
            Next lesson
            <span>Lesson {nextLesson}</span>
          </button>
        </nav>
      )}

      {currentLesson !== 0 && (
        <TerminalShell
          lessonId={currentLesson}
          onSyncState={handleTerminalSync}
          onSuccess={() => handleVerifySuccess(currentLesson)}
          resetTrigger={resetTrigger}
          onRebaseInteractive={handleRebaseInteractive}
          liveCommits={commitsGraph}
          onSessionChange={setSessionId}
          hydration={terminalHydration}
        />
      )}

      {selectedCommit && (
        <div 
          className="modal-backdrop" 
          onClick={() => setSelectedCommit(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="modal-content glassmorphic"
            role="dialog"
            aria-modal="true"
            aria-label="Commit inspection"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(22, 27, 34, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Search size={22} strokeWidth={2} color="#38bdf8" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Commit Inspection</h3>
                  <code style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{selectedCommit.full_hash || selectedCommit.hash}</code>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCommit(null)} 
                aria-label="Close modal"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8b949e',
                  fontSize: '1.8rem',
                  cursor: 'pointer',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            {/* Details Body */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
              {isLoadingCommit ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '40px 0', color: '#8b949e' }}>
                  <span className="spinner-ring" style={{ width: '30px', height: '30px' }}></span>
                  <span>Fetching git show details from sandbox...</span>
                </div>
              ) : (
                <pre 
                  style={{
                    margin: 0,
                    padding: '16px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                    fontFamily: "'Fira Code', 'Consolas', monospace",
                    fontSize: '0.82rem',
                    whiteSpace: 'pre-wrap',
                    overflowX: 'auto'
                  }}
                >
                  {commitDetails}
                </pre>
              )}
            </div>

            {/* Footer */}
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
              <button 
                onClick={() => setSelectedCommit(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Rebase Modal */}
      {rebaseModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => !isRebasing && setRebaseModalOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
            zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Interactive rebase editor"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(22, 27, 34, 0.97)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px', padding: '24px', maxWidth: '680px', width: '100%',
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={18} strokeWidth={2} /> Interactive Rebase Editor</h3>
                <code style={{ fontSize: '0.78rem', color: '#38bdf8' }}>git rebase -i HEAD~{rebasePlan.length}</code>
              </div>
              <button onClick={() => setRebaseModalOpen(false)} aria-label="Close rebase editor"
                style={{ background: 'transparent', border: 'none', color: '#8b949e', fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* Info banner */}
            <div style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px', fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lightbulb size={15} strokeWidth={2} style={{ flexShrink: 0, color: '#fbbf24' }} /> <span>Set each commit's action: <strong style={{color:'#38bdf8'}}>pick</strong> = keep, <strong style={{color:'#a78bfa'}}>squash</strong> = merge into previous, <strong style={{color:'#f87171'}}>drop</strong> = delete, <strong style={{color:'#fbbf24'}}>reword</strong> = rename</span>
            </div>

            {/* Commit rows */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {rebasePlan.map((commit, idx) => (
                <div
                  key={commit.hash}
                  draggable={!isRebasing}
                  onDragStart={() => handleRebaseDragStart(idx)}
                  onDragOver={(e) => handleRebaseDragOver(e, idx)}
                  onDragEnd={handleRebaseDragEnd}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: rebaseDragIdx === idx ? 'rgba(56,189,248,0.08)' : commit.action === 'drop' ? 'rgba(248,113,113,0.06)' : commit.action === 'squash' ? 'rgba(167,139,250,0.07)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${ rebaseDragIdx === idx ? 'rgba(56,189,248,0.4)' : commit.action === 'drop' ? 'rgba(248,113,113,0.2)' : commit.action === 'squash' ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '8px', padding: '10px 12px', cursor: isRebasing ? 'not-allowed' : 'grab',
                    transition: 'background 0.15s, border-color 0.15s'
                  }}
                >
                  <span style={{ color: '#475569', cursor: 'grab', userSelect: 'none', lineHeight: 1, display: 'inline-flex' }} title="Drag to reorder"><GripVertical size={16} strokeWidth={2} /></span>
                  <span style={{ color: '#475569', fontSize: '0.75rem', minWidth: '16px' }}>{idx + 1}</span>
                  <select
                    value={commit.action}
                    onChange={e => setRebasePlan(prev => prev.map((c, i) => i === idx ? { ...c, action: e.target.value } : c))}
                    style={{
                      background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
                      color: commit.action === 'drop' ? '#f87171' : commit.action === 'squash' ? '#a78bfa' : commit.action === 'reword' ? '#fbbf24' : '#38bdf8',
                      borderRadius: '5px', padding: '4px 8px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer'
                    }}
                    aria-label={`Action for commit ${commit.hash}`}
                  >
                    <option value="pick">pick</option>
                    <option value="squash">squash</option>
                    <option value="reword">reword</option>
                    <option value="drop">drop</option>
                  </select>
                  <code style={{ color: '#64748b', fontSize: '0.75rem', minWidth: '52px' }}>{commit.hash}</code>
                  <span style={{ color: commit.action === 'drop' ? '#64748b' : '#e2e8f0', fontSize: '0.85rem', textDecoration: commit.action === 'drop' ? 'line-through' : 'none', flex: 1 }}>
                    {commit.message}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
              <button onClick={() => setRebaseModalOpen(false)} disabled={isRebasing}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '8px 18px', borderRadius: '7px', cursor: 'pointer', fontWeight: '600' }}>
                Cancel
              </button>
              <button onClick={submitRebasePlan} disabled={isRebasing}
                style={{ background: 'linear-gradient(90deg,#38bdf8,#6366f1)', border: 'none', color: '#fff', padding: '8px 22px', borderRadius: '7px', cursor: isRebasing ? 'not-allowed' : 'pointer', fontWeight: '700', opacity: isRebasing ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                {isRebasing
                  ? <><Loader size={15} strokeWidth={2.4} className="spin-icon" /> Rebasing…</>
                  : <><CheckCircle size={15} strokeWidth={2.4} /> Save & Execute</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
