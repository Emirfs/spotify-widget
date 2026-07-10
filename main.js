const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');

let mainWindow;
let monitorProcess;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  const windowWidth = 340;
  const windowHeight = 84;

  // Position at bottom-left corner of the screen, slightly offset
  const posX = x + 24;
  const posY = y + height - windowHeight - 24;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: posX,
    y: posY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: true,
    show: false, // Prevent flashing before rendering
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    startSpotifyMonitor();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    cleanup();
  });
}

function startSpotifyMonitor() {
  const scriptPath = path.join(__dirname, 'spotify-monitor.ps1');
  
  // Spawn persistent PowerShell process to watch Spotify
  monitorProcess = spawn('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    scriptPath
  ]);

  monitorProcess.stdout.on('data', (data) => {
    const text = data.toString();
    const lines = text.split('\n');
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('TITLE:')) {
        const title = line.substring(6);
        if (mainWindow) {
          mainWindow.webContents.send('spotify-update', title);
        }
      }
    }
  });

  monitorProcess.stderr.on('data', (data) => {
    console.error(`Monitor process error: ${data.toString()}`);
  });

  monitorProcess.on('close', (code) => {
    console.log(`Monitor process exited with code ${code}`);
    // Auto-restart after 3 seconds if app is still running
    if (mainWindow) {
      setTimeout(startSpotifyMonitor, 3000);
    }
  });
}

// Media Control triggers using system SendKeys
function triggerMediaKey(keyCode) {
  const command = `powershell -Command "$wsh = New-Object -ComObject WScript.Shell; $wsh.SendKeys([char]${keyCode})"`;
  exec(command, (err) => {
    if (err) console.error(`Error triggering media key ${keyCode}:`, err);
  });
}

// Handle IPC control events from Renderer
ipcMain.on('spotify-control', (event, action) => {
  switch (action) {
    case 'playpause':
      triggerMediaKey(179); // Play/Pause code
      break;
    case 'prev':
      triggerMediaKey(177); // Prev code
      break;
    case 'next':
      triggerMediaKey(176); // Next code
      break;
    case 'close':
      app.quit();
      break;
  }
});

function cleanup() {
  if (monitorProcess) {
    try {
      monitorProcess.kill();
    } catch (e) {
      console.error('Failed to kill monitor process:', e);
    }
    monitorProcess = null;
  }
}

// Electron lifecycle hooks
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  cleanup();
});
