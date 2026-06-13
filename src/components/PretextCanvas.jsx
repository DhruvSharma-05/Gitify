import React, { useEffect, useMemo, useRef } from 'react'
import {
  layout,
  layoutNextLineRange,
  layoutWithLines,
  materializeLineRange,
  measureNaturalWidth,
  prepare,
  prepareWithSegments,
  walkLineRanges
} from '@chenglou/pretext'

const monoFont = '14px Consolas'
const labelFont = '700 13px Inter'
const bodyFont = '14px Inter'

const scenes = {
  gitBasics: {
    commands: ['git init', 'git add .', 'git commit -m "first snapshot"']
  },
  branchLabels: {
    labels: ['main', 'feature/auth', 'fix/login-bug']
  },
  conflictDiff: {
    ours: ['<<<<<<< HEAD', 'theme: "dark"', '======='],
    theirs: ['=======', 'theme: "light"', '>>>>>>> feature/ui']
  },
  historyLog: {
    commits: [
      'a3f9c2 Initial dashboard',
      'b81d4a Add auth guard',
      'c04e77 Cache metrics',
      'd92aa1 Tune chart layout',
      'e17b90 Skip null metric check',
      'f63c18 Polish loading state',
      '9ac2d5 Update deploy config',
      '18be44 Release production'
    ]
  },
  stashPick: {
    cards: [
      'wip: checkout experiment\nCheckout.jsx\nstyles.css',
      'hotfix b7a91c\nFix tax rounding'
    ]
  },
  remotePackets: {
    packets: ['Sam: empty state', 'Priya: retry logic', 'Alex: auth refresh']
  },
  rebaseClean: {
    commits: ['Add checkout form', 'Wire Stripe token', 'Handle declined cards']
  },
  playgroundFlow: {
    columns: ['Working', 'Staging', 'Local', 'Remote']
  }
}

const preparedCache = new Map()

function getPrepared(text, font, segmented = true, options) {
  const key = `${segmented ? 'segments' : 'plain'}|${font}|${JSON.stringify(options || {})}|${text}`
  if (!preparedCache.has(key)) {
    preparedCache.set(key, segmented ? prepareWithSegments(text, font, options) : prepare(text, font, options))
  }
  return preparedCache.get(key)
}

export default function PretextCanvas({ scene, className = '', height = 220 }) {
  const canvasRef = useRef(null)
  const sceneData = useMemo(() => scenes[scene], [scene])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sceneData) return undefined

    const ctx = canvas.getContext('2d')
    let rafId = 0
    let start = performance.now()
    let width = canvas.parentElement?.clientWidth || 640
    const dpr = window.devicePixelRatio || 1

    function resize(nextWidth = width) {
      width = Math.max(320, Math.floor(nextWidth))
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) resize(entry.contentRect.width)
    })

    observer.observe(canvas.parentElement || canvas)
    resize()

    function tick(now) {
      const t = (now - start) / 1000
      clear(ctx, width, height)
      if (scene === 'gitBasics') drawGitBasics(ctx, width, height, t, sceneData)
      if (scene === 'branchLabels') drawBranchLabels(ctx, width, height, t, sceneData)
      if (scene === 'conflictDiff') drawConflictDiff(ctx, width, height, t, sceneData)
      if (scene === 'historyLog') drawHistoryLog(ctx, width, height, t, sceneData)
      if (scene === 'stashPick') drawStashPick(ctx, width, height, t, sceneData)
      if (scene === 'remotePackets') drawRemotePackets(ctx, width, height, t, sceneData)
      if (scene === 'rebaseClean') drawRebaseClean(ctx, width, height, t, sceneData)
      if (scene === 'playgroundFlow') drawPlaygroundFlow(ctx, width, height, t, sceneData)
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [height, scene, sceneData])

  return (
    <div className={`pretext-canvas-wrap ${className}`}>
      <canvas ref={canvasRef} aria-label={`${scene} pretext animation`} />
    </div>
  )
}

function clear(ctx, width, height) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = 'rgba(1, 4, 9, 0.38)'
  roundRect(ctx, 0, 0, width, height, 12)
  ctx.fill()
}

function drawGitBasics(ctx, width, height, t, data) {
  const text = data.commands.join('\n')
  const maxChars = Math.floor((t * 18) % (text.length + 36))
  const visible = text.slice(0, Math.min(maxChars, text.length))
  const prepared = getPrepared(visible, monoFont, true, { whiteSpace: 'pre-wrap' })
  const x = 22
  let y = 36
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }

  ctx.font = monoFont
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#c9d1d9'

  let lastLine = null
  let lastY = y
  while (true) {
    const range = layoutNextLineRange(prepared, cursor, width - 44)
    if (range === null) break
    const line = materializeLineRange(prepared, range)
    ctx.fillText(line.text, x, y)
    cursor = range.end
    lastLine = line
    lastY = y
    y += 26
  }

  // Blinking terminal cursor at the end of the typed text
  const cursorX = lastLine ? x + measureNaturalWidth(getPrepared(lastLine.text, monoFont)) + 3 : x
  const cursorY = lastLine ? lastY : 36
  if (Math.floor(t * 2) % 2 === 0) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.9)'
    roundRect(ctx, cursorX, cursorY, 8, 17, 1.5)
    ctx.fill()
  }

  const keywords = ['git', 'add', 'commit']
  keywords.forEach((word, index) => {
    const prep = getPrepared(word, monoFont)
    const underlineWidth = measureNaturalWidth(prep)
    const ux = 22 + index * 98
    const uy = height - 38
    ctx.fillStyle = `rgba(56, 189, 248, ${0.35 + 0.35 * Math.sin(t * 3 + index)})`
    roundRect(ctx, ux, uy, underlineWidth + 10, 4, 2)
    ctx.fill()
    ctx.fillStyle = '#8b949e'
    ctx.fillText(word, ux, uy + 8)
  })
}

function drawBranchLabels(ctx, width, height, t, data) {
  const lanes = [54, 110, 166]
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.lineWidth = 3
  lanes.forEach((y) => {
    ctx.beginPath()
    ctx.moveTo(24, y)
    ctx.lineTo(width - 24, y)
    ctx.stroke()
  })

  data.labels.forEach((label, index) => {
    const prepared = getPrepared(label, labelFont)
    const bubbleWidth = measureNaturalWidth(prepared) + 28
    const targetX = 64 + index * 92
    const x = width + 20 + (targetX - width - 20) * ease(Math.min(1, (t - index * 0.25) % 3))
    const y = lanes[index] - 18
    ctx.fillStyle = ['#3b82f6', '#10b981', '#ec4899'][index]
    roundRect(ctx, x, y, bubbleWidth, 34, 17)
    ctx.fill()
    ctx.font = labelFont
    ctx.fillStyle = '#fff'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x + 14, y + 17)
  })
}

function drawConflictDiff(ctx, width, height, t, data) {
  const gap = 16
  const colWidth = (width - gap - 36) / 2
  drawDiffColumn(ctx, 18, 22, colWidth, height - 44, 'ours', data.ours, t)
  drawDiffColumn(ctx, 18 + colWidth + gap, 22, colWidth, height - 44, 'theirs', data.theirs, t + 0.4)
}

function drawDiffColumn(ctx, x, y, width, height, title, lines, t) {
  roundRect(ctx, x, y, width, height, 10)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'
  ctx.fill()
  ctx.font = labelFont
  ctx.fillStyle = '#f0f6fc'
  ctx.fillText(title, x + 12, y + 12)

  const prepared = getPrepared(lines.join('\n'), monoFont, true, { whiteSpace: 'pre-wrap' })
  const laidOut = layoutWithLines(prepared, width - 24, 24)
  laidOut.lines.forEach((line, index) => {
    const reveal = Math.max(0, Math.min(line.text.length, Math.floor((t * 10) - index * 4)))
    const text = line.text.slice(0, reveal)
    const lineY = y + 44 + index * 26
    if (line.text.includes('<<<') || line.text.includes('===') || line.text.includes('>>>')) {
      ctx.fillStyle = `rgba(239, 68, 68, ${0.18 + 0.12 * Math.sin(t * 8)})`
      ctx.fillRect(x + 8, lineY - 4, width - 16, 24)
    }
    ctx.font = monoFont
    ctx.fillStyle = line.text.includes('light') ? '#bbf7d0' : line.text.includes('dark') ? '#bfdbfe' : '#fecaca'
    ctx.fillText(text, x + 12, lineY)
  })
}

function drawHistoryLog(ctx, width, height, t, data) {
  const rowHeight = 42
  const totalHeight = data.commits.length * rowHeight
  const scroll = (t * 32) % totalHeight
  const laneX = 18
  const bubbleX = 36

  // Continuous git-graph spine running the full height
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(laneX, 10)
  ctx.lineTo(laneX, height - 8)
  ctx.stroke()

  const preparedRows = data.commits.map((commit) => getPrepared(commit, labelFont))
  preparedRows.forEach((prepared, index) => {
    // Place each row within [0, totalHeight) so it wraps seamlessly: a row
    // that scrolls off the top re-enters from the bottom.
    const y = 24 + ((index * rowHeight - scroll) % totalHeight + totalHeight) % totalHeight - rowHeight
    if (y < -rowHeight || y > height + 20) return
    let maxLineWidth = 0
    walkLineRanges(prepared, width - 90, (line) => { maxLineWidth = Math.max(maxLineWidth, line.width) })
    const bubbleWidth = maxLineWidth + 28
    const highlight = index === 4
    const nodeY = y + 15

    ctx.fillStyle = highlight ? 'rgba(239,68,68,0.22)' : 'rgba(59,130,246,0.18)'
    roundRect(ctx, bubbleX, y, bubbleWidth, 30, 15)
    ctx.fill()
    const line = layoutWithLines(prepared, width - 90, 20).lines[0]
    ctx.font = labelFont
    ctx.fillStyle = '#f0f6fc'
    ctx.textBaseline = 'middle'
    ctx.fillText(line.text, bubbleX + 14, nodeY)

    // Forked branch stub on the highlighted commit
    if (highlight) {
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.9)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(laneX, nodeY)
      ctx.lineTo(laneX + 11, nodeY - 13)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(laneX + 13, nodeY - 15, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = '#0b0f17'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#f472b6'
      ctx.stroke()
    }

    // Commit node sitting on the spine
    ctx.beginPath()
    ctx.arc(laneX, nodeY, 4.5, 0, Math.PI * 2)
    ctx.fillStyle = '#0b0f17'
    ctx.fill()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = highlight ? '#f472b6' : '#38bdf8'
    ctx.stroke()
  })
}

function drawStashPick(ctx, width, height, t, data) {
  data.cards.forEach((card, index) => {
    const prepared = getPrepared(card, bodyFont, false, { whiteSpace: 'pre-wrap' })
    const metrics = layout(prepared, 210, 22)
    const cardHeight = metrics.height + 26
    const x = 24 + index * 250
    const drawerY = height - 30
    const y = 22 + (drawerY - cardHeight - 22) * ease((Math.sin(t + index) + 1) / 2)
    ctx.fillStyle = index === 0 ? 'rgba(245,158,11,0.16)' : 'rgba(16,185,129,0.16)'
    roundRect(ctx, x, y, 224, cardHeight, 10)
    ctx.fill()
    renderWrapped(ctx, card, bodyFont, x + 12, y + 12, 200, 22, '#f0f6fc')
  })

  ctx.fillStyle = 'rgba(139,92,246,0.18)'
  roundRect(ctx, 18, height - 32, width - 36, 16, 8)
  ctx.fill()
}

function drawRemotePackets(ctx, width, height, t, data) {
  const y = height / 2
  ctx.strokeStyle = 'rgba(56,189,248,0.35)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(28, y)
  ctx.lineTo(width - 28, y)
  ctx.stroke()

  data.packets.forEach((label, index) => {
    const packetWidth = 128
    const x = 32 + ((t * 95 + index * 150) % (width - 96))
    const display = fitLabel(label, labelFont, packetWidth - 18)

    // Glowing motion trail — fading ghost copies behind the packet
    for (let k = 4; k >= 1; k--) {
      ctx.globalAlpha = 0.08 * (5 - k)
      ctx.fillStyle = 'rgba(56, 189, 248, 1)'
      roundRect(ctx, x - k * 13, y - 24, packetWidth, 48, 24)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Packet body with neon glow
    ctx.shadowColor = 'rgba(56, 189, 248, 0.85)'
    ctx.shadowBlur = 16
    ctx.fillStyle = 'rgba(59,130,246,0.9)'
    roundRect(ctx, x, y - 24, packetWidth, 48, 24)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.font = labelFont
    ctx.fillStyle = '#fff'
    ctx.textBaseline = 'middle'
    ctx.fillText(display, x + 12, y)
  })
}

function drawRebaseClean(ctx, width, height, t, data) {
  data.commits.forEach((message, index) => {
    const prepared = getPrepared(message, bodyFont)
    const balancedWidth = findBalancedWidth(prepared, 120, 220)
    const lines = layoutWithLines(prepared, balancedWidth, 20).lines
    const sourceX = 28 + index * 160
    const targetX = 70 + index * 170
    const p = ease(Math.min(1, (t - index * 0.25) % 3))
    const x = sourceX + (targetX - sourceX) * p
    const y = 35 + index * 24
    ctx.globalAlpha = 0.35
    ctx.fillStyle = '#ef4444'
    roundRect(ctx, sourceX, height - 52, 120, 28, 14)
    ctx.fill()
    ctx.globalAlpha = 0.65 + p * 0.35
    ctx.fillStyle = '#10b981'
    roundRect(ctx, x, y, balancedWidth + 22, 30 + lines.length * 18, 12)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.font = bodyFont
    ctx.fillStyle = '#fff'
    lines.forEach((line, lineIndex) => ctx.fillText(line.text, x + 11, y + 14 + lineIndex * 18))
  })
}

function renderWrapped(ctx, text, font, x, y, maxWidth, lineHeight, color) {
  const prepared = getPrepared(text, font, true, { whiteSpace: 'pre-wrap' })
  const lines = layoutWithLines(prepared, maxWidth, lineHeight).lines
  ctx.font = font
  ctx.textBaseline = 'top'
  ctx.fillStyle = color
  lines.forEach((line, index) => ctx.fillText(line.text, x, y + index * lineHeight))
}

function fitLabel(label, font, maxWidth) {
  const prepared = getPrepared(label, font)
  if (measureNaturalWidth(prepared) <= maxWidth) return label
  const graphemes = Array.from(label)
  let low = 0
  let high = graphemes.length
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    const candidate = `${graphemes.slice(0, mid).join('')}...`
    if (measureNaturalWidth(getPrepared(candidate, font)) <= maxWidth) low = mid
    else high = mid - 1
  }
  return `${graphemes.slice(0, low).join('')}...`
}

function findBalancedWidth(prepared, minWidth, maxWidth) {
  let best = maxWidth
  let bestScore = Number.POSITIVE_INFINITY
  for (let width = minWidth; width <= maxWidth; width += 10) {
    const widths = []
    walkLineRanges(prepared, width, (line) => widths.push(line.width))
    if (widths.length === 0) continue
    const score = Math.max(...widths) - Math.min(...widths) + widths.length * 6
    if (score < bestScore) {
      bestScore = score
      best = width
    }
  }
  return best
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function ease(value) {
  return 1 - Math.pow(1 - value, 3)
}

function drawPlaygroundFlow(ctx, width, height, t, data) {
  const colWidth = (width - 60) / 4
  const y = height / 2

  // Draw 4 column areas
  data.columns.forEach((col, idx) => {
    const cx = 18 + idx * (colWidth + 8)
    const cy = 20
    const cw = colWidth
    const ch = height - 40
    
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)'
    roundRect(ctx, cx, cy, cw, ch, 8)
    ctx.fill()
    ctx.strokeStyle = idx === 0 ? '#38bdf8' : idx === 1 ? '#f59e0b' : idx === 2 ? '#10b981' : '#8b5cf6'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.font = labelFont
    ctx.fillStyle = '#94a3b8'
    ctx.textBaseline = 'top'
    ctx.fillText(col, cx + 10, cy + 10)
  })

  // Animate file bubble flowing
  const cycle = t % 6 // 6 seconds cycle
  let activeCol = 0
  let progress = 0
  if (cycle < 1.5) {
    activeCol = 0 // working
    progress = 0
  } else if (cycle >= 1.5 && cycle < 3.0) {
    activeCol = 0
    progress = (cycle - 1.5) / 1.5 // moving working -> staging
  } else if (cycle >= 3.0 && cycle < 4.5) {
    activeCol = 1
    progress = (cycle - 3.0) / 1.5 // moving staging -> local
  } else {
    activeCol = 2
    progress = (cycle - 4.5) / 1.5 // moving local -> remote
  }

  // Draw the moving file packet
  const startIdx = Math.floor(cycle / 1.5) % 4
  const nextIdx = (startIdx + 1) % 4
  
  const startX = 18 + startIdx * (colWidth + 8) + colWidth / 2
  const nextX = 18 + nextIdx * (colWidth + 8) + colWidth / 2
  
  // Ease the transition
  const p = ease(Math.min(1, (cycle % 1.5) / 1.0)) // animate in first 1.0s, pause for 0.5s
  const x = startX + (nextX - startX) * p
  
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(x, y, 12, 0, Math.PI * 2)
  ctx.fill()

  // Outer glowing pulse ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, 12 + 6 * Math.sin(t * 5), 0, Math.PI * 2)
  ctx.stroke()

  drawDocGlyph(ctx, x, y)
}

// A crisp document icon drawn with paths (folded-corner page + text lines)
function drawDocGlyph(ctx, cx, cy) {
  const w = 9
  const h = 12
  const fold = 3.5
  const x = cx - w / 2
  const y = cy - h / 2
  ctx.save()
  ctx.strokeStyle = '#0f172a'
  ctx.fillStyle = '#0f172a'
  ctx.lineWidth = 1.4
  ctx.lineJoin = 'round'
  // page outline with folded top-right corner
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w - fold, y)
  ctx.lineTo(x + w, y + fold)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.closePath()
  ctx.stroke()
  // fold crease
  ctx.beginPath()
  ctx.moveTo(x + w - fold, y)
  ctx.lineTo(x + w - fold, y + fold)
  ctx.lineTo(x + w, y + fold)
  ctx.stroke()
  // text lines
  ctx.lineWidth = 1
  for (let i = 0; i < 3; i++) {
    const ly = y + 5 + i * 2.4
    ctx.beginPath()
    ctx.moveTo(x + 2, ly)
    ctx.lineTo(x + w - 2, ly)
    ctx.stroke()
  }
  ctx.restore()
}
