import React, { useState, useEffect } from 'react'

const steps = [
  {
    title: 'Welcome to GitHub Visual',
    content: 'This interactive demo will help you understand the basic flow of code in Git and GitHub.',
    action: 'Start Tutorial',
    highlight: null
  },
  {
    title: 'Working Directory',
    content: 'This is where you do your work. You create, edit, and delete files here. These changes are local to your computer and not yet tracked by Git.',
    action: 'Next: Staging',
    highlight: 'working'
  },
  {
    title: 'Staging Area (git add)',
    content: 'When you are happy with your changes, you "stage" them. This tells Git, "I want to include these changes in my next snapshot."',
    action: 'Next: Committing',
    highlight: 'staging'
  },
  {
    title: 'Local Repository (git commit)',
    content: 'A "commit" is a snapshot of your staged changes. It saves a permanent record of what the files looked like at that moment.',
    action: 'Next: Pushing',
    highlight: 'local'
  },
  {
    title: 'Remote Repository (git push)',
    content: 'Finally, you "push" your commits to a remote server (like GitHub). This shares your code with others and backs it up.',
    action: 'Finish & Explore',
    highlight: 'remote'
  }
]

export default function Intro({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setIsVisible(false)
      setTimeout(() => {
        onComplete()
      }, 500)
    }
  }

  if (!isVisible) return null

  const stepData = steps[currentStep]

  return (
    <div className={`intro-overlay ${isVisible ? 'fade-in' : 'fade-out'}`}>
      <div className="intro-card">
        <div className="git-diagram">
          <div className={`zone zone-working ${stepData.highlight === 'working' ? 'active' : ''}`}>
            <div className="zone-label">Working</div>
            {currentStep >= 1 && <div className="file-icon file-working">📄</div>}
          </div>
          <div className="arrow">➜</div>
          <div className={`zone zone-staging ${stepData.highlight === 'staging' ? 'active' : ''}`}>
            <div className="zone-label">Staging</div>
            {currentStep >= 2 && <div className="file-icon file-staging">📄</div>}
          </div>
          <div className="arrow">➜</div>
          <div className={`zone zone-local ${stepData.highlight === 'local' ? 'active' : ''}`}>
            <div className="zone-label">Local Repo</div>
            {currentStep >= 3 && <div className="file-icon file-commit">📦</div>}
          </div>
          <div className="arrow arrow-up">➜</div>
          <div className={`zone zone-remote ${stepData.highlight === 'remote' ? 'active' : ''}`}>
            <div className="zone-label">Remote</div>
            {currentStep >= 4 && <div className="file-icon file-remote">☁️</div>}
          </div>
        </div>

        <div className="intro-content">
          <div className="intro-progress">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`progress-dot ${index <= currentStep ? 'active' : ''}`}
              />
            ))}
          </div>

          <h2>{stepData.title}</h2>
          <p>{stepData.content}</p>

          <button className={`intro-button ${currentStep === 0 ? 'pulse' : ''}`} onClick={handleNext}>
            {stepData.action}
          </button>

          <div className="intro-actions">
            {currentStep > 0 && (
              <button className="intro-secondary" onClick={() => setCurrentStep(0)}>
                Restart
              </button>
            )}
            {currentStep > 0 && (
              <button className="intro-secondary" onClick={() => {
                setIsVisible(false)
                setTimeout(onComplete, 500)
              }}>
                Skip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
