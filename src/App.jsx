import React, { useState, useEffect } from 'react'
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

const lessonOrder = [0, 1, 2, 3, 4, 5, 6, 7]

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentLesson, setCurrentLesson] = useState(0)
  const [completedLessons, setCompletedLessons] = useState([])
  const [terminalSyncListener, setTerminalSyncListener] = useState(null)
  
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
  }, [])

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
        // Fallback local save
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
      ) : currentLesson === 2 ? (
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
        <>
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
        </>
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
          onSyncState={(state) => terminalSyncListener && terminalSyncListener(state)}
          onSuccess={() => handleVerifySuccess(currentLesson)}
        />
      )}

      <ContactInfo />
    </div>
  )
}
