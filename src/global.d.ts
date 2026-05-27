interface ElectronAPI {
  terminal: {
    create: (cols: number, rows: number) => Promise<string>
    input: (id: string, data: string) => void
    resize: (id: string, cols: number, rows: number) => void
    destroy: (id: string) => void
    onOutput: (id: string, callback: (data: string) => void) => () => void
    onExit: (id: string, callback: () => void) => () => void
  }
  store: {
    getTheme: () => Promise<string>
    setTheme: (theme: string) => void
    getLayout: () => Promise<unknown>
    setLayout: (layout: unknown) => void
    getBackground: () => Promise<string | null>
    setBackground: (path: string | null) => void
  }
  dialog: {
    openImage: () => Promise<string | null>
  }
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
  stats: {
    onUpdate: (cb: (data: StatsData) => void) => () => void
  }
}

interface StatsData {
  cpu: number
  cores: number[]
  memUsed: number
  memTotal: number
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
