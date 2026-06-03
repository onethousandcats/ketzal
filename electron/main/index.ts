import { app, BrowserWindow, ipcMain, shell, session, Menu, dialog } from 'electron'
import { join } from 'path'
import * as os from 'os'
import * as pty from 'node-pty'
import Store from 'electron-store'

// ---------------------------------------------------------------------------
// Persistent store
// ---------------------------------------------------------------------------

interface StoreSchema {
  theme: string
  layout: unknown
  backgroundImage: string | null
}

const store = new Store<StoreSchema>({
  defaults: {
    theme: 'light',
    layout: null,
    backgroundImage: null
  }
})

// ---------------------------------------------------------------------------
// PTY process registry
// ---------------------------------------------------------------------------

const terminals = new Map<string, pty.IPty>()
let terminalIdCounter = 0

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    icon: join(__dirname, '../../resources/icon.png'),
    backgroundColor: '#f5f5f5',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      // Allow file:// image URLs in the renderer (needed in dev mode where the
      // renderer is served from http://localhost — otherwise Chromium blocks them).
      webSecurity: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in the system browser, not Electron
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ---------------------------------------------------------------------------
// IPC — terminal
// ---------------------------------------------------------------------------

ipcMain.handle('terminal:create', (event, cols: number, rows: number) => {
  const id = `term_${++terminalIdCounter}`

  const shellPath =
    process.platform === 'win32'
      ? (process.env.COMSPEC ?? 'cmd.exe')
      : (process.env.SHELL ?? '/bin/bash')

  const env = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined)
  ) as Record<string, string>

  const ptyProcess = pty.spawn(shellPath, [], {
    name: 'xterm-256color',
    cols: cols > 0 ? cols : 80,
    rows: rows > 0 ? rows : 24,
    cwd: process.env.USERPROFILE ?? process.env.HOME ?? process.cwd(),
    env
  })

  ptyProcess.onData((data) => {
    // Guard: the window may have closed before the process exits
    if (event.sender.isDestroyed()) return
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && !win.isDestroyed()) {
      win.webContents.send(`terminal:output:${id}`, data)
    }
  })

  ptyProcess.onExit(() => {
    terminals.delete(id)
    if (event.sender.isDestroyed()) return
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win && !win.isDestroyed()) {
      win.webContents.send(`terminal:exit:${id}`)
    }
  })

  terminals.set(id, ptyProcess)
  return id
})

ipcMain.on('terminal:input', (_event, id: string, data: string) => {
  terminals.get(id)?.write(data)
})

ipcMain.on('terminal:resize', (_event, id: string, cols: number, rows: number) => {
  const proc = terminals.get(id)
  if (proc && cols > 0 && rows > 0) {
    proc.resize(cols, rows)
  }
})

ipcMain.on('terminal:destroy', (_event, id: string) => {
  const proc = terminals.get(id)
  if (proc) {
    proc.kill()
    terminals.delete(id)
  }
})

// ---------------------------------------------------------------------------
// IPC — store
// ---------------------------------------------------------------------------

ipcMain.handle('store:getTheme', () => store.get('theme'))
ipcMain.on('store:setTheme', (_event, theme: string) => store.set('theme', theme))

ipcMain.handle('store:getLayout', () => store.get('layout'))
ipcMain.on('store:setLayout', (_event, layout: unknown) => store.set('layout', layout))

ipcMain.handle('store:getBackground', () => store.get('backgroundImage'))
ipcMain.on('store:setBackground', (_event, path: string | null) =>
  store.set('backgroundImage', path)
)

// Open a native file-picker restricted to image types
ipcMain.handle('dialog:openImage', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const result = await dialog.showOpenDialog(win ?? BrowserWindow.getFocusedWindow()!, {
    title: 'Choose background image',
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif'] }
    ]
  })
  return result.canceled ? null : result.filePaths[0]
})


// ---------------------------------------------------------------------------
// IPC — window controls (frameless)
// ---------------------------------------------------------------------------

ipcMain.on('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize()
})

ipcMain.on('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
})

ipcMain.on('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close()
})

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// CPU / memory stats broadcaster
// ---------------------------------------------------------------------------

let prevCpus = os.cpus()

function sampleStats() {
  const currCpus = os.cpus()

  const cores = currCpus.map((core, i) => {
    const p = prevCpus[i].times
    const c = core.times
    const pTotal = (Object.values(p) as number[]).reduce((a, b) => a + b, 0)
    const cTotal = (Object.values(c) as number[]).reduce((a, b) => a + b, 0)
    const total = cTotal - pTotal
    return total === 0 ? 0 : Math.round((1 - (c.idle - p.idle) / total) * 100)
  })

  prevCpus = currCpus

  const memTotal = os.totalmem()
  const memUsed  = memTotal - os.freemem()

  return {
    cpu:      Math.round(cores.reduce((a, b) => a + b, 0) / cores.length),
    cores,
    memUsed,
    memTotal,
  }
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(() => {
  // Remove the default application menu (File / Edit / View / …)
  Menu.setApplicationMenu(null)

  // Electron denies all permission requests by default.
  // Explicitly allow geolocation so the weather widget can work.
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, permission, callback) => {
      callback(permission === 'geolocation')
    }
  )

  createWindow()

  // Push CPU/memory stats to all renderer windows every second
  const statsTimer = setInterval(() => {
    const wins = BrowserWindow.getAllWindows()
    if (wins.length === 0) return
    const data = sampleStats()
    wins.forEach(w => { if (!w.isDestroyed()) w.webContents.send('stats:update', data) })
  }, 1000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  app.on('before-quit', () => clearInterval(statsTimer))
})

app.on('window-all-closed', () => {
  terminals.forEach((proc) => proc.kill())
  terminals.clear()
  if (process.platform !== 'darwin') app.quit()
})
