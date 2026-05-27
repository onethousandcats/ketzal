import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  terminal: {
    create: (cols: number, rows: number): Promise<string> =>
      ipcRenderer.invoke('terminal:create', cols, rows),
    input: (id: string, data: string): void =>
      ipcRenderer.send('terminal:input', id, data),
    resize: (id: string, cols: number, rows: number): void =>
      ipcRenderer.send('terminal:resize', id, cols, rows),
    destroy: (id: string): void =>
      ipcRenderer.send('terminal:destroy', id),
    onOutput: (id: string, callback: (data: string) => void): (() => void) => {
      const channel = `terminal:output:${id}`
      const listener = (_event: Electron.IpcRendererEvent, data: string) => callback(data)
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    },
    onExit: (id: string, callback: () => void): (() => void) => {
      const channel = `terminal:exit:${id}`
      const listener = () => callback()
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    }
  },

  store: {
    getTheme:      (): Promise<string>         => ipcRenderer.invoke('store:getTheme'),
    setTheme:      (theme: string): void       => ipcRenderer.send('store:setTheme', theme),
    getLayout:     (): Promise<unknown>        => ipcRenderer.invoke('store:getLayout'),
    setLayout:     (layout: unknown): void    => ipcRenderer.send('store:setLayout', layout),
    getBackground: (): Promise<string | null>  => ipcRenderer.invoke('store:getBackground'),
    setBackground: (path: string | null): void => ipcRenderer.send('store:setBackground', path),
  },

  dialog: {
    /** Opens a native file picker for images. Returns the chosen path or null. */
    openImage: (): Promise<string | null> => ipcRenderer.invoke('dialog:openImage'),
  },

  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close:    (): void => ipcRenderer.send('window:close'),
  }
})
