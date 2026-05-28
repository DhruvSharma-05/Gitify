import React, { useMemo } from 'react'

export default function LiveCommitGraph({ commits = [] }) {
  const parsedGraph = useMemo(() => {
    if (!commits || commits.length === 0) return null

    // 1. Sort commits chronologically (git log is reverse chronological, so reverse it)
    const chronoCommits = [...commits].reverse()
    
    // 2. Assign coordinate lanes (vertical lines) dynamically
    const branchLanes = {}
    let laneCounter = 0

    // Assign main to lane 0
    branchLanes['main'] = 0
    branchLanes['master'] = 0

    const nodes = chronoCommits.map((commit, idx) => {
      // Find branch label to determine lane
      let lane = 0
      
      // Look for branch tags
      const branchLabel = commit.branches.find(b => b !== 'HEAD')
      
      if (branchLabel) {
        if (branchLanes[branchLabel] === undefined) {
          laneCounter++
          branchLanes[branchLabel] = laneCounter
        }
        lane = branchLanes[branchLabel]
      } else {
        // Fallback to parent lane if no direct branch label
        lane = 0
      }

      // X coordinate spaced out
      const x = 50 + idx * 85
      // Y coordinate based on lane index
      const y = 50 + lane * 60

      return {
        ...commit,
        x,
        y,
        lane,
        branchLabel: branchLabel || ''
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

        {/* Render nodes */}
        {nodes.map(node => {
          const glowFilter = node.is_head ? 'drop-shadow(0px 0px 8px #10b981)' : 'none'
          const nodeColor = node.is_head ? '#10b981' : node.parents.length > 1 ? '#a78bfa' : '#38bdf8'
          const nodeSize = node.is_head ? '9' : '7.5'

          return (
            <g key={node.hash} style={{ transition: 'all 0.3s ease' }}>
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
                style={{ filter: glowFilter }}
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
      
      {/* Styles for pulsing HEAD animation */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.85); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .head-pulse {
          animation: pulse-ring 2s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
        }
      `}</style>
    </div>
  )
}
