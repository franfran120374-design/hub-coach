const path = require('path')
const { app, BrowserWindow, ipcMain, Notification, powerMonitor, shell } = require('electron')

const URL_DEV = process.env.VITE_DEV_URL || ''
let fenetre = null
let quitterVraiment = false

const instanceUnique = app.requestSingleInstanceLock()
if (!instanceUnique) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (fenetre) {
      if (fenetre.isMinimized()) fenetre.restore()
      fenetre.show()
      fenetre.focus()
    }
  })
}

function creerFenetre() {
  fenetre = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 880,
    minHeight: 620,
    backgroundColor: '#171b26',
    title: 'Coach',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  fenetre.removeMenu()

  if (URL_DEV) {
    fenetre.loadURL(URL_DEV)
  } else {
    fenetre.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  fenetre.once('ready-to-show', () => fenetre.show())

  // Fermer la fenetre ne tue pas le coach : sinon il ne peut plus te rappeler
  // a l'ordre. La sortie definitive passe par le bouton dans l'application.
  fenetre.on('close', (evenement) => {
    if (!quitterVraiment) {
      evenement.preventDefault()
      fenetre.minimize()
    }
  })
}

app.whenReady().then(() => {
  creerFenetre()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) creerFenetre()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// --- Ponts avec l'interface

ipcMain.handle('coach:escalade', (_evenement, niveau) => {
  if (!fenetre) return false
  if (niveau >= 3) {
    if (fenetre.isMinimized()) fenetre.restore()
    fenetre.setAlwaysOnTop(true, 'screen-saver')
    fenetre.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    fenetre.setFullScreen(true)
    fenetre.show()
    fenetre.focus()
    fenetre.flashFrame(true)
  } else if (niveau === 2) {
    if (fenetre.isMinimized()) fenetre.restore()
    fenetre.show()
    fenetre.flashFrame(true)
  } else {
    fenetre.flashFrame(true)
  }
  return true
})

ipcMain.handle('coach:liberer', () => {
  if (!fenetre) return false
  fenetre.flashFrame(false)
  fenetre.setFullScreen(false)
  fenetre.setAlwaysOnTop(false)
  fenetre.setVisibleOnAllWorkspaces(false)
  return true
})

ipcMain.handle('coach:notifier', (_evenement, { titre, corps }) => {
  if (!Notification.isSupported()) return false
  const notif = new Notification({ title: titre, body: corps, urgency: 'critical' })
  notif.on('click', () => {
    if (fenetre) {
      fenetre.show()
      fenetre.focus()
    }
  })
  notif.show()
  return true
})

ipcMain.handle('coach:inactivite', () => powerMonitor.getSystemIdleTime())

ipcMain.handle('coach:ouvrir-lien', (_evenement, url) => {
  if (typeof url === 'string' && /^https?:\/\//.test(url)) shell.openExternal(url)
  return true
})

ipcMain.handle('coach:demarrage-auto', (_evenement, actif) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(actif), args: [] })
  return app.getLoginItemSettings().openAtLogin
})

ipcMain.handle('coach:etat-demarrage-auto', () => app.getLoginItemSettings().openAtLogin)

ipcMain.handle('coach:quitter', () => {
  quitterVraiment = true
  app.quit()
  return true
})
