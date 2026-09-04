const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('coach', {
  bureau: true,
  escalader: (niveau) => ipcRenderer.invoke('coach:escalade', niveau),
  liberer: () => ipcRenderer.invoke('coach:liberer'),
  notifier: (titre, corps) => ipcRenderer.invoke('coach:notifier', { titre, corps }),
  inactivite: () => ipcRenderer.invoke('coach:inactivite'),
  ouvrirLien: (url) => ipcRenderer.invoke('coach:ouvrir-lien', url),
  reglerDemarrageAuto: (actif) => ipcRenderer.invoke('coach:demarrage-auto', actif),
  etatDemarrageAuto: () => ipcRenderer.invoke('coach:etat-demarrage-auto'),
  quitter: () => ipcRenderer.invoke('coach:quitter')
})
