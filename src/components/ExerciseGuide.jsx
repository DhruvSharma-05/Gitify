import React, { useState, useEffect } from 'react'
import './ExerciseGuide.css'
import { apiUrl, getInitialSubtasks, getInitialOfflineState } from '../api.js'

export default function ExerciseGuide({ 
  lessonId, 
  subtasks, 
  onSubtasksChange, 
  isExerciseMode, 
  onToggleMode, 
  onResetExercise, 
  isSolved,
  nextLessonTrigger
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load saved checkpoints on mount or lesson change
  useEffect(() => {
    if (!isExerciseMode) return

    fetch(apiUrl(`/api/exercises/checkpoints?lesson_id=${lessonId}&username=student`))
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success' && data.checkpoints && subtasks.length > 0) {
          const updated = subtasks.map(task => ({
            ...task,
            completed: data.checkpoints[task.id] !== undefined ? data.checkpoints[task.id] : task.completed
          }))
          onSubtasksChange(updated)
        }
      })
      .catch(err => console.warn("Could not load stored checkpoints:", err))
  }, [lessonId, isExerciseMode])

  const handleResetClick = () => {
    setLoading(true)
    setError('')
    fetch(apiUrl('/api/exercises/reset'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lesson_id: lessonId,
        username: 'student'
      })
    })
      .then(res => res.json())
      .then(data => {
        setLoading(false)
        if (data.status === 'success') {
          if (data.subtasks) {
            onSubtasksChange(data.subtasks, data.sync_state)
          }
          if (onResetExercise) {
            onResetExercise()
          }
        } else {
          setError('Failed to reset sandbox.')
        }
      })
      .catch(err => {
        setLoading(false)
        console.warn("Backend unavailable, resetting sandbox locally:", err)
        const localTasks = getInitialSubtasks(lessonId)
        const localState = getInitialOfflineState(lessonId)
        onSubtasksChange(localTasks, {
          branch: localState.branch,
          files: localState.files,
          stashes: localState.stashes,
          picked: [],
          pwd: localState.pwd,
          commits_graph: localState.commits,
          file_contents: localState.fileContents
        })
        if (onResetExercise) {
          onResetExercise()
        }
      })
  }

  const handleModeToggle = (mode) => {
    if (mode === 'exercise') {
      onToggleMode(true)
      // Automatically trigger reset/setup when switching to exercise mode
      setLoading(true)
      fetch(apiUrl('/api/exercises/reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          username: 'student'
        })
      })
        .then(res => res.json())
        .then(data => {
          setLoading(false)
          if (data.status === 'success') {
            if (data.subtasks) {
              onSubtasksChange(data.subtasks, data.sync_state)
            }
            if (onResetExercise) {
              onResetExercise()
            }
          }
        })
        .catch(err => {
          setLoading(false)
          console.warn("Backend unavailable, initializing exercise locally:", err)
          const localTasks = getInitialSubtasks(lessonId)
          const localState = getInitialOfflineState(lessonId)
          onSubtasksChange(localTasks, {
            branch: localState.branch,
            files: localState.files,
            stashes: localState.stashes,
            picked: [],
            pwd: localState.pwd,
            commits_graph: localState.commits,
            file_contents: localState.fileContents
          })
          if (onResetExercise) {
            onResetExercise()
          }
        })
    } else {
      onToggleMode(false)
    }
  }

  // Get specific instructions for each lesson
  const getExerciseDetails = () => {
    switch (lessonId) {
      case 1:
        return {
          goal: "Initialize a new repository, stage the starter files, snapshot them, and push them to the local remote.",
          tips: "Commands needed: 'git init', 'git add index.js App.jsx', 'git commit -m \"first commit\"', 'git push origin main'."
        }
      case 2:
        return {
          goal: "Create a feature branch named 'feature/auth', make commits on it, switch back to main, and merge the branch.",
          tips: "Commands needed: 'git checkout -b feature/auth', edit files, 'git commit -a -m \"auth changes\"', 'git checkout main', 'git merge feature/auth'."
        }
      case 3:
        return {
          goal: " ALEX (on main) and SAM (on feature/ui) edited the theme parameter in config.js concurrently. Trigger a merge conflict, resolve the conflict, stage config.js, and finalize the merge commit.",
          tips: "Commands: 'git merge feature/ui' (triggers conflict). Inspect config.js, choose our theme line, then 'git add config.js' and 'git commit'."
        }
      case 4:
        return {
          goal: "A bad commit 'Skip null metric check' broke the application build. Navigate history, find the commit hash, and safely undo it.",
          tips: "Check 'git log' to find the commit. Run 'git revert <commit-hash>' to create a safe compensating commit."
        }
      case 5:
        return {
          goal: "Save your uncommitted checkout and styles changes using Git Stash. Switch branches to review a hotfix, cherry-pick the tax rounding fix commit, then restore your stashed files.",
          tips: "Run 'git stash' to save your work. Checkout the payments branch if not there, cherry-pick the hotfix hash, and run 'git stash pop' to restore your changes."
        }
      case 6:
        return {
          goal: "You are out of sync with origin/main. Fetch classmate updates, pull/rebase to put your local changes on top, and push to remote.",
          tips: "Type 'git fetch' first. Then pull with rebase via 'git pull --rebase' to linearize history, and finally 'git push origin main'."
        }
      case 7:
        return {
          goal: "Rewrite payments branch commit history. Squash typo tweaks, drop the temporary debug state commit, and reword the card decline commit.",
          tips: "Run 'git rebase -i HEAD~5'. Set action to 'squash' for 'Fix typo', 'drop' for 'debug payment state', and 'reword' for declined cards."
        }
      default:
        return {
          goal: "Complete git tasks in terminal sandbox.",
          tips: ""
        }
    }
  }

  const getLearningSuggestions = () => {
    switch (lessonId) {
      case 0:
      case 1:
        return [
          "Type 'git status' in the terminal to inspect your workspace files.",
          "Create a new file by typing 'touch playground.js' and notice how Git detects it as untracked.",
          "Stage your new file using 'git add playground.js' or 'git add .'.",
          "Commit your staged file by typing 'git commit -m \"my custom commit\"' to save a snapshot!"
        ]
      case 2:
        return [
          "Type 'git branch' to see your active and available branches.",
          "Create a new branch by running 'git branch design-refresh'.",
          "Switch to your new branch using 'git checkout design-refresh'.",
          "Type 'git checkout main' to return to your main development line."
        ]
      case 3:
        return [
          "Type 'git branch -a' to see the main and feature/ui branches.",
          "Inspect the config.js file contents by running 'cat config.js'.",
          "Switch branches ('git checkout feature/ui' and 'git checkout main') and watch how config.js changes live on your disk!"
        ]
      case 4:
        return [
          "Type 'git log' or 'git log --oneline' to view the full history of commits.",
          "Compare changes between the last two commits by running 'git diff HEAD~1'.",
          "View details of a specific commit using 'git show <hash>'."
        ]
      case 5:
        return [
          "Type 'git stash list' to see if there are any shelved changes.",
          "Create a temporary file, stage it, and run 'git stash' to save it to your stash stack.",
          "Type 'git stash pop' to restore your stashed changes back to your workspace."
        ]
      case 6:
        return [
          "Type 'git remote -v' to view the configured remote URL locations.",
          "Run 'git fetch' to download references and updates from the remote repository.",
          "Run 'git branch -r' to see all tracked remote branches."
        ]
      case 7:
        return [
          "Type 'git log --oneline --graph' to see the linear (or branched) commit history graph.",
          "Run 'git rebase main' to practice rebasing a branch onto main.",
          "If a rebase goes wrong, run 'git rebase --abort' to cancel it completely."
        ]
      default:
        return [
          "Type 'git status' to check your current working tree status.",
          "Use 'ls' to view files in the current sandbox directory."
        ]
    }
  }

  const details = getExerciseDetails()

  return (
    <div className="exercise-guide-panel glassmorphic">
      <div className="panel-mode-selector">
        <button 
          className={`mode-tab ${!isExerciseMode ? 'active' : ''}`}
          onClick={() => handleModeToggle('learning')}
        >
          🎓 Learning Mode
        </button>
        <button 
          className={`mode-tab ${isExerciseMode ? 'active' : ''}`}
          onClick={() => handleModeToggle('exercise')}
        >
          ⚔️ Exercise Mode
        </button>
      </div>

      {!isExerciseMode ? (
        <div className="mode-content learning-mode-content">
          <h3>Interactive Sandbox Playground</h3>
          <p>
            You are currently in <strong>Learning Mode</strong>. Feel free to use the visual controls or type Git commands in the terminal below. No grading is active!
          </p>
          
          <div className="learning-suggestions-box" style={{ marginTop: '16px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#38bdf8' }}>💡 Things to Try:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {getLearningSuggestions().map((suggestion, idx) => (
                <li key={idx} style={{ lineHeight: '1.4' }}>{suggestion}</li>
              ))}
            </ul>
          </div>

          <div className="guide-cta-box" style={{ marginTop: '20px' }}>
            <h4>Ready to test your skills?</h4>
            <p>Switch to <strong>Exercise Mode</strong> to attempt the graded lab checklist for this lesson!</p>
            <button className="cta-btn" onClick={() => handleModeToggle('exercise')}>
              Start Exercise
            </button>
          </div>
        </div>
      ) : (
        <div className="mode-content exercise-mode-content">
          <div className="exercise-objective">
            <h3>Lesson Objective</h3>
            <p className="objective-text">{details.goal}</p>
          </div>

          <div className="exercise-checklist-section">
            <h3>Progress Checklist</h3>
            {loading ? (
              <div className="loading-checklists">
                <span className="spinner-ring"></span>
                <span>Setting up sandbox baseline...</span>
              </div>
            ) : subtasks.length === 0 ? (
              <p className="empty-subtasks">Initialize the repository or execute a command to see checkboxes.</p>
            ) : (
              <div className="checklist-items">
                {subtasks.map(task => (
                  <div key={task.id} className={`checklist-item ${task.completed ? 'completed' : ''}`}>
                    <div className="checkbox-indicator">
                      {task.completed ? (
                        <svg className="checkmark" viewBox="0 0 52 52">
                          <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                          <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                        </svg>
                      ) : (
                        <span className="checkbox-empty"></span>
                      )}
                    </div>
                    <span className="task-title">{task.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="exercise-help">
            <h4>💡 Student Tip</h4>
            <p>{details.tips}</p>
          </div>

          {error && <div className="guide-error">{error}</div>}

          <div className="guide-actions">
            <button 
              className="reset-sandbox-btn" 
              onClick={handleResetClick}
              disabled={loading}
            >
              🔄 Reset Sandbox Baseline
            </button>
          </div>

          {isSolved && (
            <div className="celebration-overlay glassmorphic">
              <div className="celebration-card">
                <div className="congrats-icon">🏆</div>
                <h2>Lesson Completed!</h2>
                <p>You have successfully cleared all verification checkpoints on the Git sandbox directory.</p>
                <button className="next-lesson-nav-btn" onClick={nextLessonTrigger}>
                  Proceed to Next Lesson
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
