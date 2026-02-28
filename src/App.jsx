import React, { useState, useEffect } from 'react'
import Flow from './components/Flow.jsx'
import Intro from './components/Intro.jsx'
import Sidebar from './components/Sidebar.jsx'
import ContactInfo from './components/ContactInfo.jsx'
import BranchingLesson from './components/BranchingLesson.jsx'

export default function App() {
  const [showIntro, setShowIntro] = useState(false) // Only for overlay mode (legacy/initial load)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentLesson, setCurrentLesson] = useState(1) // Default to Main App (Lesson 1)

  useEffect(() => {
    // Initial check for first-time visitors
    const introSeen = localStorage.getItem('intro_seen')
    if (!introSeen) {
      setCurrentLesson(0) // Start with Lesson 0 for new users
    }
  }, [])

  const handleLessonSelect = (lessonId) => {
    setCurrentLesson(lessonId)
    // If selecting Lesson 0, we can reuse the Intro component logic directly or as a page
  }

  const handleIntroComplete = () => {
    localStorage.setItem('intro_seen', 'true')
    setCurrentLesson(1) // Go to main app after finishing
  }

  return (
    <div className="app">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentLesson={currentLesson}
        onSelectLesson={handleLessonSelect}
      />

      {/* Menu Button */}
      <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {currentLesson === 0 ? (
        /* Lesson 0: Intro (Tutorial) - Render directly as the view */
        <Intro onComplete={handleIntroComplete} />
      ) : currentLesson === 2 ? (
        /* Lesson 2: Branching & Merging */
        <BranchingLesson />
      ) : (
        /* Lesson 1: Main App */
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
            <h1>GitHub Visual — Interactive demo</h1>
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
