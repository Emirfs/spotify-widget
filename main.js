const { app, BrowserWindow, screen, ipcMain, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;
let monitorProcess;
let tray = null; // Retain reference to prevent garbage collection

// Settings state synchronized from Renderer
let currentSettings = {
  theme: 'dark',
  transparency: false,
  scale: 1.0,
  lyricsOpen: false
};

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  const baseWidth = 350;
  const baseHeight = 96;

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
    skipTaskbar: true, // Exclusive tray app behavior
    resizable: true,
    minWidth: 210,
    minHeight: 58,
    maxWidth: 560,
    maxHeight: 154,
    hasShadow: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.setAspectRatio(baseWidth / baseHeight);

  mainWindow.loadFile('index.html');

  // Capture Renderer Process Console Messages for Debugging
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER CONSOLE] Level:${level} | ${message} (at ${path.basename(sourceId)}:${line})`);
  });

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

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  tray = new Tray(iconPath);
  tray.setToolTip('Spotify Widget');

  // Left click toggles widget visibility
  tray.on('click', () => {
    toggleWindowVisibility();
  });

  rebuildTrayMenu();
}

function rebuildTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Spotify Widget',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show / Hide Widget',
      click: () => {
        toggleWindowVisibility();
      }
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Theme',
          submenu: [
            {
              label: 'Dark Glass',
              type: 'radio',
              checked: currentSettings.theme === 'dark',
              click: () => {
                sendToRenderer('change-theme', 'dark');
              }
            },
            {
              label: 'Light Glass',
              type: 'radio',
              checked: currentSettings.theme === 'light',
              click: () => {
                sendToRenderer('change-theme', 'light');
              }
            }
          ]
        },
        {
          label: 'Transparency',
          submenu: [
            {
              label: 'Glassmorphism',
              type: 'radio',
              checked: !currentSettings.transparency,
              click: () => {
                sendToRenderer('change-transparency', false);
              }
            },
            {
              label: 'Pure Transparent',
              type: 'radio',
              checked: currentSettings.transparency,
              click: () => {
                sendToRenderer('change-transparency', true);
              }
            }
          ]
        },
        {
          label: 'Scale / Size',
          submenu: [
            {
              label: 'Small (80%)',
              type: 'radio',
              checked: Math.abs(currentSettings.scale - 0.8) < 0.05,
              click: () => {
                sendToRenderer('change-scale', 0.8);
              }
            },
            {
              label: 'Normal (100%)',
              type: 'radio',
              checked: Math.abs(currentSettings.scale - 1.0) < 0.05,
              click: () => {
                sendToRenderer('change-scale', 1.0);
              }
            },
            {
              label: 'Large (120%)',
              type: 'radio',
              checked: Math.abs(currentSettings.scale - 1.2) < 0.05,
              click: () => {
                sendToRenderer('change-scale', 1.2);
              }
            },
            {
              label: 'Extra Large (140%)',
              type: 'radio',
              checked: Math.abs(currentSettings.scale - 1.4) < 0.05,
              click: () => {
                sendToRenderer('change-scale', 1.4);
              }
            }
          ]
        },
        {
          label: 'Lyrics Panel',
          type: 'checkbox',
          checked: currentSettings.lyricsOpen,
          click: () => {
            sendToRenderer('change-lyrics', !currentSettings.lyricsOpen);
          }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Play / Pause',
      click: () => {
        triggerMediaKey(179);
      }
    },
    {
      label: 'Next Track',
      click: () => {
        triggerMediaKey(176);
      }
    },
    {
      label: 'Previous Track',
      click: () => {
        triggerMediaKey(177);
      }
    },
    { type: 'separator' },
    {
      label: 'Exit Widget',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function sendToRenderer(channel, data) {
  if (mainWindow) {
    mainWindow.webContents.send(channel, data);
  }
}

function toggleWindowVisibility() {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  }
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
  const scriptName = 'spotify-monitor.ps1';
  const asarScriptPath = path.join(__dirname, scriptName);
  const tempScriptPath = path.join(os.tmpdir(), scriptName);

  try {
    const scriptContent = fs.readFileSync(asarScriptPath, 'utf8');
    fs.writeFileSync(tempScriptPath, scriptContent, 'utf8');
  } catch (err) {
    console.error('Failed to copy spotify-monitor.ps1 to temp directory:', err);
  }
  
  monitorProcess = spawn('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    tempScriptPath
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
      if (mainWindow) mainWindow.hide();
      break;
  }
});

// Set scale initially (on startup)
ipcMain.on('set-scale', (event, scale) => {
  if (mainWindow) {
    const baseWidth = 350;
    const baseHeight = 96;

    const oldBounds = mainWindow.getBounds();
    const newWidth = Math.round(baseWidth * scale);
    const newHeight = Math.round(baseHeight * scale);

    const oldBottom = oldBounds.y + oldBounds.height;
    const newY = oldBottom - newHeight;

    mainWindow.setAspectRatio(0);
    mainWindow.setBounds({
      x: oldBounds.x,
      y: newY,
      width: newWidth,
      height: newHeight
    });
    mainWindow.setAspectRatio(baseWidth / baseHeight);
  }
});

// Toggle resizable state based on mini-mode
ipcMain.on('toggle-mini-mode', (event, isMini) => {
  if (mainWindow) {
    mainWindow.setResizable(!isMini);
    if (!isMini) {
      mainWindow.setAspectRatio(350 / 96);
    }
  }
});

// Handle lyrics panel expand / collapse
ipcMain.on('set-lyrics-height', (event, { open, scale }) => {
  if (mainWindow) {
    const baseWidth = 350;
    const baseHeightNormal = 96;
    const baseHeightLyrics = 290;

    const oldBounds = mainWindow.getBounds();
    const newWidth = Math.round(baseWidth * scale);
    const newHeight = Math.round((open ? baseHeightLyrics : baseHeightNormal) * scale);

    const oldBottom = oldBounds.y + oldBounds.height;
    const newY = oldBottom - newHeight;

    mainWindow.setAspectRatio(0);
    mainWindow.setResizable(!open);
    
    mainWindow.setBounds({
      x: oldBounds.x,
      y: newY,
      width: newWidth,
      height: newHeight
    });

    if (!open) {
      mainWindow.setAspectRatio(baseWidth / baseHeightNormal);
    }
  }
});

// Sync settings state from Renderer and rebuild menu
ipcMain.on('sync-settings', (event, settings) => {
  currentSettings = settings;
  rebuildTrayMenu();
});

function cleanup() {
  globalShortcut.unregisterAll();
  if (tray) {
    tray.destroy();
    tray = null;
  }
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
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      createTray();
    }
  });
});

app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  cleanup();
});
