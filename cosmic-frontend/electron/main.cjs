const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  const indexPath = `file://${path.join(__dirname, '..', 'dist', 'index.html')}`
  console.log('Loading URL:', indexPath)
  
  win.loadURL(indexPath).catch(err => {
    console.error('Failed to load URL:', err)
  })

  // Open DevTools for debugging (remove in production)
  win.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
