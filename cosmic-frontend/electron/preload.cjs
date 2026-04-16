// Preload script — keep minimal and safe
const { contextBridge } = require('electron')

// Expose a minimal API surface if needed later
contextBridge.exposeInMainWorld('electron', {
  isElectron: true
})
