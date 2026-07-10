const { app, BrowserWindow, screen, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');

let mainWindow;
let monitorProcess;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  // Base window dimensions
  const baseWidth = 350;
  const baseHeight = 96;

  // Position at bottom-left corner of the screen, slightly offset
  const posX = x + 24;
  const posY = y + height - baseHeight - 24;

  mainWindow = new BrowserWindow({
    width: baseWidth,
    height: baseHeight,
    x: posX,
    y: posY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false, 
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setVisibleOnAllWorkspaces(true);
    
    startSpotifyMonitor();
    registerGlobalShortcuts();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    cleanup();
  });
}

function registerGlobalShortcuts() {
  try {
    globalShortcut.register('Ctrl+Alt+Space', () => {
      triggerMediaKey(179); // Play/Pause
    });
    globalShortcut.register('Ctrl+Alt+Right', () => {
      triggerMediaKey(176); // Next
    });
    globalShortcut.register('Ctrl+Alt+Left', () => {
      triggerMediaKey(177); // Prev
    });
  } catch (err) {
    console.error('Failed to register global shortcuts:', err);
  }
}

function startSpotifyMonitor() {
  const scriptPath = path.join(__dirname, 'spotify-monitor.ps1');
  
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
    if (mainWindow) {
      setTimeout(startSpotifyMonitor, 3000);
    }
  });
}

function triggerMediaKey(keyCode) {
  const command = `powershell -Command "$wsh = New-Object -ComObject WScript.Shell; $wsh.SendKeys([char]${keyCode})"`;
  exec(command, (err) => {
    if (err) console.error(`Error triggering media key ${keyCode}:`, err);
  });
}

// IPC Handlers
ipcMain.on('spotify-control', (event, action) => {
  switch (action) {
    case 'playpause':
      triggerMediaKey(179);
      break;
    case 'prev':
      triggerMediaKey(177);
      break;
    case 'next':
      triggerMediaKey(176);
      break;
    case 'close':
      app.quit();
      break;
  }
});

// Anchor bottom-left corner when scaling window
ipcMain.on('set-scale', (event, scale) => {
  if (mainWindow) {
    const baseWidth = 350;
    const baseHeight = 96;

    const oldBounds = mainWindow.getBounds();
    const newWidth = Math.round(baseWidth * scale);
    const newHeight = Math.round(baseHeight * scale);

    // Keep the bottom edge anchored at the same screen Y position
    const oldBottom = oldBounds.y + oldBounds.height;
    const newY = oldBottom - newHeight;

    mainWindow.setBounds({
      x: oldBounds.x,
      y: newY,
      width: newWidth,
      height: newHeight
    });
  }
});

function cleanup() {
  globalShortcut.unregisterAll();
  if (monitorProcess) {
    try {
      monitorProcess.kill();
    } catch (e) {
      console.error('Failed to kill monitor process:', e);
    }
    monitorProcess = null;
  }
}

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
