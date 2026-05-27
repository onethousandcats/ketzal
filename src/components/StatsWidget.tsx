import { useState, useEffect } from 'react'
import { useTheme } from './ThemeProvider'

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <svg className="stats-spark" />
  const W = 200, H = 48
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - 4 - (Math.min(v, 100) / 100) * (H - 8),
  ])
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  return (
    <svg className="stats-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={area} fill={color} fillOpacity="0.15" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtBytes(bytes: number): string {
  const gb = bytes / (1024 ** 3)
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 ** 2)).toFixed(0)} MB`
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const MAX_HISTORY = 60

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StatsWidget() {
  const { theme } = useTheme()
  const [data, setData] = useState<StatsData | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const [accentColor, setAccentColor] = useState(() => cssVar('--stats-fill') || '#818cf8')

  // Re-read fill color when theme changes
  useEffect(() => {
    setAccentColor(cssVar('--stats-fill'))
  }, [theme])

  useEffect(() => {
    const unsub = window.electronAPI.stats.onUpdate((d) => {
      setData(d)
      setHistory(prev => {
        const next = [...prev, d.cpu]
        return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next
      })
    })
    return unsub
  }, [])

  if (!data) {
    return (
      <div className="stats stats--loading">
        <span className="stats-muted">Waiting for data…</span>
      </div>
    )
  }

  const memPct = Math.round((data.memUsed / data.memTotal) * 100)

  return (
    <div className="stats">

      {/* ── CPU ── */}
      <div className="stats-section">
        <div className="stats-row">
          <span className="stats-label">CPU</span>
          <span className="stats-value">{data.cpu}%</span>
        </div>
        <Sparkline data={history} color={accentColor} />
      </div>

      {/* ── Cores ── */}
      <div className="stats-section">
        <span className="stats-label">Cores</span>
        <div className="stats-cores">
          {data.cores.map((pct, i) => (
            <div key={i} className="stats-core">
              <div className="stats-core-bar">
                <div
                  className="stats-core-fill"
                  style={{ height: `${pct}%`, background: accentColor }}
                />
              </div>
              <span className="stats-core-label">{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Memory ── */}
      <div className="stats-section">
        <div className="stats-row">
          <span className="stats-label">Memory</span>
          <span className="stats-value">{memPct}%</span>
        </div>
        <div className="stats-bar-track">
          <div
            className="stats-bar-fill"
            style={{ width: `${memPct}%`, background: accentColor }}
          />
        </div>
        <div className="stats-mem-labels">
          <span className="stats-muted">{fmtBytes(data.memUsed)} used</span>
          <span className="stats-muted">{fmtBytes(data.memTotal)} total</span>
        </div>
      </div>

    </div>
  )
}
