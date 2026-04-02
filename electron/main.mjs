import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DATA_DIRECTORY = 'FacultyOne';
const DEFAULT_DATA_FILE_NAME = 'faculty-one-data.json';

let mainWindow = null;

const getDefaultDataFilePath = () =>
  path.join(app.getPath('documents'), DEFAULT_DATA_DIRECTORY, DEFAULT_DATA_FILE_NAME);

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
    return;
  }

  await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
};

const ensureParentDirectory = async filePath => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

const registerStorageHandlers = () => {
  ipcMain.handle('storage:getDefaultDataFileInfo', async () => {
    const filePath = getDefaultDataFilePath();
    return {
      path: filePath,
      name: path.basename(filePath),
    };
  });

  ipcMain.handle('storage:ensureDataFile', async (_event, options) => {
    const targetPath = options?.path || getDefaultDataFilePath();
    const initialContents = typeof options?.initialContents === 'string' ? options.initialContents : '';

    await ensureParentDirectory(targetPath);

    let created = false;

    try {
      await fs.access(targetPath);
    } catch {
      await fs.writeFile(targetPath, initialContents, 'utf8');
      created = true;
    }

    const contents = await fs.readFile(targetPath, 'utf8');

    return {
      path: targetPath,
      name: path.basename(targetPath),
      contents,
      created,
    };
  });

  ipcMain.handle('storage:readDataFile', async (_event, filePath) => {
    return fs.readFile(filePath, 'utf8');
  });

  ipcMain.handle('storage:writeDataFile', async (_event, payload) => {
    await ensureParentDirectory(payload.path);
    await fs.writeFile(payload.path, payload.contents, 'utf8');
  });

  ipcMain.handle('storage:chooseDataFile', async (_event, options) => {
    const defaultPath =
      options?.defaultPath ||
      path.join(app.getPath('documents'), DEFAULT_DATA_DIRECTORY, options?.suggestedName || DEFAULT_DATA_FILE_NAME);

    const selection = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    });

    if (selection.canceled || !selection.filePath) {
      return null;
    }

    return {
      path: selection.filePath,
      name: path.basename(selection.filePath),
    };
  });
};

app.whenReady().then(async () => {
  registerStorageHandlers();
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
