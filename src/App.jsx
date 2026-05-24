import React, { useState } from 'react'
import Flow from './components/Flow.jsx'
import Intro from './components/Intro.jsx'
import Sidebar from './components/Sidebar.jsx'
import ContactInfo from './components/ContactInfo.jsx'
import BranchingLesson from './components/BranchingLesson.jsx'
import MergeConflictsLesson from './components/MergeConflictsLesson.jsx'
import HistoryLesson from './components/HistoryLesson.jsx'

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentLesson, setCurrentLesson] = useState(0)

  const handleLessonSelect = (lessonId) => {
    setCurrentLesson(lessonId)
  }

  const handleIntroComplete = () => {
    setCurrentLesson(1)
  }

  return (
    <div className="app">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentLesson={currentLesson}
        onSelectLesson={handleLessonSelect}
      />

      <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {currentLesson === 0 ? (
        <Intro onComplete={handleIntroComplete} />
      ) : currentLesson === 2 ? (
        <BranchingLesson />
      ) : currentLesson === 3 ? (
        <MergeConflictsLesson />
      ) : currentLesson === 4 ? (
        <HistoryLesson />
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
            <Flow />
          </main>
        </>
      )}

      <ContactInfo />
    </div>
  )
}
