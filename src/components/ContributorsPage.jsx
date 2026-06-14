import React from 'react'
import { ArrowLeft, ExternalLink, Heart, Code, Paintbrush, Layers, ShieldCheck } from 'lucide-react'
import './ContributorsPage.css'

const GithubIcon = ({ size = 16, className = "" }) => (
  <svg 
    height={size} 
    width={size} 
    viewBox="0 0 16 16" 
    version="1.1" 
    aria-hidden="true" 
    className={className}
    fill="currentColor"
    style={{ display: 'inline-block', verticalAlign: 'text-bottom' }}
  >
    <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)

const contributors = [
  {
    name: 'Dhruv Sharma',
    username: 'DhruvSharma-05',
    role: 'Dictator of Code',
    icon: Code,
    color: '#38bdf8', // Sky Blue
    bio: 'Architected the core git terminal emulation and structured the interactive lessons. Firmly believes git is simple and gets physically annoyed when people don\'t understand interactive rebasing. Rejects PRs that have 1 space instead of 2.',
    contributions: ['Terminal Overlord', 'Lesson Architect', 'PR Rejecter', 'Git Gaslighting']
  },
  {
    name: 'Ashutosh Thakur',
    username: 'AshuArmada',
    role: 'CSS Magician & Pixel Pusher',
    icon: Paintbrush,
    color: '#34d399', 
    bio: 'Designed the UI and crafted the interactive lesson guides. Spent 40 hours trying to align a single dropdown and 30 seconds on the rest of the application. Used to survive on coffee, but now fuels his pixel-pushing purely  sheer willpower and patience.',
    contributions: ['Div Centering', 'Lesson Designer', 'Glow Addict', 'FPS Reducer']
  },
  {
    name: 'Anshika Tripathi',
    username: 'tripathianshika58',
    role: 'Developer & Bug Swatter',
    icon: Layers,
    color: '#a78bfa', 
    bio: 'Polished UI interactions and layout alignment. Inherited a codebase of absolute-positioned cards and kept her sanity intact (barely), powered by copious amounts of coffee. Hasn\'t written a massive chunk of this codebase *yet*, but is plotting a full repository takeover while fixing things the others broke.',
    contributions: ['Layout CPR', 'Takeover Planner', 'Coffee Consumption', 'Sanity Maintenance']
  },
  {
    name: 'Anmol',
    username: 'ajanm007',
    role: 'Code Deletion Expert',
    icon: Code,
    color: '#f87171', // Rose
    bio: 'Net-Negative Code Producer. Specializes in code deletion, maintaining a glorious record of deleting more lines of code than he writes. Believes the cleanest codebase is an empty repository.',
    contributions: ['Code Eraser', 'Negative Diff Specialist', 'Console.log Spam']
  },
  {
    name: 'Suhird',
    username: 'Suhird-08',
    role: 'Chief of README Custody',
    icon: ShieldCheck,
    color: '#60a5fa', // Blue
    bio: 'Wrote a single commit that changed a couple of words in the README file, then declared the project fully tested, containerized, and production-ready. Refuses to write code that actually runs.',
    contributions: ['README Custodian', 'Single Committer', 'Docker Illusionist']
  }
]

export default function ContributorsPage({ onBack }) {
  return (
    <div className="contributors-page">
      <div className="contributors-header-nav">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          Back to Playground
        </button>
      </div>

      <header className="contributors-hero">
        <div className="heart-wrapper" title="Powered by caffeine, panic, and stackoverflow.">
          <Heart className="heart-icon animate-pulse" size={24} fill="#f87171" color="#f87171" />
        </div>
        <h1>Meet the Culprits</h1>
        <p>The sleep-deprived, coffee-fueled team behind Gitify. We apologize for any merge conflicts we've caused in your repositories.</p>
      </header>

      <div className="contributors-grid">
        {contributors.map((c) => {
          const IconComponent = c.icon
          const avatarUrl = c.username 
            ? `https://github.com/${c.username}.png`
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=0D1117&color=8B949E&size=128`

          return (
            <div key={c.name} className="contributor-card glassmorphic">
              <div className="card-top-accent" style={{ background: c.color }} />
              
              <div className="avatar-container">
                <img 
                  src={avatarUrl} 
                  alt={`${c.name}'s avatar`} 
                  className="contributor-avatar"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=0D1117&color=8B949E&size=128`
                  }}
                />
                <div className="role-icon-badge" style={{ backgroundColor: c.color }}>
                  <IconComponent size={14} color="#0d1117" strokeWidth={3} />
                </div>
              </div>

              <h2 className="contributor-name">{c.name}</h2>
              {c.username && (
                <a 
                  href={`https://github.com/${c.username}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="github-handle"
                >
                  <GithubIcon size={14} />
                  @{c.username}
                </a>
              )}

              <div className="role-badge" style={{ borderColor: `${c.color}33`, color: c.color }}>
                {c.role}
              </div>

              <p className="contributor-bio">{c.bio}</p>

              <div className="contributions-title">Key Areas:</div>
              <div className="contributions-tags">
                {c.contributions.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>

              {c.username && (
                <a 
                  href={`https://github.com/${c.username}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="profile-link-btn"
                  style={{ '--hover-color': c.color }}
                >
                  <span>View GitHub Profile</span>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
