import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ResearchBoard } from './components/ResearchBoard';
import { PersonnelView } from './components/PersonnelView';
import { TeachingView } from './components/TeachingView';
import { ServiceView } from './components/ServiceView';
import { AIAssistant } from './components/AIAssistant';
import { InboxView } from './components/InboxView';
import { SearchView } from './components/SearchView';
import { AppData, Category, Course, Personnel, Priority, ResearchProject, ServiceRole, Status, Task } from './types';
import { buildAISettingsSnapshot, clearOpenAISettings, DEFAULT_OPENAI_MODEL, loadOpenAIApiKey, loadOpenAIModel, saveOpenAIApiKey, saveOpenAIModel } from './services/aiSettings';
import { chooseStorageFile, clearAppDataFromBrowser, getDefaultDesktopDataFileInfo, isDesktopRuntime, loadAppDataFromBrowser, loadStorageFileName, loadStorageFilePath, loadStorageMode, readAppDataFromFile, resumeStoredFile, saveAppDataToBrowser, saveStorageFileName, saveStorageFilePath, saveStorageMode, supportsFileSystemAccess, writeAppDataToFile, type StorageMode } from './services/persistence';
import { DEFAULT_RESEARCH_STAGES, normalizeResearchStages } from './utils/researchStages';
import { normalizeTask } from './utils/tasks';
import { buildSearchResults } from './utils/search';

const DARK_MODE_KEY = 'facultyone.dark-mode';
const FILE_SYNC_INTERVAL_MS = 15000;

const INITIAL_TASKS: Task[] = [];
const INITIAL_SERVICE_ROLES: ServiceRole[] = [];
const INITIAL_PERSONNEL: Personnel[] = [];
const INITIAL_PROJECTS: ResearchProject[] = [];
const INITIAL_COURSES: Course[] = [];

const DEFAULT_APP_DATA: AppData = {
  tasks: INITIAL_TASKS.map(normalizeTask),
  personnel: INITIAL_PERSONNEL,
  projects: INITIAL_PROJECTS,
  researchStages: [...DEFAULT_RESEARCH_STAGES],
  courses: INITIAL_COURSES,
  serviceRoles: INITIAL_SERVICE_ROLES,
};

const readInitialDarkMode = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(DARK_MODE_KEY) === 'true';
};

const App: React.FC = () => {
  const browserSeed = useMemo(() => loadAppDataFromBrowser(), []);
  const cleanedBrowserSeed = useMemo(
    () =>
      browserSeed
        ? {
            ...browserSeed,
            data: browserSeed.data,
          }
        : null,
    [browserSeed],
  );
  const usesDesktopRuntime = useMemo(() => isDesktopRuntime(), []);
  const initialAiSettingsSnapshot = useMemo(
    () =>
      buildAISettingsSnapshot(
        cleanedBrowserSeed?.aiSettings?.openAIApiKey ?? loadOpenAIApiKey(),
        cleanedBrowserSeed?.aiSettings?.openAIModel ?? loadOpenAIModel(),
      ),
    [cleanedBrowserSeed],
  );
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [appData, setAppData] = useState<AppData>(() =>
    cleanedBrowserSeed
      ? {
          ...cleanedBrowserSeed.data,
          tasks: cleanedBrowserSeed.data.tasks.map(normalizeTask),
          researchStages: normalizeResearchStages(cleanedBrowserSeed.data.researchStages, cleanedBrowserSeed.data.projects),
        }
      : DEFAULT_APP_DATA,
  );
  const [isDarkMode, setIsDarkMode] = useState(readInitialDarkMode);
  const [storageMode, setStorageModeState] = useState<StorageMode>(loadStorageMode);
  const [storageFileHandle, setStorageFileHandle] = useState<Awaited<ReturnType<typeof resumeStoredFile>>['handle'] | null>(null);
  const [storageFileName, setStorageFileName] = useState<string | null>(loadStorageFileName);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(cleanedBrowserSeed?.savedAt ?? null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isStorageBusy, setIsStorageBusy] = useState(false);
  const [requiresInitialStorageSetup, setRequiresInitialStorageSetup] = useState(false);
  const [defaultDesktopSavePath, setDefaultDesktopSavePath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiApiKey, setAiApiKey] = useState(() => cleanedBrowserSeed?.aiSettings?.openAIApiKey ?? loadOpenAIApiKey());
  const [aiModel, setAiModel] = useState(() => cleanedBrowserSeed?.aiSettings?.openAIModel ?? loadOpenAIModel());
  const skipNextFileWriteRef = useRef(false);

  const { tasks, personnel, projects, researchStages, courses, serviceRoles } = appData;
  const dataFilePath =
    storageMode === 'file' && storageFileHandle && 'kind' in storageFileHandle && storageFileHandle.kind === 'desktop-file'
      ? storageFileHandle.path
      : loadStorageFilePath();

  useEffect(() => {
    if (!usesDesktopRuntime) {
      return;
    }

    let isCancelled = false;

    const loadDefaultDesktopSavePath = async () => {
      const info = await getDefaultDesktopDataFileInfo();
      if (!isCancelled) {
        setDefaultDesktopSavePath(info?.path ?? null);
      }
    };

    void loadDefaultDesktopSavePath();

    return () => {
      isCancelled = true;
    };
  }, [usesDesktopRuntime]);

  useEffect(() => {
    let isCancelled = false;

    const hydrateFromPreferredStorage = async () => {
      const preferredStorageMode = loadStorageMode();
      const storedFilePath = loadStorageFilePath();

      if (preferredStorageMode !== 'file') {
        setRequiresInitialStorageSetup(false);
        setIsHydrated(true);
        return;
      }

      if (usesDesktopRuntime && !storedFilePath) {
        if (!isCancelled) {
          setStorageFileHandle(null);
          setStorageFileName(null);
          setStorageError(null);
          setRequiresInitialStorageSetup(true);
          setIsHydrated(true);
        }
        return;
      }

      try {
        const resumed = await resumeStoredFile(false, {
          data: cleanedBrowserSeed?.data ?? DEFAULT_APP_DATA,
          aiSettings: initialAiSettingsSnapshot,
        });
        if (isCancelled) {
          return;
        }

        const sanitizedData = resumed.data;
        setAppData({
          ...sanitizedData,
          tasks: sanitizedData.tasks.map(normalizeTask),
          researchStages: normalizeResearchStages(sanitizedData.researchStages, sanitizedData.projects),
        });
        setStorageFileHandle(resumed.handle);
        setStorageFileName(resumed.fileName);
        setStorageModeState('file');
        setLastSavedAt(resumed.savedAt ?? cleanedBrowserSeed?.savedAt ?? null);
        setStorageError(null);
        setRequiresInitialStorageSetup(false);
        if (resumed.aiSettings) {
          setAiApiKey(resumed.aiSettings.openAIApiKey);
          setAiModel(resumed.aiSettings.openAIModel);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setStorageFileHandle(null);
        setStorageModeState(loadStorageMode());
        setStorageError(error instanceof Error ? error.message : 'Could not reconnect to the selected data file. Browser storage is still keeping a backup.');
      } finally {
        if (!isCancelled) {
          setIsHydrated(true);
        }
      }
    };

    hydrateFromPreferredStorage();

    return () => {
      isCancelled = true;
    };
  }, [cleanedBrowserSeed, cleanedBrowserSeed?.savedAt, initialAiSettingsSnapshot, usesDesktopRuntime]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(DARK_MODE_KEY, String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    if (usesDesktopRuntime && storageMode === 'file') {
      clearOpenAISettings();
      return;
    }

    saveOpenAIApiKey(aiApiKey);
    saveOpenAIModel(aiModel || DEFAULT_OPENAI_MODEL);
  }, [aiApiKey, aiModel, storageMode, usesDesktopRuntime]);

  useEffect(() => {
    if (!isHydrated || requiresInitialStorageSetup) {
      return;
    }

    const aiSettings = buildAISettingsSnapshot(aiApiKey, aiModel);
    const shouldMirrorToBrowser = !usesDesktopRuntime || storageMode === 'browser';
    const browserSavedAt = shouldMirrorToBrowser ? saveAppDataToBrowser(appData, aiSettings) : null;

    if (!shouldMirrorToBrowser) {
      clearAppDataFromBrowser();
    }

    if (storageMode !== 'file' || !storageFileHandle) {
      setLastSavedAt(previous => browserSavedAt ?? previous);
      return;
    }

    if (skipNextFileWriteRef.current) {
      skipNextFileWriteRef.current = false;
      setLastSavedAt(previous => previous ?? browserSavedAt ?? null);
      return;
    }

    let isCancelled = false;
    setIsStorageBusy(true);

    writeAppDataToFile(storageFileHandle, appData, aiSettings)
      .then(savedAt => {
        if (isCancelled) {
          return;
        }

        setLastSavedAt(savedAt);
        setStorageError(null);
      })
      .catch(error => {
        if (isCancelled) {
          return;
        }

        setStorageError(
          error instanceof Error
            ? shouldMirrorToBrowser
              ? `${error.message} Browser storage is still keeping a backup.`
              : error.message
            : shouldMirrorToBrowser
              ? 'Could not save to the selected file. Browser storage is still keeping a backup.'
              : 'Could not save to the local data file.',
        );
      })
      .finally(() => {
        if (!isCancelled) {
          setIsStorageBusy(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [aiApiKey, aiModel, appData, isHydrated, requiresInitialStorageSetup, storageFileHandle, storageMode, usesDesktopRuntime]);

  useEffect(() => {
    if (!isHydrated || storageMode !== 'file' || !storageFileHandle) {
      return;
    }

    let isCancelled = false;

    const pullLatestFromFile = async () => {
      try {
        const payload = await readAppDataFromFile(storageFileHandle);
        if (isCancelled || !payload.savedAt || payload.savedAt === lastSavedAt) {
          return;
        }

        skipNextFileWriteRef.current = true;
        setAppData({
          ...payload.data,
          tasks: payload.data.tasks.map(normalizeTask),
          researchStages: normalizeResearchStages(payload.data.researchStages, payload.data.projects),
        });
        if (payload.aiSettings) {
          setAiApiKey(payload.aiSettings.openAIApiKey);
          setAiModel(payload.aiSettings.openAIModel);
        }
        setLastSavedAt(payload.savedAt);
        setStorageError(null);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setStorageError(
          error instanceof Error
            ? usesDesktopRuntime
              ? error.message
              : `${error.message} Browser storage is still keeping a backup.`
            : usesDesktopRuntime
              ? 'Could not sync from the local data file.'
              : 'Could not sync from the selected file. Browser storage is still keeping a backup.',
        );
      }
    };

    const intervalId = window.setInterval(() => {
      void pullLatestFromFile();
    }, FILE_SYNC_INTERVAL_MS);

    void pullLatestFromFile();

    const handleWindowFocus = () => {
      void pullLatestFromFile();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void pullLatestFromFile();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isHydrated, lastSavedAt, storageFileHandle, storageMode, usesDesktopRuntime]);

  const updateTasks = (nextTasks: Task[]) => {
    setAppData(prev => ({ ...prev, tasks: nextTasks.map(normalizeTask) }));
  };

  const updatePersonnel = (nextPersonnel: Personnel[]) => {
    setAppData(prev => ({ ...prev, personnel: nextPersonnel }));
  };

  const updateProjects = (nextProjects: ResearchProject[]) => {
    setAppData(prev => ({
      ...prev,
      projects: nextProjects,
      researchStages: normalizeResearchStages(prev.researchStages, nextProjects),
    }));
  };

  const updateResearchStages = (nextResearchStages: string[]) => {
    setAppData(prev => ({
      ...prev,
      researchStages: normalizeResearchStages(nextResearchStages, prev.projects),
    }));
  };

  const updateCourses = (nextCourses: Course[]) => {
    setAppData(prev => ({ ...prev, courses: nextCourses }));
  };

  const updateServiceRoles = (nextServiceRoles: ServiceRole[]) => {
    setAppData(prev => ({ ...prev, serviceRoles: nextServiceRoles }));
  };

  const handleAddPersonnel = (newPersonnel: Personnel) => {
    updatePersonnel([...personnel, newPersonnel]);
  };

  const handleDeletePersonnel = (id: string) => {
    setAppData(prev => ({
      ...prev,
      personnel: prev.personnel.filter(item => item.id !== id),
      tasks: prev.tasks.filter(task => task.relatedPersonnelId !== id && task.assigneeId !== id),
    }));

    if (activeItemId === id) {
      setActiveItemId(null);
    }
  };

  const handleDeleteProject = (id: string) => {
    setAppData(prev => ({
      ...prev,
      projects: prev.projects.filter(item => item.id !== id),
      tasks: prev.tasks.filter(task => task.projectId !== id),
    }));

    if (activeItemId === id) {
      setActiveItemId(null);
    }
  };

  const handleDeleteCourse = (id: string) => {
    setAppData(prev => ({
      ...prev,
      courses: prev.courses.filter(item => item.id !== id),
      tasks: prev.tasks.filter(task => task.courseId !== id),
    }));

    if (activeItemId === id) {
      setActiveItemId(null);
    }
  };

  const handleDeleteServiceRole = (id: string) => {
    setAppData(prev => ({
      ...prev,
      serviceRoles: prev.serviceRoles.filter(item => item.id !== id),
      tasks: prev.tasks.filter(task => task.serviceRoleId !== id),
    }));

    if (activeItemId === id) {
      setActiveItemId(null);
    }
  };

  const handleTaskClick = (task: Task) => {
    if (task.category === Category.RESEARCH && task.projectId) {
      setCurrentView('research');
      setActiveItemId(task.projectId);
    } else if (task.category === Category.TEACHING && task.courseId) {
      setCurrentView('teaching');
      setActiveItemId(task.courseId);
    } else if (task.category === Category.SERVICE && task.serviceRoleId) {
      setCurrentView('service');
      setActiveItemId(task.serviceRoleId);
    } else if (task.category === Category.PERSONNEL && (task.relatedPersonnelId || task.assigneeId)) {
      setCurrentView('personnel');
      setActiveItemId(task.relatedPersonnelId || task.assigneeId || null);
    }
  };

  const handleOpenProject = (projectId: string) => {
    setCurrentView('research');
    setActiveItemId(projectId);
  };

  const handleOpenCourse = (courseId: string) => {
    setCurrentView('teaching');
    setActiveItemId(courseId);
  };

  const handleOpenPersonnel = (personnelId: string) => {
    setCurrentView('personnel');
    setActiveItemId(personnelId);
  };

  const handleOpenServiceRole = (serviceRoleId: string) => {
    setCurrentView('service');
    setActiveItemId(serviceRoleId);
  };

  const searchResults = useMemo(
    () =>
      buildSearchResults(
        appData,
        searchQuery,
        'all',
        {
          onTaskClick: handleTaskClick,
          onOpenProject: handleOpenProject,
          onOpenCourse: handleOpenCourse,
          onOpenPersonnel: handleOpenPersonnel,
          onOpenServiceRole: handleOpenServiceRole,
        },
      ),
    [appData, searchQuery],
  );

  const handleSubmitSearch = () => {
    setCurrentView('search');
  };

  const handleNavigate = (view: string) => {
    setActiveItemId(null);
    setCurrentView(view);
  };

  const handleChooseStorageFile = async () => {
    try {
      setIsStorageBusy(true);
      const selection = await chooseStorageFile(appData, buildAISettingsSnapshot(aiApiKey, aiModel));
      setStorageFileHandle(selection.handle);
      setStorageFileName(selection.fileName);
      setLastSavedAt(selection.savedAt);
      setStorageModeState('file');
      setStorageError(null);
      setRequiresInitialStorageSetup(false);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not connect to the selected save file.');
    } finally {
      setIsStorageBusy(false);
    }
  };

  const handleUseBrowserStorage = () => {
    saveStorageMode('browser');
    saveStorageFileName(null);
    saveStorageFilePath(null);
    setStorageModeState('browser');
    setStorageFileHandle(null);
    setStorageFileName(null);
    setStorageError(null);
    setRequiresInitialStorageSetup(false);
  };

  const handleReloadFromFile = async () => {
    try {
      setIsStorageBusy(true);
      const resumed = await resumeStoredFile(true);
      const sanitizedData = resumed.data;
      setStorageFileHandle(resumed.handle);
      setStorageFileName(resumed.fileName);
      setAppData({
        ...sanitizedData,
        tasks: sanitizedData.tasks.map(normalizeTask),
        researchStages: normalizeResearchStages(sanitizedData.researchStages, sanitizedData.projects),
      });
      if (resumed.aiSettings) {
        setAiApiKey(resumed.aiSettings.openAIApiKey);
        setAiModel(resumed.aiSettings.openAIModel);
      }
      setLastSavedAt(resumed.savedAt ?? lastSavedAt);
      setStorageModeState('file');
      setStorageError(null);
      setRequiresInitialStorageSetup(false);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not reload data from the selected file.');
    } finally {
      setIsStorageBusy(false);
    }
  };

  const handleCreateInitialSaveFile = async () => {
    try {
      setIsStorageBusy(true);
      const resumed = await resumeStoredFile(false, {
        data: appData,
        aiSettings: buildAISettingsSnapshot(aiApiKey, aiModel),
      });
      const sanitizedData = resumed.data;
      setStorageFileHandle(resumed.handle);
      setStorageFileName(resumed.fileName);
      setAppData({
        ...sanitizedData,
        tasks: sanitizedData.tasks.map(normalizeTask),
        researchStages: normalizeResearchStages(sanitizedData.researchStages, sanitizedData.projects),
      });
      if (resumed.aiSettings) {
        setAiApiKey(resumed.aiSettings.openAIApiKey);
        setAiModel(resumed.aiSettings.openAIModel);
      }
      setLastSavedAt(resumed.savedAt ?? lastSavedAt);
      setStorageModeState('file');
      setStorageError(null);
      setRequiresInitialStorageSetup(false);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not create the local save file.');
    } finally {
      setIsStorageBusy(false);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            tasks={tasks}
            projects={projects}
            researchStages={researchStages}
            personnel={personnel}
            courses={courses}
            serviceRoles={serviceRoles}
            onTaskClick={handleTaskClick}
          />
        );
      case 'inbox':
        return (
          <InboxView
            tasks={tasks}
            projects={projects}
            personnel={personnel}
            courses={courses}
            serviceRoles={serviceRoles}
            onTaskClick={handleTaskClick}
          />
        );
      case 'search':
        return (
          <SearchView
            tasks={tasks}
            projects={projects}
            personnel={personnel}
            courses={courses}
            serviceRoles={serviceRoles}
            onTaskClick={handleTaskClick}
            onOpenProject={handleOpenProject}
            onOpenCourse={handleOpenCourse}
            onOpenPersonnel={handleOpenPersonnel}
            onOpenServiceRole={handleOpenServiceRole}
            query={searchQuery}
            onQueryChange={setSearchQuery}
          />
        );
      case 'research':
        return (
          <ResearchBoard
            projects={projects}
            researchStages={researchStages}
            tasks={tasks}
            dataFilePath={dataFilePath}
            onUpdateProjects={updateProjects}
            onUpdateResearchStages={updateResearchStages}
            onUpdateTasks={updateTasks}
            onDeleteProject={handleDeleteProject}
            initialSelectedId={activeItemId}
          />
        );
      case 'personnel':
        return (
          <PersonnelView
            personnelList={personnel}
            tasks={tasks}
            dataFilePath={dataFilePath}
            onUpdateTasks={updateTasks}
            onAddPersonnel={handleAddPersonnel}
            onUpdatePersonnel={updatePersonnel}
            onDeletePersonnel={handleDeletePersonnel}
            initialSelectedId={activeItemId}
          />
        );
      case 'teaching':
        return (
          <TeachingView
            courses={courses}
            tasks={tasks}
            dataFilePath={dataFilePath}
            onUpdateCourses={updateCourses}
            onUpdateTasks={updateTasks}
            onDeleteCourse={handleDeleteCourse}
            initialSelectedId={activeItemId}
          />
        );
      case 'service':
        return (
          <ServiceView
            serviceRoles={serviceRoles}
            tasks={tasks}
            dataFilePath={dataFilePath}
            onUpdateServiceRoles={updateServiceRoles}
            onUpdateTasks={updateTasks}
            onDeleteServiceRole={handleDeleteServiceRole}
            initialSelectedId={activeItemId}
          />
        );
      case 'assistant':
        return (
          <AIAssistant
            appData={appData}
            currentView={currentView}
            activeItemId={activeItemId}
            aiApiKey={aiApiKey}
            aiModel={aiModel}
          />
        );
      default:
        return (
          <Dashboard
            tasks={tasks}
            projects={projects}
            researchStages={researchStages}
            personnel={personnel}
            courses={courses}
            serviceRoles={serviceRoles}
            onTaskClick={handleTaskClick}
          />
        );
    }
  };

  return (
    <Layout
      currentView={currentView}
      onNavigate={handleNavigate}
      isDarkMode={isDarkMode}
      onToggleDarkMode={() => setIsDarkMode(current => !current)}
      storageMode={storageMode}
      storageFileName={storageFileName}
      lastSavedAt={lastSavedAt}
      storageError={storageError}
      isStorageBusy={isStorageBusy}
      supportsLocalFileStorage={supportsFileSystemAccess()}
      onChooseStorageFile={handleChooseStorageFile}
      onUseBrowserStorage={handleUseBrowserStorage}
      onReloadFromFile={storageMode === 'file' ? handleReloadFromFile : undefined}
      globalSearchQuery={searchQuery}
      onGlobalSearchQueryChange={setSearchQuery}
      onSubmitSearch={handleSubmitSearch}
      globalSearchResults={searchResults}
      aiApiKey={aiApiKey}
      aiModel={aiModel}
      onAiApiKeyChange={setAiApiKey}
      onAiModelChange={setAiModel}
    >
      {renderContent()}
      {requiresInitialStorageSetup && usesDesktopRuntime && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-6 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Local-Only Setup</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Create your local save file</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                FacultyOne keeps your data on this computer only. Nothing is uploaded to a cloud service for storage or sync.
              </p>
            </div>

            <div className="space-y-5 overflow-y-auto px-6 py-5">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
                Your tasks, projects, courses, personnel records, service commitments, and saved AI settings will live in a local JSON file.
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                Deleting that save file permanently deletes the app&apos;s stored memory. There is no cloud backup.
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/70">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Default save location</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">
                  {defaultDesktopSavePath ?? '~/Documents/FacultyOne/faculty-one-data.json'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 dark:border-slate-800 sm:flex-row sm:justify-end">
              <button
                onClick={() => void handleChooseStorageFile()}
                disabled={isStorageBusy}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Choose Different Location
              </button>
              <button
                onClick={() => void handleCreateInitialSaveFile()}
                disabled={isStorageBusy}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isStorageBusy ? 'Creating Save File...' : 'Create Save File'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
