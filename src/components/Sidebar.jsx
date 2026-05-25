import React from 'react'

const lessons = [
  { id: 0, title: 'Lesson 0: Git Basics', description: 'Interactive Tutorial' },
  { id: 1, title: 'Lesson 1: Visual Playground', description: 'Main Application' },
  { id: 2, title: 'Lesson 2: Advanced Branching', description: 'Three levels of nested branching' },
  { id: 3, title: 'Lesson 3: Merge Conflicts', description: 'Resolve competing edits safely' },
  { id: 4, title: 'Lesson 4: Git History & Time Travel', description: 'Inspect, jump, revert, and reset' },
  { id: 5, title: 'Lesson 5: Remote Collaboration', description: 'Fetch, pull, PRs, forks, and push recovery' },
  { id: 6, title: 'Lesson 6: Rebase & Clean History', description: 'Rewrite commits into a clean story' }
]

export default function Sidebar({ isOpen, onClose, currentLesson, onSelectLesson }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Menu</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="lesson-list">
          {lessons.map(lesson => (
            <div
              key={lesson.id}
              className={`lesson-item ${currentLesson === lesson.id ? 'active' : ''}`}
              onClick={() => {
                onSelectLesson(lesson.id)
                onClose()
              }}
            >
              <h3>{lesson.title}</h3>
              <p>{lesson.description}</p>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <a
            href="https://docs.github.com/en/get-started"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-link"
          >
            GitHub Documentation
          </a>
        </div>
      </div>
    </>
  )
}
