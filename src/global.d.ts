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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
