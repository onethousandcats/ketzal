import { useState, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type Phase = 'work' | 'short-break' | 'long-break'

const DURATIONS: Record<Phase, number> = {
  'work':        25 * 60,
  'short-break':  5 * 60,
  'long-break':  15 * 60,
}

const LABELS: Record<Phase, string> = {
  'work':        'Focus',
  'short-break': 'Short Break',
  'long-break':  'Long Break',
}

interface TimerState {
  phase: Phase
  timeLeft: number
  sessions: number  // completed work sessions
}

function nextState(prev: TimerState): TimerState {
  if (prev.phase === 'work') {
    const sessions = prev.sessions + 1
    const phase: Phase = sessions % 4 === 0 ? 'long-break' : 'short-break'
    return { phase, timeLeft: DURATIONS[phase], sessions }
  }
  return { phase: 'work', timeLeft: DURATIONS['work'], sessions: prev.sessions }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PomodoroWidget() {
  const [timer, setTimer] = useState<TimerState>({
    phase: 'work',
    timeLeft: DURATIONS['work'],
    sessions: 0,
  })
  const [running, setRunning] = useState(false)

  // Countdown — one setTimeout per tick to avoid drift accumulation
  useEffect(() => {
    if (!running) return
    if (timer.timeLeft <= 0) {
      setRunning(false)
      setTimer(prev => nextState(prev))
      return
    }
    const id = setTimeout(() => {
      setTimer(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }))
    }, 1000)
    return () => clearTimeout(id)
  }, [running, timer.timeLeft])

  const toggle = () => setRunning(r => !r)

  const reset = () => {
    setRunning(false)
    setTimer(prev => ({ ...prev, timeLeft: DURATIONS[prev.phase] }))
  }

  const skip = () => {
    setRunning(false)
    setTimer(prev => nextState(prev))
  }

  const mins = Math.floor(timer.timeLeft / 60)
  const secs = timer.timeLeft % 60
  const progress = 1 - timer.timeLeft / DURATIONS[timer.phase]

  // Session dots — 4 circles, filled for completed sessions in this cycle
  const dotsFilled = timer.sessions % 4

  return (
    <div className={`pomo pomo--${timer.phase}`}>
      {/* Phase label */}
      <div className="pomo-label">{LABELS[timer.phase]}</div>

      {/* Ring + time */}
      <div className="pomo-ring-wrap">
        <svg className="pomo-ring" viewBox="0 0 120 120">
          <circle className="pomo-ring-track" cx="60" cy="60" r="52" />
          <circle
            className="pomo-ring-fill"
            cx="60" cy="60" r="52"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress)}`}
          />
        </svg>
        <div className="pomo-time">
          {pad(mins)}:{pad(secs)}
        </div>
      </div>

      {/* Session dots */}
      <div className="pomo-dots">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className={`pomo-dot${i < dotsFilled ? ' pomo-dot--filled' : ''}`} />
        ))}
      </div>

      {/* Controls */}
      <div className="pomo-controls">
        <button className="pomo-btn pomo-btn--ghost" onClick={reset} title="Reset">↺</button>
        <button className="pomo-btn pomo-btn--primary" onClick={toggle}>
          {running ? 'Pause' : 'Start'}
        </button>
        <button className="pomo-btn pomo-btn--ghost" onClick={skip} title="Skip">⏭</button>
      </div>
    </div>
  )
}
