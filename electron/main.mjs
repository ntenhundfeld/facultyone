import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
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

const sanitizeSegment = value => {
  const normalized = String(value ?? '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');

  return normalized || 'file';
};

const makeUniqueAttachmentFileName = async (targetDirectory, scope, parentId, originalName) => {
  const extension = path.extname(originalName);
  const originalBase = path.basename(originalName, extension);
  const baseName = `${sanitizeSegment(scope)}-${sanitizeSegment(parentId)}-${sanitizeSegment(originalBase)}`.slice(0, 120);

  let attempt = 0;

  while (attempt < 500) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
    const candidate = `${baseName}${suffix}${extension.toLowerCase()}`;
    const candidatePath = path.join(targetDirectory, candidate);

    try {
      await fs.access(candidatePath);
      attempt += 1;
    } catch {
      return candidate;
    }
  }

  return `${baseName}-${Date.now()}${extension.toLowerCase()}`;
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

  ipcMain.handle('storage:importAttachments', async (_event, payload) => {
    const selection = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
    });

    if (selection.canceled || selection.filePaths.length === 0) {
      return [];
    }

    const targetDirectory = path.dirname(payload.dataFilePath);
    await fs.mkdir(targetDirectory, { recursive: true });

    const copiedFiles = [];

    for (const sourcePath of selection.filePaths) {
      const originalName = path.basename(sourcePath);
      const storedFileName = await makeUniqueAttachmentFileName(
        targetDirectory,
        payload.scope,
        payload.parentId,
        originalName,
      );
      const targetPath = path.join(targetDirectory, storedFileName);

      await fs.copyFile(sourcePath, targetPath);
      const stats = await fs.stat(targetPath);

      copiedFiles.push({
        originalName,
        storedFileName,
        sizeBytes: stats.size,
        copiedAt: new Date().toISOString(),
      });
    }

    return copiedFiles;
  });

  ipcMain.handle('storage:openAttachment', async (_event, payload) => {
    const targetPath = path.join(path.dirname(payload.dataFilePath), payload.storedFileName);
    return shell.openPath(targetPath);
  });

  ipcMain.handle('storage:deleteAttachment', async (_event, payload) => {
    const targetPath = path.join(path.dirname(payload.dataFilePath), payload.storedFileName);
    await fs.rm(targetPath, { force: true });
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
