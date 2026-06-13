import React, { useState, useEffect, useRef } from 'react'
import {
  Pencil, Package, HardDrive, Cloud, Flag,
  GitBranch, Zap, ShieldCheck, HelpCircle, Lightbulb,
  Copy, Play, Pause, RotateCw, FileText, Palette, Settings, Check
} from 'lucide-react'
import PretextCanvas from './PretextCanvas.jsx'

const STEPS = [
  {
    id: 'working',
    title: 'Workspace',
    subtitle: 'Step 1: Your Workspace (Working Directory)',
    Icon: Pencil,
    color: '#38bdf8', // Light blue
    analogy: 'Your desk with all your draft paperwork scattered around.',
    description: 'This is your local computer directory where you create, edit, and modify code. Git does not track these changes automatically. They exist only as raw files on your hard drive until you stage them.',
    command: null,
  },
  {
    id: 'staging',
    title: 'Staging Area',
    subtitle: 'Step 2: Preparing to Save',
    Icon: Package,
    color: '#f59e0b', // Amber/Orange
    analogy: 'A shipping box where you select and pack specific items to be shipped.',
    description: 'The Staging Area is a preview zone where you prepare changes for your next save. It acts as a safety buffer, letting you stage some file changes while leaving others out of the snapshot.',
    command: 'git add .',
  },
  {
    id: 'commit',
    title: 'Local Repository',
    subtitle: 'Step 3: Save a Snapshot',
    Icon: HardDrive,
    color: '#10b981', // Green
    analogy: 'Taking a permanent, dated photo of your project at this exact moment.',
    description: 'Committing saves a permanent, compressed snapshot of your staged files in your Local Repository. Each commit has a description and a unique ID (hash), building an immutable history of your project.',
    command: 'git commit -m "Add styles and setup configs"',
  },
  {
    id: 'push',
    title: 'Remote Repository',
    subtitle: 'Step 4: Share with the World',
    Icon: Cloud,
    color: '#8b5cf6', // Purple
    analogy: 'Uploading your photo album to a cloud backup and sharing it with your team.',
    description: 'Pushing uploads your local commit history to a Remote Repository on a server like GitHub. This secures your work in the cloud and lets your collaborators download and merge your changes.',
    command: 'git push origin main',
  },
  {
    id: 'complete',
    title: 'Complete Flow',
    subtitle: 'The Unified Workflow',
    Icon: Flag,
    color: '#a78bfa', // Lavender
    analogy: 'The continuous cycle of coding, staging, committing, and pushing.',
    description: 'This is the complete, core cycle of modern software development. You write edits, stage them, take a snapshot, and push them to share with your team.',
    command: null,
  }
]

export default function Intro({ onComplete }) {
  const [scrollTriggered, setScrollTriggered] = useState({})
  const sectionRefs = useRef({})
  const containerRef = useRef(null)
  const [showCompleteButton, setShowCompleteButton] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [animationTrigger, setAnimationTrigger] = useState(0)

  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length)
      setAnimationTrigger(Date.now())
    }, 4500)
    return () => clearInterval(timer)
  }, [isPlaying])

  const handleStepClick = (index) => {
    setActiveStep(index)
    setIsPlaying(false)
    setAnimationTrigger(Date.now())
  }

  const handleNext = () => {
    setActiveStep((prev) => (prev + 1) % STEPS.length)
    setIsPlaying(false)
    setAnimationTrigger(Date.now())
  }

  const handlePrev = () => {
    setActiveStep((prev) => (prev - 1 + STEPS.length) % STEPS.length)
    setIsPlaying(false)
    setAnimationTrigger(Date.now())
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }


  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('data-section')
          setScrollTriggered(prev => ({ ...prev, [id]: true }))
        }
      })
    }, { 
      threshold: 0.15,
      rootMargin: "0px 0px -120px 0px"
    })

    Object.values(sectionRefs.current).forEach(ref => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [])

  const handleScrollToEnd = () => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth' })
    setTimeout(() => setShowCompleteButton(true), 500)
  }

  const handleComplete = () => {
    containerRef.current?.classList.add('fade-out-intro')
    setTimeout(() => {
      onComplete()
    }, 600)
  }

  return (
    <div className="intro-fullpage" ref={containerRef}>
      {/* Premium Navbar with Logo */}
      <header className="intro-navbar">
        <div className="intro-logo">
          <div className="logo-morph-wrap">
            <svg viewBox="0 0 36 36" width="38" height="38" fill="none">
              {/* State 1: </> code brackets */}
              <g className="logo-state-code">
                <path d="M 10 6 L 3 18 L 10 30" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M 20 5 L 14 31" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round"/>
                <path d="M 26 6 L 33 18 L 26 30" stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
              </g>
              {/* State 2: clean git-branch mark (cyan main + purple feature) */}
              <g className="logo-state-git">
                {/* Main branch – cyan vertical */}
                <line x1="12" y1="7" x2="12" y2="29" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round"/>
                {/* Feature branch – purple curve peeling off up-right */}
                <path d="M 12 18 C 18 18, 24 16, 24 11" stroke="#8b5cf6" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
                {/* Nodes */}
                <circle cx="12" cy="7"  r="3.1" fill="#0D1117" stroke="#38bdf8" strokeWidth="2.4"/>
                <circle cx="12" cy="29" r="3.1" fill="#0D1117" stroke="#38bdf8" strokeWidth="2.4"/>
                <circle cx="24" cy="10" r="3.1" fill="#0D1117" stroke="#8b5cf6" strokeWidth="2.4"/>
              </g>
            </svg>
          </div>
          <span className="logo-text">Gitify</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="intro-hero">
        <div className="hero-content">
          <div className="hero-badge">Learn Git & GitHub</div>
          <h1 className="hero-title">
            Version Control<br />
            <span className="gradient-text">Made Visual</span>
          </h1>
          <p className="hero-subtitle">
            Understanding how code flows from your computer to the world
          </p>
          <button className="hero-cta" onClick={() => sectionRefs.current.problem?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
            Explore the Journey ↗
          </button>
        </div>
        <div className="hero-visual">
          <PretextCanvas scene="gitBasics" height={190} />
          <div className="mock-terminal">
            <div className="terminal-bar">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
              <span className="terminal-title">git-timeline.sh</span>
            </div>
            <div className="terminal-body">
              <code className="cmd">$ git log --graph</code>
              <div className="terminal-graph-layout">
                {/* SVG Graph Sidebar Column */}
                <div className="graph-sidebar">
                  <svg className="git-graph-svg" viewBox="0 0 45 288" fill="none">
                    <defs>
                      <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                      <linearGradient id="pink-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#db2777" />
                      </linearGradient>
                      <linearGradient id="green-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>

                    {/* Track lines — every endpoint lands exactly on a node center */}
                    {/* Blue track: main branch, continuous through (12,16)(12,208)(12,272) */}
                    <path d="M12 16 V272" stroke="url(#blue-grad)" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Pink track: forks main at (12,16) → feature lane (24,48)→(24,176) → merges back to main (12,208) */}
                    <path d="M12 16 C 12 32, 24 32, 24 48 L24 176 C 24 192, 12 192, 12 208" stroke="url(#pink-grad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    {/* Green track: forks feature at (24,80) → bugfix lane (36,112)→(36,240) → merges to main (12,272) */}
                    <path d="M24 80 C 24 96, 36 96, 36 112 L36 240 C 36 256, 12 256, 12 272" stroke="url(#green-grad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />

                    {/* Nodes (aligning center heights with commit rows: center of each row is 32 * index + 16px) */}
                    <circle cx="12" cy="16" r="4.5" fill="#fff" stroke="#38bdf8" strokeWidth="2.5" />
                    <circle cx="24" cy="48" r="4.5" fill="#fff" stroke="#ec4899" strokeWidth="2.5" />
                    <circle cx="24" cy="80" r="4.5" fill="#fff" stroke="#ec4899" strokeWidth="2.5" />
                    <circle cx="36" cy="112" r="4.5" fill="#fff" stroke="#34d399" strokeWidth="2.5" />
                    <circle cx="36" cy="144" r="4.5" fill="#fff" stroke="#34d399" strokeWidth="2.5" />
                    <circle cx="24" cy="176" r="4.5" fill="#fff" stroke="#ec4899" strokeWidth="2.5" />
                    <circle cx="12" cy="208" r="4.5" fill="#fff" stroke="#38bdf8" strokeWidth="2.5" />
                    <circle cx="36" cy="240" r="4.5" fill="#fff" stroke="#34d399" strokeWidth="2.5" />
                    <circle cx="12" cy="272" r="4.5" fill="#fff" stroke="#38bdf8" strokeWidth="2.5" />
                  </svg>
                </div>

                {/* Commit text details column */}
                <div className="commit-details">
                  <div className="hero-commit-row"><span className="hash">0578835</span> <span className="author-name">Kaman Names</span> <span className="desc">- Adding from staging flow</span></div>
                  <div className="hero-commit-row"><span className="hash">03b35d6</span> <span className="branch-pill">branch</span> <span className="merge-pill">merge</span> <span className="desc">Merge command branches</span></div>
                  <div className="hero-commit-row"><span className="hash">0462050</span> <span className="author-name">Kaman Names</span> <span className="desc">- code conversions validation</span></div>
                  <div className="hero-commit-row"><span className="hash">05648fa</span> <span className="author-name">Kaman Names</span> <span className="desc">- Refactor databases states</span></div>
                  <div className="hero-commit-row"><span className="hash">0300503</span> <span className="author-name">KamanNaev</span> <span className="desc">- Connection status check</span></div>
                  <div className="hero-commit-row"><span className="hash">085f8ab</span> <span className="author-name">Ramanns</span> <span className="desc">- Generate commits layout</span></div>
                  <div className="hero-commit-row"><span className="hash">06e6895</span> <span className="author-name">Ramanns</span> <span className="desc">- Generate visual tree items</span></div>
                  <div className="hero-commit-row"><span className="hash">075a8a5</span> <span className="author-name">Ramanni</span> <span className="desc">- Cleanup staging pools</span></div>
                  <div className="hero-commit-row"><span className="hash">0348891</span> <span className="author-name">KamanWides</span> <span className="desc">- Create commits logs</span></div>
                </div>
              </div>
            </div>
          </div>
          <div className="floating-blob blob-1"></div>
          <div className="floating-blob blob-2"></div>
        </div>
      </section>

      {/* Core Benefits Section */}
      <section className="intro-features-grid">
        <div className="section-title-centered">
          <span className="features-kicker">Supercharge Your Learning</span>
          <h2>Why Learn Git Visually?</h2>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><GitBranch size={26} strokeWidth={2} /></div>
            <h3>Visual Branching</h3>
            <p>Watch branches diverge, merge, and rebase in a clear visual tree. No more guessing what HEAD points to.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Zap size={26} strokeWidth={2} /></div>
            <h3>Instant Sandbox Feedback</h3>
            <p>Stage, commit, and push files in a sandbox and see them animate across the staging area and local repository immediately.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><ShieldCheck size={26} strokeWidth={2} /></div>
            <h3>Risk-Free Practice</h3>
            <p>Revert commits, rebase commits, and resolve merge conflicts safely without fear of breaking a real-world repository.</p>
          </div>
        </div>
      </section>

      {/* Section 1: The Problem */}
      <section 
        className={`intro-section intro-problem ${scrollTriggered.problem ? 'visible' : ''}`}
        data-section="problem"
        ref={el => sectionRefs.current.problem = el}
      >
        <div className="section-content">
          <div className="section-text">
            <h2>The Challenge</h2>
            <p>
              You've written amazing code on your computer. Now what? How do you save it safely, 
              share it with teammates, and keep track of everything that changed?
            </p>
            <p>
              Without version control, you'd be lost. With Git and GitHub, it's beautifully simple.
            </p>
          </div>
          <div className="section-visual challenge-visual">
            <div className="code-editor">
              <div className="editor-header">index.js</div>
              <div className="editor-lines">
                <div className="code-line">const hello = "world"</div>
                <div className="code-line">function greet()</div>
                <div className="code-line">  return hello</div>
                <div className="code-line">Code example</div>
              </div>
            </div>
            <div className="confusion-icons">
              <HelpCircle size={32} strokeWidth={2} />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Interactive Tour */}
      <section 
        className={`intro-section intro-interactive-tour ${scrollTriggered.tour ? 'visible' : ''}`}
        data-section="tour"
        ref={el => sectionRefs.current.tour = el}
      >
        <div className="tour-wrapper">
          <div className="section-title-centered">
            <span className="features-kicker">Interactive Git Journey</span>
            <h2>How Code Flows in Git</h2>
            <p>Understand the lifecycle of code through steps and live visual simulations.</p>
          </div>

          {/* Stepper progress indicator */}
          <div className="tour-stepper">
            <div className="stepper-line">
              <div 
                className="stepper-line-fill" 
                style={{ width: `${(activeStep / (STEPS.length - 1)) * 100}%` }}
              ></div>
            </div>
            {STEPS.map((step, idx) => (
              <button 
                key={step.id} 
                className={`step-node ${activeStep === idx ? 'active' : ''} ${idx < activeStep ? 'completed' : ''}`}
                onClick={() => handleStepClick(idx)}
                style={{ '--active-color': step.color }}
              >
                <div className="step-circle">
                  <span className="step-emoji"><step.Icon size={18} strokeWidth={2.2} /></span>
                  <span className="step-number">{idx + 1}</span>
                </div>
                <span className="step-node-label">{step.title}</span>
              </button>
            ))}
          </div>

          {/* Tour Card Content */}
          <div className="tour-content-card glass-panel">
            <div className="tour-content-grid">
              
              {/* Left Side: Info & Controls */}
              <div className="tour-text-panel">
                <div className="step-badge-indicator" style={{ backgroundColor: `${STEPS[activeStep].color}22`, color: STEPS[activeStep].color, display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                  {React.createElement(STEPS[activeStep].Icon, { size: 16, strokeWidth: 2.2 })} {STEPS[activeStep].title.toUpperCase()}
                </div>
                
                <h3 className="step-title-text">{STEPS[activeStep].subtitle}</h3>
                
                <p className="step-desc-text">{STEPS[activeStep].description}</p>
                
                <div className="step-analogy-box">
                  <span className="analogy-icon"><Lightbulb size={18} strokeWidth={2} /></span>
                  <div className="analogy-body">
                    <strong>Think of it as:</strong>
                    <p>{STEPS[activeStep].analogy}</p>
                  </div>
                </div>

                {STEPS[activeStep].command && (
                  <div className="step-command-box">
                    <span className="cmd-label">Terminal Command:</span>
                    <div className="cmd-line-wrapper">
                      <code>{STEPS[activeStep].command}</code>
                      <button 
                        className="copy-cmd-btn"
                        onClick={() => navigator.clipboard.writeText(STEPS[activeStep].command)}
                        title="Copy Command"
                      >
                        <Copy size={16} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Navigation and Play controls */}
                <div className="tour-controls">
                  <div className="nav-buttons">
                    <button className="tour-nav-btn prev" onClick={handlePrev}>
                      ← Back
                    </button>
                    <button className="tour-nav-btn next" onClick={handleNext}>
                      {activeStep === STEPS.length - 1 ? 'Start Again ↺' : 'Next Step →'}
                    </button>
                  </div>
                  <button 
                    className={`tour-play-btn ${isPlaying ? 'playing' : 'paused'}`} 
                    onClick={togglePlay}
                    title={isPlaying ? 'Pause Auto-Play' : 'Start Auto-Play'}
                  >
                    {isPlaying
                      ? <><Pause size={15} strokeWidth={2.2} /> Pause Auto-Tour</>
                      : <><Play size={15} strokeWidth={2.2} /> Play Auto-Tour</>}
                  </button>
                </div>
              </div>

              {/* Right Side: Visual Animation panel */}
              <div className="tour-visual-panel">
                <div className="visual-panel-header">
                  <span className="live-pill">● SIMULATION</span>
                  <button 
                    className="replay-btn" 
                    onClick={() => setAnimationTrigger(Date.now())}
                    title="Replay Animation"
                  >
                    <RotateCw size={15} strokeWidth={2.2} /> Replay
                  </button>
                </div>
                <div className="visual-panel-body">
                  {(() => {
                    switch (activeStep) {
                      case 0:
                        return (
                          <div className="visual-container workspace-anim" key={animationTrigger}>
                            <div className="mock-editor-window">
                              <div className="editor-window-header">
                                <span className="window-dot red"></span>
                                <span className="window-dot yellow"></span>
                                <span className="window-dot green"></span>
                                <span className="window-filename">App.jsx</span>
                              </div>
                              <div className="editor-window-body">
                                <div className="typing-code-line line-1"><span>const</span> Header = () =&gt; &#123;</div>
                                <div className="typing-code-line line-2">  <span>return</span> &lt;header&gt;Gitify&lt;/header&gt;</div>
                                <div className="typing-code-line line-3">&#125;</div>
                                <div className="typing-cursor"></div>
                              </div>
                            </div>
                            <div className="editor-file-status">
                              <div className="file-status-card modified">
                                <span className="status-badge modified">Modified</span>
                                <span className="status-name">App.jsx</span>
                              </div>
                              <div className="file-status-card modified delay-1">
                                <span className="status-badge modified">Modified</span>
                                <span className="status-name">styles.css</span>
                              </div>
                              <div className="file-status-card clean">
                                <span className="status-badge untracked">Untracked</span>
                                <span className="status-name">config.js</span>
                              </div>
                            </div>
                          </div>
                        )
                      case 1:
                        return (
                          <div className="visual-container staging-anim" key={animationTrigger}>
                            <div className="staging-columns">
                              <div className="stage-side">
                                <h4>Workspace</h4>
                                <div className="anim-file-card f-app sliding-1"><FileText size={14} strokeWidth={2} /> App.jsx</div>
                                <div className="anim-file-card f-styles sliding-2"><Palette size={14} strokeWidth={2} /> styles.css</div>
                                <div className="anim-file-card f-config clean"><Settings size={14} strokeWidth={2} /> config.js</div>
                              </div>
                              <div className="arrow-connector">
                                <div className="arrow-line"></div>
                                <div className="arrow-label">git add .</div>
                              </div>
                              <div className="stage-side">
                                <h4>Staging Box</h4>
                                <div className="staging-box-wrapper">
                                  <div className="anim-staged-card staged-1"><Package size={14} strokeWidth={2} /> App.jsx</div>
                                  <div className="anim-staged-card staged-2"><Package size={14} strokeWidth={2} /> styles.css</div>
                                  <span className="staging-box-empty">Empty</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      case 2:
                        return (
                          <div className="visual-container commit-anim" key={animationTrigger}>
                            <div className="commit-columns">
                              <div className="commit-stage-source">
                                <h4>Staged (Ready)</h4>
                                <div className="staged-pack animate-pack">
                                  <div className="pack-item">App.jsx</div>
                                  <div className="pack-item">styles.css</div>
                                  <span className="pack-label">git commit</span>
                                </div>
                              </div>
                              <div className="arrow-connector down">
                                <div className="arrow-line-down"></div>
                              </div>
                              <div className="commit-timeline-dest">
                                <h4>Local Commit History</h4>
                                <div className="anim-timeline">
                                  <div className="anim-timeline-node old animate-node-old-1">
                                    <span className="node-hash">a23c10f</span>
                                    <span className="node-msg">Initial commit</span>
                                  </div>
                                  <div className="anim-timeline-node old animate-node-old-2">
                                    <span className="node-hash">5bf312b</span>
                                    <span className="node-msg">Add visualizer base</span>
                                  </div>
                                  <div className="anim-timeline-node new-pulse">
                                    <span className="node-hash">7c91a0c</span>
                                    <span className="node-msg">Add styles and setup configs</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      case 3:
                        return (
                          <div className="visual-container push-anim" key={animationTrigger}>
                            <div className="push-layout">
                              <div className="local-timeline-column">
                                <h4>Local History</h4>
                                <div className="local-commits-stack">
                                  <div className="commit-node-bubble current-pushed-node">
                                    <span className="bubble-hash">7c91a0c</span>
                                    <span className="bubble-desc">Add styles...</span>
                                  </div>
                                  <div className="commit-node-bubble">
                                    <span className="bubble-hash">5bf312b</span>
                                    <span className="bubble-desc">Add visualizer...</span>
                                  </div>
                                </div>
                              </div>
                              <div className="push-arrow-track">
                                <div className="flying-commit">7c91a0c</div>
                                <div className="push-track-line"></div>
                                <span className="track-label">git push</span>
                              </div>
                              <div className="remote-cloud-column">
                                <h4>GitHub Cloud</h4>
                                <div className="cloud-wrapper">
                                  <div className="cloud-icon-large"><Cloud size={56} strokeWidth={1.6} /></div>
                                  <div className="cloud-pushed-status">
                                    <span className="cloud-success-badge"><Check size={13} strokeWidth={3} /> Updated</span>
                                    <div className="cloud-pushed-commit">Commit: 7c91a0c</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      case 4:
                        return (
                          <div className="visual-container complete-anim-grid" key={animationTrigger}>
                            <div className="diagram-grid">
                              <div className="diagram-node node-working animate-node-1">
                                <div className="d-icon"><Pencil size={24} strokeWidth={2} /></div>
                                <div className="d-label">Workspace</div>
                                <div className="d-sub">Local Edits</div>
                              </div>
                              <div className="diagram-connector-arrow animate-arrow-1">
                                <div className="c-line"></div>
                                <span className="c-text">git add</span>
                              </div>
                              <div className="diagram-node node-staging animate-node-2">
                                <div className="d-icon"><Package size={24} strokeWidth={2} /></div>
                                <div className="d-label">Staging Area</div>
                                <div className="d-sub">Prepared Changes</div>
                              </div>
                              <div className="diagram-connector-arrow animate-arrow-2">
                                <div className="c-line"></div>
                                <span className="c-text">git commit</span>
                              </div>
                              <div className="diagram-node node-commit animate-node-3">
                                <div className="d-icon"><HardDrive size={24} strokeWidth={2} /></div>
                                <div className="d-label">Local Repo</div>
                                <div className="d-sub">Version History</div>
                              </div>
                              <div className="diagram-connector-arrow animate-arrow-3">
                                <div className="c-line"></div>
                                <span className="c-text">git push</span>
                              </div>
                              <div className="diagram-node node-push animate-node-4">
                                <div className="d-icon"><Cloud size={24} strokeWidth={2} /></div>
                                <div className="d-label">GitHub Cloud</div>
                                <div className="d-sub">Remote Repo</div>
                              </div>
                            </div>
                          </div>
                        )
                      default:
                        return null
                    }
                  })()}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="intro-cta-section">
        <div className="cta-content">
          <h2>Ready to See It in Action?</h2>
          <p>Use the interactive demo to practice these concepts yourself. Push files through the complete workflow!</p>
          <button className="cta-button" onClick={handleComplete}>
            Start Exploring →
          </button>
        </div>
      </section>
    </div>
  )
}
