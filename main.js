const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#1a1310',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:bombaybites',
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  console.log('userData path:', app.getPath('userData'));

  // DevTools only in development, never in the packaged app.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ---- navigation between pages ----
ipcMain.on('navigate', (event, page) => {
  mainWindow.loadFile(path.join(__dirname, 'src', page));
});

// ---- persistent Supabase session storage (survives app restarts) ----
ipcMain.handle('session:get', () => {
  const session = store.get('supabase-session') || null;
  console.log('[main] session:get called, returning:', session ? 'a session object' : 'null');
  return session;
});

ipcMain.handle('session:set', (event, session) => {
  console.log(
    '[main] session:set called, saving session for user:',
    session?.currentSession?.user?.email || session?.user?.email || 'unknown'
  );
  store.set('supabase-session', session);
});

ipcMain.handle('session:clear', () => {
  console.log('[main] session:clear called');
  store.delete('supabase-session');
});