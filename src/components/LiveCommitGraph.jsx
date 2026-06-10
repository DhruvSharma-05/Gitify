import React, { useMemo, useState, useEffect, useRef } from 'react'

export default function LiveCommitGraph({ commits = [], onSelectCommit }) {
  const [hoveredNode, setHoveredNode] = useState(null)
  const [animatingHashes, setAnimatingHashes] = useState(new Set())
  const seenHashesRef = useRef(new Set())

  useEffect(() => {
    const fresh = commits.filter(c => !seenHashesRef.current.has(c.hash)).map(c => c.hash)
    if (fresh.length > 0) {
      fresh.forEach(h => seenHashesRef.current.add(h))
      setAnimatingHashes(new Set(fresh))
      const t = setTimeout(() => setAnimatingHashes(new Set()), 500)
      return () => clearTimeout(t)
    }
  }, [commits])

  const parsedGraph = useMemo(() => {
    if (!commits || commits.length === 0) return null

    // 1. Sort commits chronologically (git log is reverse chronological, so reverse it)
    const chronoCommits = [...commits].reverse()
    
    // 2. Assign coordinate lanes (vertical lines) dynamically
    const branchLanes = { 'main': 0, 'master': 0 }
    let laneCounter = 0
    // hashToLane resolves both short and full hashes
    const hashToLane = {}

    // Process in chronological order (oldest first) so parents are resolved before children
    chronoCommits.forEach(commit => {
      const branchLabel = commit.branches.find(b => b !== 'HEAD')
      let lane = 0

      if (branchLabel) {
        if (branchLanes[branchLabel] === undefined) {
          laneCounter++
          branchLanes[branchLabel] = laneCounter
        }
        lane = branchLanes[branchLabel]
      } else if (commit.parents.length > 0) {
        // Inherit lane from first known parent (parent is earlier in chronoCommits)
        for (const pHash of commit.parents) {
          const resolved = hashToLane[pHash] ?? hashToLane[commit.full_hash?.slice(0, pHash.length) === pHash ? commit.full_hash : pHash]
          if (resolved !== undefined) { lane = resolved; break }
        }
      }

      hashToLane[commit.hash] = lane
      if (commit.full_hash) hashToLane[commit.full_hash] = lane
    })

    const nodes = chronoCommits.map((commit, idx) => {
      const lane = hashToLane[commit.hash] ?? 0
      const branchLabel = commit.branches.find(b => b !== 'HEAD') || ''
      const x = 50 + idx * 85
      const y = 50 + lane * 60

      return {
        ...commit,
        x,
        y,
        lane,
        branchLabel
      }
    })

    // 3. Connect nodes with lines from parents
    const links = []
    nodes.forEach(node => {
      node.parents.forEach(pHash => {
        const parentNode = nodes.find(n => n.hash === pHash || n.full_hash.startsWith(pHash))
        if (parentNode) {
          // Curved Bezier path between coordinates
          const d = `M ${parentNode.x} ${parentNode.y} C ${(parentNode.x + node.x) / 2} ${parentNode.y}, ${(parentNode.x + node.x) / 2} ${node.y}, ${node.x} ${node.y}`
          links.push({
            id: `${parentNode.hash}-${node.hash}`,
            path: d,
            isMerge: node.parents.length > 1
          })
        }
      })
    })

    return { nodes, links }
  }, [commits])

  if (!parsedGraph || parsedGraph.nodes.length === 0) {
    return (
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '140px',
          background: 'rgba(0,0,0,0.15)',
          borderRadius: '10px',
          color: '#64748b',
          fontSize: '0.85rem',
          border: '1px dashed rgba(255,255,255,0.05)',
          margin: '10px 0'
        }}
      >
        <span>No commits in repository history yet. Initializing repo to draw live commits...</span>
      </div>
    )
  }

  const { nodes, links } = parsedGraph

  // Determine width based on number of nodes to allow side-scrolling
  const width = Math.max(500, nodes.length * 85 + 100)
  const height = Math.max(160, Math.max(...nodes.map(n => n.y)) + 60)

  return (
    <div 
      className="live-commit-graph-wrapper"
      style={{
        background: 'rgba(15, 23, 42, 0.3)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '16px',
        margin: '12px 0 24px 0',
        overflowX: 'auto',
        overflowY: 'hidden',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '8px' }}>
        🌲 Live Git History DAG
      </div>
      <svg 
        width={width} 
        height={height} 
        style={{ overflow: 'visible', display: 'block' }}
      >
        {/* Render links */}
        {links.map(link => (
          <path
            key={link.id}
            d={link.path}
            fill="none"
            stroke={link.isMerge ? '#a78bfa' : '#475569'}
            strokeWidth="3.5"
            strokeDasharray={link.isMerge ? '4 2' : 'none'}
            opacity="0.85"
            style={{ transition: 'all 0.3s ease' }}
          />
        ))}

        {/* Hovered commit tooltip — rendered first (behind nodes) so nodes stay on top */}
        {hoveredNode && (() => {
          const msg = hoveredNode.message.length > 38 ? `${hoveredNode.message.slice(0, 36)}…` : hoveredNode.message
          const tipW = Math.max(100, msg.length * 6.2 + 20)
          const tipX = Math.min(Math.max(hoveredNode.x - tipW / 2, 4), width - tipW - 4)
          const tipY = hoveredNode.y - 62
          return (
            <g className="commit-tooltip" style={{ pointerEvents: 'none' }}>
              <rect x={tipX} y={tipY} width={tipW} height={36} rx="5" fill="rgba(15,23,42,0.97)" stroke="#475569" strokeWidth="1" />
              <text x={tipX + tipW / 2} y={tipY + 14} fill="#e2e8f0" fontSize="9.5" fontWeight="600" fontFamily="monospace" textAnchor="middle">{msg}</text>
              <text x={tipX + tipW / 2} y={tipY + 28} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">{hoveredNode.full_hash?.slice(0, 8) || hoveredNode.hash}</text>
            </g>
          )
        })()}

        {/* Render nodes */}
        {nodes.map(node => {
          const glowFilter = node.is_head ? 'drop-shadow(0px 0px 8px #10b981)' : 'none'
          const nodeColor = node.is_head ? '#10b981' : node.parents.length > 1 ? '#a78bfa' : '#38bdf8'
          const nodeSize = node.is_head ? '9' : '7.5'

          const isAnimating = animatingHashes.has(node.hash)

          return (
            <g
              key={node.hash}
              className={`commit-node-group${isAnimating ? ' commit-node-new' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`Commit ${node.hash}: ${node.message}`}
              onClick={() => onSelectCommit && onSelectCommit(node)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCommit && onSelectCommit(node);
                }
              }}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ transition: 'all 0.3s ease', outline: 'none' }}
            >
              {/* Highlight circle ring */}
              {node.is_head && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="13"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  opacity="0.5"
                  className="head-pulse"
                  style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                />
              )}

              {/* Core commit dot */}
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeSize}
                fill={nodeColor}
                stroke="#0f172a"
                strokeWidth="2.5"
                style={{ 
                  transformOrigin: `${node.x}px ${node.y}px`, 
                  transition: 'all 0.25s ease', 
                  filter: glowFilter 
                }}
              />

              {/* Branch name tag pills */}
              {node.branches.length > 0 && (
                <g transform={`translate(${node.x - 25}, ${node.y - 28})`}>
                  <rect
                    width="60"
                    height="16"
                    rx="4"
                    fill="rgba(15, 23, 42, 0.85)"
                    stroke={node.is_head ? '#10b981' : '#38bdf8'}
                    strokeWidth="1"
                  />
                  <text
                    x="30"
                    y="11"
                    fill={node.is_head ? '#6ee7b7' : '#cbd5e1'}
                    fontSize="7.5"
                    fontWeight="700"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {node.branches[0].length > 10 ? `${node.branches[0].slice(0, 8)}..` : node.branches[0]}
                  </text>
                </g>
              )}

              {/* Hash text label below node */}
              <text
                x={node.x}
                y={node.y + 20}
                fill="#475569"
                fontSize="8"
                fontWeight="700"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {node.hash}
              </text>

              {/* Commit message description below node */}
              <text
                x={node.x}
                y={node.y + 32}
                fill="#94a3b8"
                fontSize="7.5"
                fontFamily="sans-serif"
                fontWeight="500"
                textAnchor="middle"
              >
                {node.message.length > 13 ? `${node.message.slice(0, 11)}..` : node.message}
              </text>
            </g>
          )
        })}
      </svg>
      
      {/* Styles for pulsing HEAD animation and node interactions */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.85); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes node-enter {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .head-pulse {
          animation: pulse-ring 2s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
        }
        .commit-node-group {
          cursor: pointer;
        }
        .commit-node-new circle {
          animation: node-enter 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .commit-node-group:hover circle {
          transform: scale(1.3);
          stroke: #ffffff;
        }
        .commit-node-group:focus circle {
          stroke: #fbbf24;
          stroke-width: 3.5px;
          transform: scale(1.3);
        }
        .commit-tooltip text { user-select: none; }
      `}</style>
    </div>
  )
}
