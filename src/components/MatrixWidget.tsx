import { useRef, useEffect } from 'react'
import { useTheme } from './ThemeProvider'

// Katakana + digits — classic Matrix character set
const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789'

const FONT_SIZE = 14
const FPS       = 20
const INTERVAL  = 1000 / FPS

function randChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]
}

/** Read a CSS custom property from the document root. */
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Derive a fade overlay color from the background: same hue, low alpha. */
function fadeColor(bg: string, alpha = 0.06): string {
  // bg is something like #1c2514 or rgb(...) — wrap in rgba via canvas trick
  // Simplest portable approach: just use the bg color with alpha via a temp canvas
  const m = bg.match(/^#([0-9a-f]{3,6})$/i)
  if (m) {
    const hex = m[1].length === 3
      ? m[1].split('').map(c => c + c).join('')
      : m[1]
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  return `rgba(0,0,0,${alpha})`
}

export default function MatrixWidget() {
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Pull colors from the active theme
    const bgColor    = cssVar('--bg-panel')
    const trailColor = cssVar('--stats-fill')   // dark on light theme, accent on others
    const headColor  = cssVar('--text-primary')
    const fadeOverlay = fadeColor(bgColor, 0.07)

    // cols[i] = current row (font units) of column i's leading character.
    // Negative = column is waiting to drop in (staggered start).
    let cols: number[] = []
    let rafId = 0
    let lastTime = 0

    const setup = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const n = Math.floor(canvas.width / FONT_SIZE)
      cols = Array.from({ length: n }, () =>
        -Math.floor(Math.random() * Math.floor(canvas.height / FONT_SIZE))
      )
      // Fill with bg color
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const tick = (ts: number) => {
      rafId = requestAnimationFrame(tick)
      if (ts - lastTime < INTERVAL) return
      lastTime = ts

      // Dim everything — this IS the trail effect
      ctx.fillStyle = fadeOverlay
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${FONT_SIZE}px "Cascadia Code", "Cascadia Mono", Consolas, monospace`

      for (let i = 0; i < cols.length; i++) {
        const y = cols[i]

        if (y >= 0) {
          const px = i * FONT_SIZE

          // Each cell must be cleared before drawing to prevent a new random
          // character layering over a faded one at the same position.

          // Trail — the position just behind the head
          if (y >= 1) {
            ctx.fillStyle = bgColor
            ctx.fillRect(px, Math.max(0, (y - 2) * FONT_SIZE), FONT_SIZE, FONT_SIZE + 2)
            ctx.fillStyle = trailColor
            ctx.fillText(randChar(), px, (y - 1) * FONT_SIZE)
          }

          // Head — always on top, drawn last so it wins if cells are adjacent
          ctx.fillStyle = bgColor
          ctx.fillRect(px, Math.max(0, (y - 1) * FONT_SIZE), FONT_SIZE, FONT_SIZE + 2)
          ctx.fillStyle = headColor
          ctx.fillText(randChar(), px, y * FONT_SIZE)
        }

        cols[i]++

        // Random reset once a column clears the bottom
        if (cols[i] * FONT_SIZE > canvas.height && Math.random() > 0.975) {
          cols[i] = -Math.floor(Math.random() * 20)
        }
      }
    }

    setup()
    rafId = requestAnimationFrame(tick)

    const ro = new ResizeObserver(setup)
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [theme]) // re-init when theme changes so colors update

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
