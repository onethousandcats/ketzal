import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  type ReactNode
} from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Theme = 'light' | 'dark' | 'solarized' | 'light-blue' | 'lime-green'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  backgroundImage: string | null
  setBackgroundImage: (path: string | null) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert an OS file path to a CSS url() value.
 * webSecurity: false in BrowserWindow allows file:// URLs to load from
 * the http://localhost dev server renderer without CORS errors.
 */
export function pathToCssUrl(filePath: string): string {
  // Normalise backslashes, encode only spaces (colons and slashes must stay literal)
  const normalized = filePath.replace(/\\/g, '/').replace(/ /g, '%20')
  const prefix = normalized.startsWith('/') ? 'file://' : 'file:///'
  return `url("${prefix}${normalized}")`
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  backgroundImage: null,
  setBackgroundImage: () => {}
})

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [backgroundImage, setBackgroundImageState] = useState<string | null>(null)

  // Restore persisted settings on first mount
  useEffect(() => {
    const valid: Theme[] = ['light', 'dark', 'solarized', 'light-blue', 'lime-green']
    window.electronAPI.store.getTheme().then((saved) => {
      if (valid.includes(saved as Theme)) setThemeState(saved as Theme)
    })
    window.electronAPI.store.getBackground().then((saved) => {
      if (saved) setBackgroundImageState(saved)
    })
  }, [])

  // Apply data-theme synchronously before paint so child useEffects
  // that read CSS variables always see the current values.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    window.electronAPI.store.setTheme(theme)
  }, [theme])

  // Apply / remove background image on body using the local-file:// protocol URL
  useLayoutEffect(() => {
    const body = document.body
    const root = document.documentElement
    if (backgroundImage) {
      body.style.backgroundImage = pathToCssUrl(backgroundImage)
      body.style.backgroundSize = 'cover'
      body.style.backgroundPosition = 'center'
      body.style.backgroundRepeat = 'no-repeat'
      root.setAttribute('data-bg', 'true')
    } else {
      body.style.backgroundImage = ''
      body.style.backgroundSize = ''
      body.style.backgroundPosition = ''
      body.style.backgroundRepeat = ''
      root.removeAttribute('data-bg')
    }
  }, [backgroundImage])

  useEffect(() => {
    window.electronAPI.store.setBackground(backgroundImage)
  }, [backgroundImage])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])

  const setBackgroundImage = useCallback((path: string | null) => {
    setBackgroundImageState(path)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, backgroundImage, setBackgroundImage }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
