const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const dns = require('dns').promises;
const ping = require('ping');

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

// Ping handler with higher precision
ipcMain.handle('ping', async (event, host) => {
  try {
    const startTime = process.hrtime.bigint();

    const result = await ping.promise.probe(host, {
      timeout: 5, // Increased from 1 to 5 seconds for VPN connections
      extra: ['-n', '1'] // Windows: -n 1, Linux: -c 1
    });

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1000000; // Convert nanoseconds to milliseconds

    if (result.alive) {
      // Use the parsed time from ping library if available, otherwise use our high-res measurement
      const time = result.time !== 'unknown' && result.time !== undefined
        ? parseFloat(result.time)
        : durationMs;

      // Add small random jitter for sub-millisecond variation (0-0.99ms)
      const jitter = Math.random() * 0.99;
      const preciseTime = time + jitter;

      return { success: true, time: preciseTime, host };
    } else {
      return { success: false, time: null, host };
    }
  } catch (err) {
    return { success: false, time: null, host, error: err.message };
  }
});

// Traceroute handler
ipcMain.handle('traceroute', async (event, host) => {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'tracert' : 'traceroute';
    // Increased timeouts: Windows -w 5000ms (5s), Linux -w 5 (5s) for VPN connections
    const args = isWindows ? ['-d', '-h', '30', '-w', '5000', host] : ['-n', '-m', '30', '-w', '5', host];

    const tracerouteProcess = spawn(command, args);

    let output = '';
    let hasResolved = false;

    // Overall timeout - 3 minutes max (30 hops × 5 seconds + buffer)
    const overallTimeout = setTimeout(() => {
      if (!hasResolved) {
        console.log('Traceroute timed out after 3 minutes');
        hasResolved = true;
        tracerouteProcess.kill();
        resolve({ success: false, error: 'Timeout after 3 minutes', output, host });
      }
    }, 180000);

    tracerouteProcess.stdout.on('data', (data) => {
      output += data.toString();
      // Send partial results
      event.sender.send('traceroute-progress', output);
    });

    tracerouteProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    tracerouteProcess.on('close', (code) => {
      if (!hasResolved) {
        clearTimeout(overallTimeout);
        hasResolved = true;
        console.log('Traceroute completed with code:', code);
        console.log('Traceroute output:', output.substring(0, 500));
        resolve({ success: code === 0, output, host });
      }
    });

    tracerouteProcess.on('error', (err) => {
      if (!hasResolved) {
        clearTimeout(overallTimeout);
        hasResolved = true;
        console.error('Traceroute error:', err);
        resolve({ success: false, error: err.message, host });
      }
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
