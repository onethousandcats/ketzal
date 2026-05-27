import { useRef, useState, useEffect } from 'react'
import { useTheme, pathToCssUrl, type Theme } from './ThemeProvider'

// ---------------------------------------------------------------------------
// Theme options
// ---------------------------------------------------------------------------

const THEMES: { value: Theme; label: string; color: string }[] = [
  { value: 'light',      label: 'Light',      color: '#c8c8cc' },
  { value: 'dark',       label: 'Dark',       color: '#3f3f46' },
  { value: 'solarized',  label: 'Solarized',  color: '#859900' },
  { value: 'light-blue', label: 'Light Blue', color: '#0078d4' },
  { value: 'lime-green', label: 'Lime Green', color: '#65a30d' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  const { theme, setTheme, backgroundImage, setBackgroundImage } = useTheme()
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside the menu
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const handleChooseImage = async () => {
    const path = await window.electronAPI.dialog.openImage()
    if (path) setBackgroundImage(path)
  }

  return (
    <div className="hm-wrapper" ref={wrapperRef}>
      {/* Hamburger / × button */}
      <button
        className={`hm-trigger${open ? ' hm-trigger--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Menu"
        aria-expanded={open}
      >
        <span /><span /><span />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="hm-panel" role="menu">
          {/* ── Theme ── */}
          <div className="hm-label">Theme</div>
          {THEMES.map(t => (
            <button
              key={t.value}
              className={`hm-row${theme === t.value ? ' hm-row--active' : ''}`}
              onClick={() => { setTheme(t.value); setOpen(false) }}
              role="menuitemradio"
              aria-checked={theme === t.value}
            >
              <span className="hm-dot" style={{ background: t.color }} />
              <span className="hm-row-label">{t.label}</span>
              {theme === t.value && <span className="hm-tick">✓</span>}
            </button>
          ))}

          <div className="hm-divider" />

          {/* ── Background ── */}
          <div className="hm-label">Background</div>

          {backgroundImage && (
            <div
              className="hm-bg-preview"
              style={{ backgroundImage: pathToCssUrl(backgroundImage) }}
            />
          )}

          <div className="hm-bg-btns">
            <button className="hm-action-btn" onClick={handleChooseImage}>
              {backgroundImage ? 'Change image' : 'Choose image…'}
            </button>
            {backgroundImage && (
              <button
                className="hm-action-btn hm-action-btn--ghost"
                onClick={() => setBackgroundImage(null)}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
