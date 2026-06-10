import React, { useState, useEffect, useRef } from 'react'
import Flow from './components/Flow.jsx'
import Intro from './components/Intro.jsx'
import Sidebar from './components/Sidebar.jsx'
import ContactInfo from './components/ContactInfo.jsx'
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

const lessonOrder = [0, 1, 2, 3, 4, 5, 6, 7]

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentLesson, setCurrentLesson] = useState(() => {
    const saved = localStorage.getItem("gitify_current_lesson")
    if (saved !== null) {
      const parsed = parseInt(saved, 10)
      if (!isNaN(parsed)) return parsed
    }
    return 0
  })
  const [completedLessons, setCompletedLessons] = useState([])
  const [terminalSyncListener, setTerminalSyncListener] = useState(null)
  
  // Exercise and Verification State
  const [subtasks, setSubtasks] = useState([])
  const [isExerciseMode, setIsExerciseMode] = useState(false)
  const [isSolved, setIsSolved] = useState(false)
  const [resetTrigger, setResetTrigger] = useState(0)
  const isFirstRender = useRef(true)

  // Live IDE dynamic states
  const [fileContents, setFileContents] = useState({})
  const [commitsGraph, setCommitsGraph] = useState([])
  const [workspaceFiles, setWorkspaceFiles] = useState([])

  const currentLessonIndex = lessonOrder.indexOf(currentLesson)
  const nextLesson = lessonOrder[currentLessonIndex + 1]

  // Query progression on start
  useEffect(() => {
    fetch('http://localhost:8000/api/progress?username=student')
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

    // Disable browser scroll restoration on load
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  // Reset exercise state when moving lessons
  useEffect(() => {
    setIsSolved(false)
    setSubtasks([])
    setIsExerciseMode(false)
    setFileContents({})
    setCommitsGraph([])
    setWorkspaceFiles([])
    
    if (isFirstRender.current) {
      window.scrollTo({ top: 0 })
      isFirstRender.current = false
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Reset backend sandbox directory to baseline WITHOUT clearing progress in database
    if (currentLesson !== 0) {
      fetch('http://localhost:8000/api/exercises/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: currentLesson,
          username: 'student',
          clear_progress: false
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.sync_state) {
          if (data.sync_state.file_contents) setFileContents(data.sync_state.file_contents)
          if (data.sync_state.commits_graph) setCommitsGraph(data.sync_state.commits_graph)
          if (data.sync_state.files) setWorkspaceFiles(data.sync_state.files)
          if (data.subtasks) setSubtasks(data.subtasks)
        }
      })
      .catch(err => console.warn("Could not reset backend sandbox on lesson change:", err))
    }
  }, [currentLesson])

  // Save current lesson to localStorage
  useEffect(() => {
    localStorage.setItem("gitify_current_lesson", currentLesson.toString())
  }, [currentLesson])


  const handleLessonSelect = (lessonId) => {
    setCurrentLesson(lessonId)
  }

  const handleVerifySuccess = (lessonId) => {
    if (completedLessons.includes(lessonId)) return
    
    // Sync completion with Python backend
    fetch('http://localhost:8000/api/progress', {
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

      <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
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
            {isExerciseMode && commitsGraph.length > 0 && (
              <LiveCommitGraph commits={commitsGraph} />
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
              <div style={{ flex: 1 }}>
                <header>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <a
                      href="https://docs.github.com/en/get-started"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="header-btn"
                    >
                      GitHub Docs
                    </a>
                  </div>
                  <h1>GitHub Visual - Interactive demo</h1>
                  <p>Click actions to see files move through working/stage/commit/push.</p>
                </header>
                <main>
                  <Flow onSuccess={() => handleVerifySuccess(1)} setTerminalSyncListener={setTerminalSyncListener} />
                </main>
              </div>
            )}
          </div>

          {/* Column 2: Code File Inspector (Active only in Graded Exercise Mode) */}
          {isExerciseMode && (
            <div className="lesson-middle-inspector" style={{ flex: 1, minWidth: '280px', maxWidth: '380px' }}>
              <FileInspector files={workspaceFiles} fileContents={fileContents} />
            </div>
          )}
          
          {/* Column 3: Sidebar Checklists */}
          <div className="lesson-right-sidebar" style={{ flex: 0.9, minWidth: '300px', maxWidth: '380px' }}>
            <ExerciseGuide
              lessonId={currentLesson}
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
                setIsExerciseMode(mode)
                if (mode) {
                  setResetTrigger(prev => prev + 1)
                }
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

      {nextLesson !== undefined && currentLesson !== 0 && (
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
          isExerciseMode={isExerciseMode}
        />
      )}

      <ContactInfo />
    </div>
  )
}
