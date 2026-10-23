const { app, BrowserWindow, Menu, shell, utilityProcess } = require('electron');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;

const PORT = process.env.PORT || 3001;
const APP_URL = `http://127.0.0.1:${PORT}`;

// Preset fallback environment variables for standalone production on client PC
process.env.PORT = String(PORT);
process.env.NODE_ENV = 'production';
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI =
    'mongodb+srv://aryanvalvi323_db_user:6ZgXXJtHH5Ujprj7@cluster0.zlzgpvy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'super_secret_jwt_key_the_space_story_2026_studio_key_production';
}
process.env.JWT_EXPIRES_IN = '7d';

/**
 * Check if the Express server is up and responsive
 */
function checkServerHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${APP_URL}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Poll until the backend is healthy or timeout expires
 */
async function waitForServer(timeoutMs = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const isUp = await checkServerHealth();
    if (isUp) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

/**
 * Find the server.js entry point in dev or packaged bundle
 */
function getServerScriptPath() {
  const candidates = [
    app.isPackaged ? path.join(process.resourcesPath, 'server/dist/server.js') : '',
    path.join(__dirname, '../server/dist/server.js'),
    path.join(process.cwd(), 'server/dist/server.js'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (require('fs').existsSync(candidate)) {
        return candidate;
      }
    } catch {}
  }
  return path.join(__dirname, '../server/dist/server.js');
}

/**
 * Launch the Express backend in the background
 */
function launchServerProcess() {
  const scriptPath = getServerScriptPath();
  console.log(`[TheSpaceStory] Launching backend server from: ${scriptPath}`);

  const childEnv = {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: 'production',
    ELECTRON_RUN_AS_NODE: '1',
  };

  try {
    if (utilityProcess && typeof utilityProcess.fork === 'function') {
      serverProcess = utilityProcess.fork(scriptPath, [], {
        env: childEnv,
        stdio: 'inherit',
      });
      console.log('[TheSpaceStory] Backend started using utilityProcess');
    } else {
      serverProcess = fork(scriptPath, [], {
        env: childEnv,
        stdio: 'inherit',
      });
      console.log('[TheSpaceStory] Backend started using child_process.fork');
    }
  } catch (err) {
    console.error('[TheSpaceStory] Failed to launch backend process:', err);
    try {
      serverProcess = fork(scriptPath, [], {
        env: childEnv,
        stdio: 'inherit',
      });
    } catch (fallbackErr) {
      console.error('[TheSpaceStory] Fallback fork also failed:', fallbackErr);
    }
  }
}

/**
 * Build the application menu with native shortcuts
 */
function setupMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Print Quotation',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow && mainWindow.webContents) {
              mainWindow.webContents.print();
            }
          },
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit The Space Story' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'The Space Story Studio',
          click: async () => {
            await shell.openExternal('https://thespacestory.com');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Create the main desktop window
 */
function createMainWindow() {
  const iconPath = path.join(__dirname, 'build/icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    title: 'The Space Story — Interior Quotation & Studio System',
    backgroundColor: '#0f1115',
    icon: iconPath,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Load splash screen first while backend connects
  mainWindow.loadFile(path.join(__dirname, 'splash.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in default browser instead of new Electron windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!url.startsWith(APP_URL)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock to prevent duplicate apps running simultaneously
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    setupMenu();
    createMainWindow();

    // Check if backend is already running
    const alreadyRunning = await checkServerHealth();
    if (!alreadyRunning) {
      launchServerProcess();
    }

    // Wait for server ready signal
    const isReady = await waitForServer(30000);
    if (isReady && mainWindow) {
      console.log(`[TheSpaceStory] Connected! Loading ${APP_URL}`);
      mainWindow.loadURL(APP_URL);
    } else if (mainWindow) {
      console.error('[TheSpaceStory] Server failed to initialize within timeout');
      mainWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(`
        <html>
          <body style="background:#0f1115;color:#e6edf3;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;text-align:center;padding:24px;">
            <h2 style="color:#f85149;">Connection Timeout</h2>
            <p style="color:#8b949e;margin-top:12px;max-width:500px;">
              The Space Story background service could not connect to the cloud database. Please verify your internet connection and restart the app.
            </p>
            <button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:#c5a880;color:#121212;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
              Retry Connection
            </button>
          </body>
        </html>
      `)}`
      );
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  app.on('before-quit', () => {
    if (serverProcess) {
      console.log('[TheSpaceStory] Shutting down backend process...');
      try {
        serverProcess.kill();
      } catch (e) {
        console.warn('Error killing server process:', e);
      }
      serverProcess = null;
    }
  });
}
