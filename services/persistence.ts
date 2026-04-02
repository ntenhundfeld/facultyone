import { AppData } from '../types';
import { normalizeResearchStages } from '../utils/researchStages';
import { AISettingsSnapshot, DEFAULT_OPENAI_MODEL } from './aiSettings';

export type StorageMode = 'browser' | 'file';
export type DeleteConfirmationCategory =
  | 'personnel'
  | 'projects'
  | 'research-stages'
  | 'courses'
  | 'service-roles'
  | 'performance-notes'
  | 'research-notes'
  | 'student-notes'
  | 'students'
  | 'course-files';

export interface PersistedAppData {
  data: AppData;
  savedAt?: string;
  aiSettings?: AISettingsSnapshot;
}

interface BrowserFileHandle {
  name?: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{
    write: (contents: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
  queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
}

export interface DesktopFileHandle {
  kind: 'desktop-file';
  path: string;
  name: string;
}

type StoredFileHandle = BrowserFileHandle | DesktopFileHandle;

const APP_DATA_KEY = 'facultyone.app-data';
const STORAGE_MODE_KEY = 'facultyone.storage-mode';
const STORAGE_FILE_NAME_KEY = 'facultyone.storage-file-name';
const STORAGE_FILE_PATH_KEY = 'facultyone.storage-file-path';
const DELETE_CONFIRMATION_PREFS_KEY = 'facultyone.delete-confirmation-preferences';
const HANDLE_DB_NAME = 'facultyone.handles';
const HANDLE_STORE_NAME = 'handles';
const HANDLE_KEY = 'primary-data-file';

const FILE_PICKER_TYPES = [
  {
    description: 'FacultyOne data',
    accept: {
      'application/json': ['.json'],
    },
  },
];

const FALLBACK_ERROR = 'Falling back to browser storage.';
const DEFAULT_DATA_FILE_NAME = 'faculty-one-data.json';

const supportsWindow = () => typeof window !== 'undefined';

type DeleteConfirmationPreferences = Partial<Record<DeleteConfirmationCategory, boolean>>;

const browserSupportsFileSystemAccess = () => {
  if (!supportsWindow()) {
    return false;
  }

  return typeof (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker === 'function';
};

const getDesktopBridge = () => {
  if (!supportsWindow()) {
    return null;
  }

  return window.academicDevOpsDesktop ?? null;
};

const isDesktopFileHandle = (handle: StoredFileHandle): handle is DesktopFileHandle =>
  'kind' in handle && handle.kind === 'desktop-file';

const getFileNameFromPath = (filePath: string) => {
  const parts = filePath.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? DEFAULT_DATA_FILE_NAME;
};

const normalizeAISettings = (value: unknown): AISettingsSnapshot | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Partial<AISettingsSnapshot>;

  return {
    openAIApiKey: typeof candidate.openAIApiKey === 'string' ? candidate.openAIApiKey.trim() : '',
    openAIModel:
      typeof candidate.openAIModel === 'string' && candidate.openAIModel.trim()
        ? candidate.openAIModel.trim()
        : DEFAULT_OPENAI_MODEL,
  };
};

export const isDesktopRuntime = () => Boolean(getDesktopBridge()?.isDesktop);

export const supportsFileSystemAccess = () => browserSupportsFileSystemAccess() || isDesktopRuntime();

export const getDefaultDesktopDataFileInfo = async () => {
  const desktopBridge = getDesktopBridge();
  if (!desktopBridge) {
    return null;
  }

  return desktopBridge.getDefaultDataFileInfo();
};

const normalizeAppData = (value: unknown): AppData | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<AppData>;

  return {
    tasks: Array.isArray(candidate.tasks) ? candidate.tasks : [],
    personnel: Array.isArray(candidate.personnel) ? candidate.personnel : [],
    projects: Array.isArray(candidate.projects) ? candidate.projects : [],
    researchStages: normalizeResearchStages(
      candidate.researchStages,
      Array.isArray(candidate.projects) ? candidate.projects : [],
    ),
    courses: Array.isArray(candidate.courses) ? candidate.courses : [],
    serviceRoles: Array.isArray(candidate.serviceRoles) ? candidate.serviceRoles : [],
  };
};

const parsePersistedPayload = (raw: string): PersistedAppData | null => {
  try {
    const parsed = JSON.parse(raw) as { data?: unknown; savedAt?: string; aiSettings?: unknown } | AppData;
    const normalized = normalizeAppData('data' in parsed ? parsed.data : parsed);

    if (!normalized) {
      return null;
    }

    return {
      data: normalized,
      savedAt: 'savedAt' in parsed && typeof parsed.savedAt === 'string' ? parsed.savedAt : undefined,
      aiSettings: 'aiSettings' in parsed ? normalizeAISettings(parsed.aiSettings) : undefined,
    };
  } catch {
    return null;
  }
};

const serializePayload = (data: AppData, savedAt: string, aiSettings?: AISettingsSnapshot) =>
  JSON.stringify(
    {
      version: 1,
      savedAt,
      data,
      aiSettings,
    },
    null,
    2,
  );

export const loadAppDataFromBrowser = (): PersistedAppData | null => {
  if (!supportsWindow()) {
    return null;
  }

  const raw = window.localStorage.getItem(APP_DATA_KEY);
  if (!raw) {
    return null;
  }

  return parsePersistedPayload(raw);
};

export const saveAppDataToBrowser = (data: AppData, aiSettings?: AISettingsSnapshot) => {
  if (!supportsWindow()) {
    return null;
  }

  const savedAt = new Date().toISOString();
  window.localStorage.setItem(APP_DATA_KEY, serializePayload(data, savedAt, aiSettings));
  return savedAt;
};

export const clearAppDataFromBrowser = () => {
  if (!supportsWindow()) {
    return;
  }

  window.localStorage.removeItem(APP_DATA_KEY);
};

export const loadStorageMode = (): StorageMode => {
  if (!supportsWindow()) {
    return 'browser';
  }

  const saved = window.localStorage.getItem(STORAGE_MODE_KEY);
  if (saved === 'file' || saved === 'browser') {
    return saved;
  }

  return isDesktopRuntime() ? 'file' : 'browser';
};

export const saveStorageMode = (mode: StorageMode) => {
  if (!supportsWindow()) {
    return;
  }

  window.localStorage.setItem(STORAGE_MODE_KEY, mode);
};

export const loadStorageFileName = () => {
  if (!supportsWindow()) {
    return null;
  }

  return window.localStorage.getItem(STORAGE_FILE_NAME_KEY);
};

export const saveStorageFileName = (fileName: string | null) => {
  if (!supportsWindow()) {
    return;
  }

  if (!fileName) {
    window.localStorage.removeItem(STORAGE_FILE_NAME_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_FILE_NAME_KEY, fileName);
};

export const loadStorageFilePath = () => {
  if (!supportsWindow()) {
    return null;
  }

  return window.localStorage.getItem(STORAGE_FILE_PATH_KEY);
};

export const saveStorageFilePath = (filePath: string | null) => {
  if (!supportsWindow()) {
    return;
  }

  if (!filePath) {
    window.localStorage.removeItem(STORAGE_FILE_PATH_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_FILE_PATH_KEY, filePath);
};

const loadDeleteConfirmationPreferences = (): DeleteConfirmationPreferences => {
  if (!supportsWindow()) {
    return {};
  }

  const raw = window.localStorage.getItem(DELETE_CONFIRMATION_PREFS_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as DeleteConfirmationPreferences;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveDeleteConfirmationPreferences = (preferences: DeleteConfirmationPreferences) => {
  if (!supportsWindow()) {
    return;
  }

  window.localStorage.setItem(DELETE_CONFIRMATION_PREFS_KEY, JSON.stringify(preferences));
};

export const shouldSkipDeleteConfirmation = (category: DeleteConfirmationCategory) => {
  const preferences = loadDeleteConfirmationPreferences();
  return preferences[category] === true;
};

export const setDeleteConfirmationPreference = (
  category: DeleteConfirmationCategory,
  shouldSkip: boolean,
) => {
  const preferences = loadDeleteConfirmationPreferences();
  const nextPreferences: DeleteConfirmationPreferences = {
    ...preferences,
    [category]: shouldSkip,
  };

  saveDeleteConfirmationPreferences(nextPreferences);
};

const openHandleDb = async () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(HANDLE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        db.createObjectStore(HANDLE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const getStoredBrowserFileHandle = async (): Promise<BrowserFileHandle | null> => {
  if (!supportsWindow() || !browserSupportsFileSystemAccess()) {
    return null;
  }

  const db = await openHandleDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HANDLE_STORE_NAME, 'readonly');
    const store = transaction.objectStore(HANDLE_STORE_NAME);
    const request = store.get(HANDLE_KEY);

    request.onsuccess = () => resolve((request.result as BrowserFileHandle | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
};

const setStoredBrowserFileHandle = async (handle: BrowserFileHandle | null) => {
  if (!supportsWindow() || !browserSupportsFileSystemAccess()) {
    return;
  }

  const db = await openHandleDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(HANDLE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(HANDLE_STORE_NAME);
    const request = handle ? store.put(handle, HANDLE_KEY) : store.delete(HANDLE_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const writeAppDataToFile = async (
  handle: StoredFileHandle,
  data: AppData,
  aiSettings?: AISettingsSnapshot,
) => {
  const savedAt = new Date().toISOString();
  const payload = serializePayload(data, savedAt, aiSettings);

  if (isDesktopFileHandle(handle)) {
    const desktopBridge = getDesktopBridge();
    if (!desktopBridge) {
      throw new Error(`Desktop file bridge not available. ${FALLBACK_ERROR}`);
    }

    await desktopBridge.writeDataFile(handle.path, payload);
    return savedAt;
  }

  const writable = await handle.createWritable();
  await writable.write(payload);
  await writable.close();

  return savedAt;
};

export const readAppDataFromFile = async (handle: StoredFileHandle): Promise<PersistedAppData> => {
  let raw: string;

  if (isDesktopFileHandle(handle)) {
    const desktopBridge = getDesktopBridge();
    if (!desktopBridge) {
      throw new Error(`Desktop file bridge not available. ${FALLBACK_ERROR}`);
    }

    raw = await desktopBridge.readDataFile(handle.path);
  } else {
    const file = await handle.getFile();
    raw = await file.text();
  }

  const parsed = parsePersistedPayload(raw);

  if (!parsed) {
    throw new Error('The selected file does not contain valid FacultyOne data.');
  }

  return parsed;
};

const ensureFilePermission = async (
  handle: BrowserFileHandle,
  promptForPermission: boolean,
  mode: 'read' | 'readwrite' = 'read',
) => {
  if (!handle.queryPermission && !handle.requestPermission) {
    return true;
  }

  const currentPermission = await handle.queryPermission?.({ mode });
  if (currentPermission === 'granted') {
    return true;
  }

  if (!promptForPermission) {
    return false;
  }

  const requestedPermission = await handle.requestPermission?.({ mode });
  return requestedPermission === 'granted';
};

const createDesktopHandle = async (pathOverride?: string): Promise<DesktopFileHandle> => {
  const desktopBridge = getDesktopBridge();
  if (!desktopBridge) {
    throw new Error(`Desktop file bridge not available. ${FALLBACK_ERROR}`);
  }

  const defaultInfo = await desktopBridge.getDefaultDataFileInfo();
  const targetPath = pathOverride ?? loadStorageFilePath() ?? defaultInfo.path;

  return {
    kind: 'desktop-file',
    path: targetPath,
    name: getFileNameFromPath(targetPath),
  };
};

export const chooseStorageFile = async (data: AppData, aiSettings?: AISettingsSnapshot) => {
  const desktopBridge = getDesktopBridge();
  if (desktopBridge) {
    const defaultInfo = await desktopBridge.getDefaultDataFileInfo();
    const selection = await desktopBridge.chooseDataFile({
      defaultPath: loadStorageFilePath() ?? defaultInfo.path,
      suggestedName: defaultInfo.name,
    });

    if (!selection) {
      throw new Error('Save file selection was canceled.');
    }

    const handle: DesktopFileHandle = {
      kind: 'desktop-file',
      path: selection.path,
      name: selection.name,
    };

    const savedAt = await writeAppDataToFile(handle, data, aiSettings);
    saveStorageMode('file');
    saveStorageFileName(handle.name);
    saveStorageFilePath(handle.path);

    return {
      handle,
      fileName: handle.name,
      savedAt,
    };
  }

  if (!browserSupportsFileSystemAccess()) {
    throw new Error(`Your browser does not support local file storage. ${FALLBACK_ERROR}`);
  }

  const picker = (window as Window & {
    showSaveFilePicker: (options: {
      suggestedName: string;
      excludeAcceptAllOption: boolean;
      types: typeof FILE_PICKER_TYPES;
    }) => Promise<BrowserFileHandle>;
  }).showSaveFilePicker;

  const handle = await picker({
    suggestedName: DEFAULT_DATA_FILE_NAME,
    excludeAcceptAllOption: false,
    types: FILE_PICKER_TYPES,
  });

  const savedAt = await writeAppDataToFile(handle, data, aiSettings);
  await setStoredBrowserFileHandle(handle);
  saveStorageMode('file');
  saveStorageFileName(handle.name ?? DEFAULT_DATA_FILE_NAME);
  saveStorageFilePath(null);

  return {
    handle,
    fileName: handle.name ?? DEFAULT_DATA_FILE_NAME,
    savedAt,
  };
};

export const resumeStoredFile = async (
  promptForPermission = false,
  seed?: { data: AppData; aiSettings?: AISettingsSnapshot },
) => {
  const desktopBridge = getDesktopBridge();
  if (desktopBridge) {
    const desktopHandle = await createDesktopHandle();
    const initialContents = serializePayload(
      seed?.data ?? normalizeAppData({}) ?? { tasks: [], personnel: [], projects: [], researchStages: [], courses: [], serviceRoles: [] },
      new Date().toISOString(),
      seed?.aiSettings,
    );

    const ensured = await desktopBridge.ensureDataFile({
      path: desktopHandle.path,
      initialContents,
    });

    const parsed = parsePersistedPayload(ensured.contents);
    if (!parsed) {
      throw new Error('The selected file does not contain valid FacultyOne data.');
    }

    const handle: DesktopFileHandle = {
      kind: 'desktop-file',
      path: ensured.path,
      name: ensured.name,
    };

    saveStorageMode('file');
    saveStorageFileName(handle.name);
    saveStorageFilePath(handle.path);

    return {
      handle,
      fileName: handle.name,
      ...parsed,
    };
  }

  const handle = await getStoredBrowserFileHandle();

  if (!handle) {
    throw new Error(`No saved file connection found. ${FALLBACK_ERROR}`);
  }

  const hasPermission = await ensureFilePermission(handle, promptForPermission, 'read');
  if (!hasPermission) {
    throw new Error(
      'Saved file location found, but this tab needs permission before reconnecting. Use "Reload from File" or "Change Save File" in Settings.',
    );
  }

  const payload = await readAppDataFromFile(handle);
  saveStorageFileName(handle.name ?? DEFAULT_DATA_FILE_NAME);
  saveStorageFilePath(null);

  return {
    handle,
    fileName: handle.name ?? DEFAULT_DATA_FILE_NAME,
    ...payload,
  };
};
