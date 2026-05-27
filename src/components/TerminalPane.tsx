import { useEffect, useRef } from 'react'
import { Terminal, type ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useTheme, type Theme } from './ThemeProvider'

// ---------------------------------------------------------------------------
// Full per-theme terminal palettes
// All 16 ANSI colors + cursor + selection are defined per-theme so the
// terminal feels intentionally matched rather than just "always dark".
// ---------------------------------------------------------------------------

function buildTheme(theme: Theme): ITheme {
  const style = getComputedStyle(document.documentElement)
  const v = (name: string) => style.getPropertyValue(name).trim()

  return {
    background:      v('--terminal-bg'),
    foreground:      v('--terminal-fg'),
    cursor:          v('--terminal-cursor'),
    cursorAccent:    v('--terminal-bg'),
    selectionBackground: v('--terminal-selection'),

    black:           v('--terminal-black'),
    red:             v('--terminal-red'),
    green:           v('--terminal-green'),
    yellow:          v('--terminal-yellow'),
    blue:            v('--terminal-blue'),
    magenta:         v('--terminal-magenta'),
    cyan:            v('--terminal-cyan'),
    white:           v('--terminal-white'),

    brightBlack:     v('--terminal-bright-black'),
    brightRed:       v('--terminal-bright-red'),
    brightGreen:     v('--terminal-bright-green'),
    brightYellow:    v('--terminal-bright-yellow'),
    brightBlue:      v('--terminal-bright-blue'),
    brightMagenta:   v('--terminal-bright-magenta'),
    brightCyan:      v('--terminal-bright-cyan'),
    brightWhite:     v('--terminal-bright-white'),
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TerminalPaneProps {
  paneId: string
  onTitleChange?: (title: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TerminalPane({ paneId, onTitleChange }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef  = useRef<Terminal | null>(null)
  const fitAddonRef  = useRef<FitAddon | null>(null)
  const terminalIdRef = useRef<string | null>(null)
  const { theme } = useTheme()

  // ----- Mount: create xterm instance + spawn PTY -----
  useEffect(() => {
    if (!containerRef.current) return

    const terminal = new Terminal({
      // Hyper-like typography
      fontFamily: '"Cascadia Code", "Cascadia Mono", "Fira Code", "JetBrains Mono", Consolas, monospace',
      fontSize: 12,
      fontWeight: '400',
      fontWeightBold: '600',
      lineHeight: 1.25,
      letterSpacing: 0,

      // Hyper-style cursor: blinking beam
      cursorStyle: 'bar',
      cursorBlink: true,

      // Colors from CSS custom properties
      theme: buildTheme(theme),

      // Behaviour
      scrollback: 5000,
      smoothScrollDuration: 80,
      allowTransparency: false,
      allowProposedApi: false,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(containerRef.current)

    requestAnimationFrame(() => fitAddon.fit())

    terminalRef.current  = terminal
    fitAddonRef.current  = fitAddon

    let cleanupOutput: (() => void) | null = null
    let cleanupExit:   (() => void) | null = null

    const { cols, rows } = terminal
    window.electronAPI.terminal
      .create(cols > 0 ? cols : 80, rows > 0 ? rows : 24)
      .then((id) => {
        terminalIdRef.current = id

        cleanupOutput = window.electronAPI.terminal.onOutput(id, (data) => {
          terminal.write(data)
        })

        cleanupExit = window.electronAPI.terminal.onExit(id, () => {
          terminal.writeln('\r\n\x1b[2m[process exited]\x1b[0m')
        })

        terminal.onData((data) => {
          window.electronAPI.terminal.input(id, data)
        })

        terminal.onResize(({ cols, rows }) => {
          window.electronAPI.terminal.resize(id, cols, rows)
        })

        // OSC 0 / OSC 2 title sequences from the shell
        terminal.onTitleChange((title) => {
          if (title) onTitleChange?.(title)
        })
      })

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => fitAddon.fit())
    })
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      cleanupOutput?.()
      cleanupExit?.()
      if (terminalIdRef.current) {
        window.electronAPI.terminal.destroy(terminalIdRef.current)
        terminalIdRef.current = null
      }
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----- Theme change: rebuild and apply the full palette -----
  useEffect(() => {
    if (!terminalRef.current) return
    terminalRef.current.options.theme = buildTheme(theme)
  }, [theme])

  return (
    <div
      ref={containerRef}
      className="terminal-pane"
      data-pane-id={paneId}
    />
  )
}
