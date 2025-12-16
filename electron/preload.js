const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  ping: (host) => ipcRenderer.invoke('ping', host),
  traceroute: (host) => ipcRenderer.invoke('traceroute', host),
  onTracerouteProgress: (callback) => {
    ipcRenderer.on('traceroute-progress', (event, data) => callback(data));
  },
  reverseDNS: (ip) => ipcRenderer.invoke('reverse-dns', ip),
  forwardDNS: (hostname) => ipcRenderer.invoke('forward-dns', hostname)
});
