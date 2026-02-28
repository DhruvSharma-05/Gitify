import React, { useState } from 'react'

const steps = [
  {
    id: 0,
    title: 'Level 1: The Main Branch',
    description: 'We start with a stable main branch. This is the foundation of our project.',
    command: 'git log --oneline',
    commits: [
      { id: 'c1', branch: 'main', x: 50, y: 250, message: 'Init' },
      { id: 'c2', branch: 'main', x: 150, y: 250, message: 'Setup' }
    ],
    branches: [
      { name: 'main', commitId: 'c2', color: '#3b82f6' }
    ],
    head: 'main'
  },
  {
    id: 1,
    title: 'Level 2: Feature Branch',
    description: 'Creates a new branch "feature/auth" from main to work on authentication.',
    command: 'git checkout -b feature/auth',
    commits: [
      { id: 'c1', branch: 'main', x: 50, y: 250, message: 'Init' },
      { id: 'c2', branch: 'main', x: 150, y: 250, message: 'Setup' }
    ],
    branches: [
      { name: 'main', commitId: 'c2', color: '#3b82f6' },
      { name: 'feature/auth', commitId: 'c2', color: '#10b981' }
    ],
    head: 'feature/auth'
  },
  {
    id: 2,
    title: 'Work on Feature',
    description: 'We make progress on the authentication feature independent of main.',
    command: 'git commit -m "Add Login"',
    commits: [
      { id: 'c1', branch: 'main', x: 50, y: 250, message: 'Init' },
      { id: 'c2', branch: 'main', x: 150, y: 250, message: 'Setup' },
      { id: 'c3', branch: 'feature/auth', x: 250, y: 150, message: 'Add Login' }
    ],
    branches: [
      { name: 'main', commitId: 'c2', color: '#3b82f6' },
      { name: 'feature/auth', commitId: 'c3', color: '#10b981' }
    ],
    head: 'feature/auth'
  },
  {
    id: 3,
    title: 'Level 3: Nested Branch',
    description: 'We find a bug! Create a nested branch "fix/login-bug" from feature/auth.',
    command: 'git checkout -b fix/login-bug',
    commits: [
      { id: 'c1', branch: 'main', x: 50, y: 250, message: 'Init' },
      { id: 'c2', branch: 'main', x: 150, y: 250, message: 'Setup' },
      { id: 'c3', branch: 'feature/auth', x: 250, y: 150, message: 'Add Login' }
    ],
    branches: [
      { name: 'main', commitId: 'c2', color: '#3b82f6' },
      { name: 'feature/auth', commitId: 'c3', color: '#10b981' },
      { name: 'fix/login-bug', commitId: 'c3', color: '#ec4899' }
    ],
    head: 'fix/login-bug'
  },
  {
    id: 4,
    title: 'Fixing the Bug',
    description: 'Commit the fix on the nested branch level (Level 3).',
    command: 'git commit -m "Fix validate"',
    commits: [
      { id: 'c1', branch: 'main', x: 50, y: 250, message: 'Init' },
      { id: 'c2', branch: 'main', x: 150, y: 250, message: 'Setup' },
      { id: 'c3', branch: 'feature/auth', x: 250, y: 150, message: 'Add Login' },
      { id: 'c4', branch: 'fix/login-bug', x: 350, y: 50, message: 'Fix validate' }
    ],
    branches: [
      { name: 'main', commitId: 'c2', color: '#3b82f6' },
      { name: 'feature/auth', commitId: 'c3', color: '#10b981' },
      { name: 'fix/login-bug', commitId: 'c4', color: '#ec4899' }
    ],
    head: 'fix/login-bug'
  },
  {
    id: 5,
    title: 'Parallel Work (Main)',
    description: 'Meanwhile, someone updates the README on the main branch (Level 1).',
    command: 'git checkout main && git commit -m "Docs"',
    commits: [
      { id: 'c1', branch: 'main', x: 50, y: 250, message: 'Init' },
      { id: 'c2', branch: 'main', x: 150, y: 250, message: 'Setup' },
      { id: 'c3', branch: 'feature/auth', x: 250, y: 150, message: 'Add Login' },
      { id: 'c4', branch: 'fix/login-bug', x: 350, y: 50, message: 'Fix validate' },
      { id: 'c5', branch: 'main', x: 350, y: 250, message: 'Docs' }
    ],
    branches: [
      { name: 'main', commitId: 'c5', color: '#3b82f6' },
      { name: 'feature/auth', commitId: 'c3', color: '#10b981' },
      { name: 'fix/login-bug', commitId: 'c4', color: '#ec4899' }
    ],
    head: 'main'
  },
  {
    id: 6,
    title: 'Merge Bugfix (Level 3 -> 2)',
    description: 'Merge the bug fix back into the feature branch.',
    command: 'git checkout feature/auth && git merge fix/login-bug',
    commits: [
      { id: 'c1', branch: 'main', x: 50, y: 250, message: 'Init' },
      { id: 'c2', branch: 'main', x: 150, y: 250, message: 'Setup' },
      { id: 'c3', branch: 'feature/auth', x: 250, y: 150, message: 'Add Login' },
      { id: 'c4', branch: 'fix/login-bug', x: 350, y: 50, message: 'Fix validate' },
      { id: 'c5', branch: 'main', x: 350, y: 250, message: 'Docs' },
      { id: 'c6', branch: 'feature/auth', x: 450, y: 150, message: 'Merge fix', isMerge: true }
    ],
    branches: [
      { name: 'main', commitId: 'c5', color: '#3b82f6' },
      { name: 'feature/auth', commitId: 'c6', color: '#10b981' },
      { name: 'fix/login-bug', commitId: 'c4', color: '#ec4899' }
    ],
    head: 'feature/auth',
    mergeLines: [
      { from: 'c3', to: 'c6' },
      { from: 'c4', to: 'c6' }
    ]
  },
  {
    id: 7,
    title: 'Final Merge (Level 2 -> 1)',
    description: 'Finally, merge the completed feature into main.',
    command: 'git checkout main && git merge feature/auth',
    commits: [
      { id: 'c1', branch: 'main', x: 50, y: 250, message: 'Init' },
      { id: 'c2', branch: 'main', x: 150, y: 250, message: 'Setup' },
      { id: 'c3', branch: 'feature/auth', x: 250, y: 150, message: 'Add Login' },
      { id: 'c4', branch: 'fix/login-bug', x: 350, y: 50, message: 'Fix validate' },
      { id: 'c5', branch: 'main', x: 350, y: 250, message: 'Docs' },
      { id: 'c6', branch: 'feature/auth', x: 450, y: 150, message: 'Merge fix', isMerge: true },
      { id: 'c7', branch: 'main', x: 550, y: 250, message: 'Merge auth', isMerge: true }
    ],
    branches: [
      { name: 'main', commitId: 'c7', color: '#3b82f6' },
      { name: 'feature/auth', commitId: 'c6', color: '#10b981' }
    ],
    head: 'main',
    mergeLines: [
      { from: 'c3', to: 'c6' },
      { from: 'c4', to: 'c6' },
      { from: 'c5', to: 'c7' },
      { from: 'c6', to: 'c7' }
    ]
  }
]

export default function BranchingLesson() {
  const [currentStep, setCurrentStep] = useState(0)
  const step = steps[currentStep]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleReset = () => {
    setCurrentStep(0)
  }

  // Draw connections between commits
  const renderConnections = () => {
    const connections = []
    const commits = step.commits

    // Draw main lines and parent connections
    commits.forEach((commit, i) => {
      // Find parent(s) based on logical flow
      // This is a simplified logic for the linear-ish flow of this lesson

      let parent = null;

      // Explicit parent logic based on IDs for this specific lesson structure
      if (commit.id === 'c2') parent = commits.find(c => c.id === 'c1');
      if (commit.id === 'c3') parent = commits.find(c => c.id === 'c2'); // feature from main
      if (commit.id === 'c4') parent = commits.find(c => c.id === 'c3'); // fix from feature
      if (commit.id === 'c5') parent = commits.find(c => c.id === 'c2'); // main continues from c2
      // Merges are handled by mergeLines, but we need the "main base" line connection too for merges
      // e.g. c6 is merge of c4 into c3. So c6 needs connection from c3 (its base) AND c4 (the incoming).
      // c7 is merge of c6 into c5. So c7 needs connection from c5 (its base) AND c6 (the incoming).

      // However, the `mergeLines` prop in the step data handles the VISUAL merge lines.
      // We just need standard flow lines here.

      if (commit.id === 'c6') parent = commits.find(c => c.id === 'c3'); // feature continues
      if (commit.id === 'c7') parent = commits.find(c => c.id === 'c5'); // main continues

      if (parent) {
        connections.push(
          <line
            key={`line-${parent.id}-${commit.id}`}
            x1={parent.x}
            y1={parent.y}
            x2={commit.x}
            y2={commit.y}
            stroke={commit.branch === 'main' ? '#3b82f6' : commit.branch === 'feature/auth' ? '#10b981' : '#ec4899'}
            strokeWidth="3"
            className="commit-line"
          />
        )
      }
    });

    // Draw explicitly defined merge lines (dashed usually, or specific color)
    if (step.mergeLines) {
      step.mergeLines.forEach((merge, idx) => {
        const fromCommit = commits.find(c => c.id === merge.from)
        const toCommit = commits.find(c => c.id === merge.to)
        if (fromCommit && toCommit) {
          connections.push(
            <line
              key={`merge-${idx}`}
              x1={fromCommit.x}
              y1={fromCommit.y}
              x2={toCommit.x}
              y2={toCommit.y}
              stroke="#8b5cf6" // Purple for merges
              strokeWidth="2"
              strokeDasharray="5,5"
              className="merge-line"
            />
          )
        }
      })
    }

    return connections
  }

  return (
    <div className="branching-lesson">
      <header className="lesson-header">
        <h1>{step.title}</h1>
        <p>Three levels of branching: Main, Feature, and Bugfix.</p>
      </header>

      <main className="lesson-content">
        {/* Step Info */}
        <div className="step-info">
          <div className="step-header">
            <span className="step-counter">Step {currentStep + 1} of {steps.length}</span>
          </div>
          <p className="step-description">{step.description}</p>
          {step.command && (
            <div className="command-box">
              <code>{step.command}</code>
            </div>
          )}
        </div>

        {/* Visualization */}
        <div className="branch-visualization">
          <svg width="100%" height="400" viewBox="0 0 600 300">
            {/* Background guides only for reference (optional) */}
            <line x1="0" y1="250" x2="600" y2="250" stroke="#f0f0f0" strokeWidth="1" strokeDasharray="4" />
            <line x1="0" y1="150" x2="600" y2="150" stroke="#f0f0f0" strokeWidth="1" strokeDasharray="4" />
            <line x1="0" y1="50" x2="600" y2="50" stroke="#f0f0f0" strokeWidth="1" strokeDasharray="4" />

            {/* Render connections first (behind commits) */}
            {renderConnections()}

            {/* Render commits */}
            {step.commits.map((commit) => (
              <g key={commit.id} className="commit-node">
                <circle
                  cx={commit.x}
                  cy={commit.y}
                  r="18"
                  fill={commit.isMerge ? '#8b5cf6' : commit.branch === 'main' ? '#3b82f6' : commit.branch === 'feature/auth' ? '#10b981' : '#ec4899'}
                  stroke="#fff"
                  strokeWidth="3"
                  className="commit-circle"
                />
                <text
                  x={commit.x}
                  y={commit.y + 35}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize="10"
                  fontFamily="monospace"
                  className="commit-message"
                >
                  {commit.message}
                </text>
              </g>
            ))}

            {/* Render branch labels */}
            {step.branches.map((branch) => {
              const commit = step.commits.find(c => c.id === branch.commitId)
              if (!commit) return null

              const isHead = step.head === branch.name

              return (
                <g key={branch.name}>
                  {/* Label Background */}
                  <rect
                    x={commit.x - 40}
                    y={commit.y - 45}
                    width="80"
                    height="24"
                    rx="12"
                    fill={branch.color}
                    opacity="0.9"
                    className="branch-label"
                  />
                  {/* Branch Name */}
                  <text
                    x={commit.x}
                    y={commit.y - 29}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    {branch.name}
                  </text>
                  {/* HEAD pointer */}
                  {isHead && (
                    <text
                      x={commit.x}
                      y={commit.y - 50}
                      textAnchor="middle"
                      fill="#fbbf24"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      HEAD ▼
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Navigation Controls */}
        <div className="lesson-controls">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="control-btn"
          >
            ← Back
          </button>
          <button
            onClick={handleReset}
            className="control-btn reset-btn"
          >
            ↻ Restart
          </button>
          <button
            onClick={handleNext}
            disabled={currentStep === steps.length - 1}
            className="control-btn"
          >
            Next →
          </button>
        </div>

        {/* Legend */}
        <div className="key-concepts">
          <div className="concepts-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div className="concept-card" style={{ borderColor: '#ec4899' }}>
              <h4 style={{ color: '#ec4899' }}>Level 3: Bugfix</h4>
              <p style={{ fontSize: '0.8rem' }}>Short-lived branch for quick fixes.</p>
            </div>
            <div className="concept-card" style={{ borderColor: '#10b981' }}>
              <h4 style={{ color: '#10b981' }}>Level 2: Feature</h4>
              <p style={{ fontSize: '0.8rem' }}>Longer running branch for new features.</p>
            </div>
            <div className="concept-card" style={{ borderColor: '#3b82f6' }}>
              <h4 style={{ color: '#3b82f6' }}>Level 1: Main</h4>
              <p style={{ fontSize: '0.8rem' }}>Stable production code.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
