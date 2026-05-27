import { useRef, useState, useEffect } from 'react'
import HamburgerMenu from './HamburgerMenu'
import type { WidgetType } from '../types'

interface ToolbarProps {
  onAddTerminal: () => void
  onAddWidget: (type: WidgetType) => void
}

const WIDGET_OPTIONS: { type: WidgetType; label: string; icon: string }[] = [
  { type: 'weather',  label: 'Weather',  icon: '⛅' },
  { type: 'pomodoro', label: 'Pomodoro', icon: '🍅' },
  { type: 'todo',     label: 'To-do',    icon: '✓' },
  { type: 'matrix',   label: 'Matrix',   icon: '⬛' },
  { type: 'stats',    label: 'CPU Stats', icon: '📊' },
]

export default function Toolbar({ onAddTerminal, onAddWidget }: ToolbarProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <HamburgerMenu />
        <button className="toolbar-btn" onClick={onAddTerminal}>+ terminal</button>

        {/* Widget picker */}
        <div className="widget-picker" ref={wrapperRef}>
          <button className="toolbar-btn" onClick={() => setOpen(o => !o)}>
            + widget
          </button>
          {open && (
            <div className="widget-picker-menu">
              {WIDGET_OPTIONS.map(opt => (
                <button
                  key={opt.type}
                  className="widget-picker-item"
                  onClick={() => { onAddWidget(opt.type); setOpen(false) }}
                >
                  <span className="widget-picker-icon">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-right">
        <button
          className="wc-btn wc-minimize"
          onClick={() => window.electronAPI.window.minimize()}
          aria-label="Minimize"
        />
        <button
          className="wc-btn wc-maximize"
          onClick={() => window.electronAPI.window.maximize()}
          aria-label="Maximize"
        />
        <button
          className="wc-btn wc-close"
          onClick={() => window.electronAPI.window.close()}
          aria-label="Close"
        />
      </div>
    </div>
  )
}
