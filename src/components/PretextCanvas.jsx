import React, { useEffect, useMemo, useRef, useState } from 'react'
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
    ours: [
      'import os',
      '',
      '<<<<<<< HEAD',
      'def greet(name):',
      '    print(f"Hello, {name}!")',
      '    return True',
      '======='
    ],
    theirs: [
      '=======',
      'def greet():',
      '    print("Hello, World!")',
      '    return False',
      '>>>>>>> feature/hello',
      '',
      'def main():'
    ],
    combined: [
      'import os',
      '',
      '<<<<<<< HEAD (Current Change)',
      'def greet(name):',
      '    print(f"Hello, {name}!")',
      '    return True',
      '=======',
      'def greet():',
      '    print("Hello, World!")',
      '    return False',
      '>>>>>>> feature/hello (Incoming Change)',
      '',
      'def main():',
      '    greet()'
    ],
    oursResolved: [
      'import os',
      '',
      'def greet(name):',
      '    print(f"Hello, {name}!")',
      '    return True',
      '',
      'def main():',
      '    greet()'
    ],
    theirsResolved: [
      'import os',
      '',
      'def greet():',
      '    print("Hello, World!")',
      '    return False',
      '',
      'def main():',
      '    greet()'
    ],
    bothResolved: [
      'import os',
      '',
      'def greet(name):',
      '    print(f"Hello, {name}!")',
      '    return True',
      '',
      'def greet():',
      '    print("Hello, World!")',
      '    return False',
      '',
      'def main():',
      '    greet()'
    ]
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
  const [canvasResolution, setCanvasResolution] = useState(null)

  const handleCanvasClick = (e) => {
    if (scene !== 'conflictDiff') return;
    
    if (canvasResolution) {
      setCanvasResolution(null);
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Adjusted y bounds to match the new topBoxHeight (240) + gap (16) + yOffset
    // bottomBoxY = 22 + 240 + 16 = 278. CodeLens is at 278 + 44 = 322.
    if (clickY > 310 && clickY < 350) {
      if (clickX >= 60 && clickX <= 200) {
        setCanvasResolution('ours');
      } else if (clickX >= 210 && clickX <= 355) {
        setCanvasResolution('theirs');
      } else if (clickX >= 365 && clickX <= 500) {
        setCanvasResolution('both');
      }
    }
  }

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
      if (scene === 'conflictDiff') drawConflictDiff(ctx, width, height, t, sceneData, canvasResolution)
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
  }, [height, scene, sceneData, canvasResolution])

  return (
    <div className={`pretext-canvas-wrap ${className}`}>
      <canvas 
        ref={canvasRef} 
        aria-label={`${scene} pretext animation`}
        onClick={handleCanvasClick}
        style={{ cursor: scene === 'conflictDiff' ? 'pointer' : 'default' }}
      />
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

  while (true) {
    const range = layoutNextLineRange(prepared, cursor, width - 44)
    if (range === null) break
    const line = materializeLineRange(prepared, range)
    ctx.fillText(line.text, x, y)
    cursor = range.end
    y += 26
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

function drawConflictDiff(ctx, width, height, t, data, resolution) {
  const gap = 16
  const colWidth = (width - gap - 36) / 2
  
  const topBoxHeight = 240;
  drawDiffColumn(ctx, 18, 22, colWidth, topBoxHeight, 'ours', data.ours, t)
  drawDiffColumn(ctx, 18 + colWidth + gap, 22, colWidth, topBoxHeight, 'theirs', data.theirs, t + 0.4)

  const bottomBoxY = 22 + topBoxHeight + gap;
  
  let linesToDraw = data.combined;
  if (resolution === 'ours') linesToDraw = data.oursResolved;
  else if (resolution === 'theirs') linesToDraw = data.theirsResolved;
  else if (resolution === 'both') linesToDraw = data.bothResolved;

  const bottomBoxHeight = linesToDraw.length * 26 + (resolution ? 56 : 80);

  drawDiffColumn(ctx, 18, bottomBoxY, width - 36, bottomBoxHeight, 'merge conflict', linesToDraw, t + 0.8, resolution)
}

function drawDiffColumn(ctx, x, y, width, height, title, lines, t, resolution) {
  roundRect(ctx, x, y, width, height, 10)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'
  ctx.fill()
  ctx.font = labelFont
  ctx.fillStyle = '#f0f6fc'
  ctx.textBaseline = 'top'
  ctx.fillText(title, x + 12, y + 12)

  let yOffset = 44;
  if (title === 'merge conflict' && !resolution) {
    ctx.font = '12px Inter';
    let currentX = x + 52;

    const drawLink = (text, isLink) => {
      ctx.fillStyle = isLink ? '#58a6ff' : '#8b949e';
      ctx.fillText(text, currentX, y + 44);
      currentX += ctx.measureText(text).width;
    };

    drawLink('Accept Current Change', true);
    drawLink(' | ', false);
    drawLink('Accept Incoming Change', true);
    drawLink(' | ', false);
    drawLink('Accept Both Changes', true);

    yOffset = 68;
  }

  // Draw line number gutter background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
  ctx.fillRect(x, y + yOffset - 4, 40, height - yOffset + 4)

  const prepared = getPrepared(lines.join('\n'), monoFont, true, { whiteSpace: 'pre-wrap' })
  const laidOut = layoutWithLines(prepared, width - 52, 24)
  laidOut.lines.forEach((line, index) => {
    const reveal = Math.max(0, Math.min(line.text.length, Math.floor((t * 10) - index * 4)))
    const text = line.text.slice(0, reveal)
    const lineY = y + yOffset + index * 26
    
    let bgColor = null
    if (line.text.includes('<<<')) {
      bgColor = 'rgba(16, 185, 129, 0.45)' 
    } else if (line.text.includes('>>>')) {
      bgColor = 'rgba(59, 130, 246, 0.45)'
    } else if (!line.text.includes('===')) {
      if (title === 'merge conflict' && !resolution) {
        const separatorIndex = laidOut.lines.findIndex(l => l.text.includes('==='));
        const isOurs = separatorIndex === -1 || index < separatorIndex;
        bgColor = isOurs ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)'
      } else if (title === 'ours' || title === 'theirs') {
        bgColor = title === 'ours' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)'
      }
    }

    if (bgColor) {
      ctx.fillStyle = bgColor
      ctx.fillRect(x, lineY, width, 26)
    }

    // Draw line number
    ctx.font = '12px Consolas'
    ctx.fillStyle = '#484f58'
    ctx.textBaseline = 'middle'
    ctx.fillText((index + 1).toString().padStart(2, ' '), x + 12, lineY + 13)

    // Syntax highlighted text
    ctx.font = monoFont
    ctx.textBaseline = 'middle'
    
    let textX = x + 52;
    const textY = lineY + 13;
    if (text.startsWith('<<<') || text.startsWith('===') || text.startsWith('>>>')) {
      ctx.fillStyle = '#8b949e'
      ctx.fillText(text, textX, textY)
    } else {
      const tokens = text.split(/(\bimport\b|\bdef\b|\breturn\b|\bprint\b|\bTrue\b|\bFalse\b|\bif\b|f?"[^"]*")/g);
      for (const token of tokens) {
        if (!token) continue;
        if (['import', 'def', 'return', 'if'].includes(token)) {
          ctx.fillStyle = '#ff7b72'; 
        } else if (['True', 'False'].includes(token)) {
          ctx.fillStyle = '#79c0ff'; 
        } else if (['print'].includes(token)) {
          ctx.fillStyle = '#d2a8ff'; 
        } else if (token.startsWith('"') || token.startsWith('f"')) {
          ctx.fillStyle = '#a5d6ff'; 
        } else {
          ctx.fillStyle = '#c9d1d9'; 
        }
        ctx.fillText(token, textX, textY)
        textX += ctx.measureText(token).width
      }
    }
  })
}

function drawHistoryLog(ctx, width, height, t, data) {
  const rowHeight = 42
  const totalHeight = data.commits.length * rowHeight
  const scroll = (t * 32) % totalHeight
  const preparedRows = data.commits.map((commit) => getPrepared(commit, labelFont))
  preparedRows.forEach((prepared, index) => {
    // Place each row within [0, totalHeight) so it wraps seamlessly: a row
    // that scrolls off the top re-enters from the bottom.
    const y = 24 + ((index * rowHeight - scroll) % totalHeight + totalHeight) % totalHeight - rowHeight
    if (y < -rowHeight || y > height + 20) return
    let maxLineWidth = 0
    walkLineRanges(prepared, width - 80, (line) => { maxLineWidth = Math.max(maxLineWidth, line.width) })
    const bubbleWidth = maxLineWidth + 28
    ctx.fillStyle = index === 4 ? 'rgba(239,68,68,0.22)' : 'rgba(59,130,246,0.18)'
    roundRect(ctx, 22, y, bubbleWidth, 30, 15)
    ctx.fill()
    const line = layoutWithLines(prepared, width - 80, 20).lines[0]
    ctx.font = labelFont
    ctx.fillStyle = '#f0f6fc'
    ctx.textBaseline = 'middle'
    ctx.fillText(line.text, 36, y + 15)
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
    ctx.fillStyle = 'rgba(59,130,246,0.85)'
    roundRect(ctx, x, y - 24, packetWidth, 48, 24)
    ctx.fill()
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

  ctx.font = monoFont
  ctx.fillStyle = '#0f172a'
  ctx.textBaseline = 'middle'
  ctx.fillText('📄', x - 7, y)
}
