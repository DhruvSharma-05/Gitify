import React from 'react'
import { CheckCircle, Users } from 'lucide-react'

const lessons = [
  { id: 0, title: 'Lesson 0: Git Basics', description: 'Interactive Tutorial' },
  { id: 1, title: 'Lesson 1: Visual Playground', description: 'Main Application' },
  { id: 2, title: 'Lesson 2: Advanced Branching', description: 'Three levels of nested branching' },
  { id: 3, title: 'Lesson 3: Merge Conflicts', description: 'Resolve competing edits safely' },
  { id: 4, title: 'Lesson 4: Git History & Time Travel', description: 'Inspect, jump, revert, and reset' },
  { id: 5, title: 'Lesson 5: Stash & Cherry-Pick', description: 'Shelve WIP and transplant commits' },
  { id: 6, title: 'Lesson 6: Remote Collaboration', description: 'Fetch, pull, PRs, forks, and push recovery' },
  { id: 7, title: 'Lesson 7: Rebase & Clean History', description: 'Rewrite commits into a clean story' },
  { id: 8, title: 'Lesson 8: Fork & Contribute', description: 'Fork, PR, and sync — visual & interactive' },
  { id: 9, title: 'Lesson 9: Git Bisect', description: 'Binary-search history to find the bad commit' }
]

export default function Sidebar({ isOpen, onClose, currentLesson, onSelectLesson, completedLessons = [] }) {
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
          <button className="close-btn" onClick={onClose} aria-label="Close sidebar">×</button>
        </div>

        <div className="lesson-list">
          {lessons.map(lesson => (
            <div
              key={lesson.id}
              className={`lesson-item ${currentLesson === lesson.id ? 'active' : ''} ${completedLessons.includes(lesson.id) ? 'completed' : ''}`}
              onClick={() => {
                onSelectLesson(lesson.id)
                onClose()
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>{lesson.title}</h3>
                {completedLessons.includes(lesson.id) && (
                  <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} strokeWidth={2.4} /> Solved</span>
                )}
              </div>
              <p>{lesson.description}</p>
            </div>
          ))}
        </div>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => {
              onSelectLesson('contributors')
              onClose()
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              width: '100%'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
            }}
          >
            <Users size={16} />
            Project Contributors
          </button>
          <a
            href="https://docs.github.com/en/get-started"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-link"
            style={{ textAlign: 'center', display: 'block', fontSize: '0.85rem', color: '#8b949e', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#f0f6fc'}
            onMouseOut={(e) => e.currentTarget.style.color = '#8b949e'}
          >
            GitHub Documentation
          </a>
        </div>
      </div>
    </>
  )
}
