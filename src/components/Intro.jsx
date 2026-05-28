import React, { useState, useEffect, useRef } from 'react'
import PretextCanvas from './PretextCanvas.jsx'

export default function Intro({ onComplete }) {
  const [scrollTriggered, setScrollTriggered] = useState({})
  const sectionRefs = useRef({})
  const containerRef = useRef(null)
  const [showCompleteButton, setShowCompleteButton] = useState(false)

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
          <svg className="logo-icon-svg" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>
            <rect x="6" y="6" width="20" height="20" rx="5" transform="rotate(45 16 16)" fill="url(#logo-grad)" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.5" />
            <line x1="12" y1="20" x2="12" y2="12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="12" cy="20" r="2.5" fill="#fff" />
            <circle cx="12" cy="12" r="2.5" fill="#fff" />
            <path d="M12 16 C 18 16, 20 15, 20 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="20" cy="12" r="2.5" fill="#fff" />
          </svg>
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

                    {/* Track lines */}
                    {/* Blue track: main branch */}
                    <path d="M12 16v256" stroke="url(#blue-grad)" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Pink track: feature branch */}
                    <path d="M12 48 C 24 64, 24 80, 24 112 C 24 144, 12 160, 12 176" stroke="url(#pink-grad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    {/* Green track: bugfix branch */}
                    <path d="M24 112 C 36 128, 36 144, 36 208 C 36 224, 12 240, 12 240" stroke="url(#green-grad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />

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
            <div className="feature-icon">🌿</div>
            <h3>Visual Branching</h3>
            <p>Watch branches diverge, merge, and rebase in a clear visual tree. No more guessing what HEAD points to.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Sandbox Feedback</h3>
            <p>Stage, commit, and push files in a sandbox and see them animate across the staging area and local repository immediately.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
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
              <span>❓</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Working Directory */}
      <section 
        className={`intro-section intro-working ${scrollTriggered.working ? 'visible' : ''}`}
        data-section="working"
        ref={el => sectionRefs.current.working = el}
      >
        <div className="section-content">
          <div className="section-visual working-stage">
            <div className="stage-box stage-working">
              <div className="stage-icon">✏️</div>
              <div className="stage-title">Working Directory</div>
            </div>
            <div className="file-examples">
              <div className="file-item animated-in-1">📄 App.jsx</div>
              <div className="file-item animated-in-2">🎨 styles.css</div>
              <div className="file-item animated-in-3">⚙️ config.js</div>
            </div>
          </div>
          <div className="section-text">
            <h2>Step 1: Your Workspace</h2>
            <p>
              This is where the magic starts. Your <strong>Working Directory</strong> is your local 
              computer where you create, edit, and modify files.
            </p>
            <div className="highlight-box">
              💡 <strong>Think of it as:</strong> Your desk with all your work scattered around
            </div>
            <p>
              These changes exist only on your machine. Git doesn't track them yet—you need to 
              explicitly tell Git you're happy with them.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Staging Area */}
      <section 
        className={`intro-section intro-staging ${scrollTriggered.staging ? 'visible' : ''}`}
        data-section="staging"
        ref={el => sectionRefs.current.staging = el}
      >
        <div className="section-content flow-reverse">
          <div className="section-text">
            <h2>Step 2: Preparing to Save</h2>
            <p>
              You review your changes and think, "Yes, these are ready!" Now you <strong>"git add"</strong> 
              them to the Staging Area.
            </p>
            <div className="highlight-box highlight-blue">
              📦 <strong>Think of it as:</strong> Putting selected items in a box before shipping
            </div>
            <p>
              The staging area is your safety net. You can stage some changes but not others. 
              This gives you full control over what goes into your next snapshot.
            </p>
            <p className="code-hint">Command: <code className="inline-code">git add .</code></p>
          </div>
          <div className="section-visual staging-stage">
            <div className="flow-sequence">
              <div className="flow-item">
                <div className="stage-box stage-working">
                  <div className="stage-icon">✏️</div>
                </div>
              </div>
              <div className="arrow-flow animated-arrow">→</div>
              <div className="flow-item">
                <div className="stage-box stage-staging">
                  <div className="stage-icon">📦</div>
                  <div className="stage-label">Staging</div>
                </div>
              </div>
            </div>
            <div className="file-stack">
              <div className="stack-item stack-1">App.jsx</div>
              <div className="stack-item stack-2">styles.css</div>
              <div className="stack-item stack-3">config.js</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Local Repository */}
      <section 
        className={`intro-section intro-commit ${scrollTriggered.commit ? 'visible' : ''}`}
        data-section="commit"
        ref={el => sectionRefs.current.commit = el}
      >
        <div className="section-content">
          <div className="section-visual commit-stage">
            <div className="commit-timeline">
              <div className="timeline-item">
                <div className="timeline-dot active"></div>
                <div className="timeline-content">
                  <div className="commit-message">First commit</div>
                  <div className="commit-time">2 mins ago</div>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot active"></div>
                <div className="timeline-content">
                  <div className="commit-message">Add styles</div>
                  <div className="commit-time">5 mins ago</div>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <div className="commit-message">You are here</div>
                </div>
              </div>
            </div>
          </div>
          <div className="section-text">
            <h2>Step 3: Save a Snapshot</h2>
            <p>
              <strong>"git commit"</strong> takes everything in the staging area and creates a permanent 
              snapshot in your Local Repository.
            </p>
            <div className="highlight-box highlight-green">
              ✓ <strong>Think of it as:</strong> Taking a photo of your project at this exact moment
            </div>
            <p>
              Each commit includes a message describing what changed. This creates a complete 
              history you can look back on anytime.
            </p>
            <p className="code-hint">Command: <code className="inline-code">git commit -m "Your message"</code></p>
          </div>
        </div>
      </section>

      {/* Section 5: Remote Repository */}
      <section 
        className={`intro-section intro-push ${scrollTriggered.push ? 'visible' : ''}`}
        data-section="push"
        ref={el => sectionRefs.current.push = el}
      >
        <div className="section-content flow-reverse">
          <div className="section-text">
            <h2>Step 4: Share with the World</h2>
            <p>
              Your commits are safe on your computer, but what about backups? What about your team? 
              <strong>"git push"</strong> uploads your commits to a remote server like GitHub.
            </p>
            <div className="highlight-box highlight-purple">
              ☁️ <strong>Think of it as:</strong> Uploading to a cloud backup + sharing portal
            </div>
            <p>
              GitHub is a remote repository. It's your project's home on the internet. Now everyone 
              can access your code, contribute, and you have a full backup.
            </p>
            <p className="code-hint">Command: <code className="inline-code">git push origin main</code></p>
          </div>
          <div className="section-visual push-stage">
            <div className="cloud-animation">
              <div className="local-repo">
                <div className="repo-icon">💾</div>
                <div className="repo-label">Your Computer</div>
              </div>
              <div className="push-arrow">
                <div className="arrow-stem"></div>
                <div className="arrow-head"></div>
              </div>
              <div className="remote-repo">
                <div className="repo-icon">☁️</div>
                <div className="repo-label">GitHub</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Flow Section */}
      <section 
        className={`intro-section intro-complete ${scrollTriggered.complete ? 'visible' : ''}`}
        data-section="complete"
        ref={el => sectionRefs.current.complete = el}
      >
        <div className="section-content center-flow">
          <h2>The Complete Flow</h2>
          <div className="complete-diagram">
            <div className="diagram-item diagram-1">
              <div className="item-icon">✏️</div>
              <div className="item-text">Edit Files<br/><span className="small-text">(Working Dir)</span></div>
            </div>
            <div className="diagram-arrow arrow-1"><span className="arrow-bounce">↓</span></div>
            <div className="diagram-item diagram-2">
              <div className="item-icon">📦</div>
              <div className="item-text">Stage Changes<br/><span className="small-text">(git add)</span></div>
            </div>
            <div className="diagram-arrow arrow-2"><span className="arrow-bounce">↓</span></div>
            <div className="diagram-item diagram-3">
              <div className="item-icon">✓</div>
              <div className="item-text">Commit<br/><span className="small-text">(git commit)</span></div>
            </div>
            <div className="diagram-arrow arrow-3"><span className="arrow-bounce">↓</span></div>
            <div className="diagram-item diagram-4">
              <div className="item-icon">☁️</div>
              <div className="item-text">Push to Remote<br/><span className="small-text">(git push)</span></div>
            </div>
          </div>
          <div className="completion-message">
            <p>🎉 <strong>That's the entire workflow!</strong></p>
            <p>From local edits to global collaboration—all in four simple steps.</p>
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
