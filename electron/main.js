const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const dns = require('dns').promises;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Ping handler
ipcMain.handle('ping', async (event, host) => {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'ping' : 'ping';
    const args = isWindows ? ['-n', '1', '-w', '1000', host] : ['-c', '1', '-W', '1', host];

    const startTime = Date.now();
    const pingProcess = spawn(command, args);

    let output = '';

    pingProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pingProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    pingProcess.on('close', (code) => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (code === 0) {
        // Parse ping time from output
        let time = null;
        if (isWindows) {
          // Try to match with optional decimal: time=7ms or time=7.32ms or time<1ms
          const match = output.match(/time[=<](\d+\.?\d*)ms/i);
          if (match) {
            time = parseFloat(match[1]);
          } else {
            // Fallback: try to find any number followed by ms
            const fallbackMatch = output.match(/(\d+\.?\d*)ms/i);
            if (fallbackMatch) time = parseFloat(fallbackMatch[1]);
          }
        } else {
          const match = output.match(/time=(\d+\.?\d*) ms/);
          if (match) time = parseFloat(match[1]);
        }

        resolve({ success: true, time: time || duration, host });
      } else {
        resolve({ success: false, time: null, host });
      }
    });

    pingProcess.on('error', (err) => {
      resolve({ success: false, time: null, host, error: err.message });
    });
  });
});

// Traceroute handler
ipcMain.handle('traceroute', async (event, host) => {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'tracert' : 'traceroute';
    const args = isWindows ? ['-d', '-h', '30', '-w', '1000', host] : ['-n', '-m', '30', '-w', '1', host];

    const tracerouteProcess = spawn(command, args);

    let output = '';

    tracerouteProcess.stdout.on('data', (data) => {
      output += data.toString();
      // Send partial results
      event.sender.send('traceroute-progress', output);
    });

    tracerouteProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    tracerouteProcess.on('close', (code) => {
      console.log('Traceroute completed with code:', code);
      console.log('Traceroute output:', output.substring(0, 500));
      resolve({ success: code === 0, output, host });
    });

    tracerouteProcess.on('error', (err) => {
      console.error('Traceroute error:', err);
      resolve({ success: false, error: err.message, host });
    });
  });
});

// DNS reverse lookup handler
ipcMain.handle('reverse-dns', async (event, ip) => {
  try {
    const hostnames = await dns.reverse(ip);
    return { success: true, hostname: hostnames[0] || null, ip };
  } catch (err) {
    return { success: false, hostname: null, ip };
  }
});

// Forward DNS lookup handler
ipcMain.handle('forward-dns', async (event, hostname) => {
  try {
    const addresses = await dns.resolve4(hostname);
    return { success: true, ip: addresses[0] || null, hostname };
  } catch (err) {
    return { success: false, ip: null, hostname };
  }
});
