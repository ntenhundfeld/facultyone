import React from 'react';
import {
  BookOpen,
  Bot,
  Briefcase,
  Eye,
  EyeOff,
  FlaskConical,
  HardDrive,
  Inbox,
  LayoutDashboard,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Settings,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { isDesktopRuntime, StorageMode } from '../services/persistence';
import { SearchResult } from '../utils/search';
import logo from '../logo.svg';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  storageMode: StorageMode;
  storageFileName: string | null;
  lastSavedAt: string | null;
  storageError: string | null;
  isStorageBusy: boolean;
  supportsLocalFileStorage: boolean;
  onChooseStorageFile: () => Promise<void> | void;
  onUseBrowserStorage: () => void;
  onReloadFromFile?: () => Promise<void> | void;
  globalSearchQuery: string;
  onGlobalSearchQueryChange: (query: string) => void;
  onSubmitSearch: () => void;
  globalSearchResults: SearchResult[];
  aiApiKey: string;
  aiModel: string;
  onAiApiKeyChange: (apiKey: string) => void;
  onAiModelChange: (model: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentView,
  onNavigate,
  isDarkMode,
  onToggleDarkMode,
  storageMode,
  storageFileName,
  lastSavedAt,
  storageError,
  isStorageBusy,
  supportsLocalFileStorage,
  onChooseStorageFile,
  onUseBrowserStorage,
  onReloadFromFile,
  globalSearchQuery,
  onGlobalSearchQueryChange,
  onSubmitSearch,
  globalSearchResults,
  aiApiKey,
  aiModel,
  onAiApiKeyChange,
  onAiModelChange,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [showApiKey, setShowApiKey] = React.useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const usesDesktopRuntime = isDesktopRuntime();

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  React.useEffect(() => {
    document.title = 'FacultyOne';

    const existingFavicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;

    if (existingFavicon) {
      existingFavicon.href = logo;
      return;
    }

    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/svg+xml';
    favicon.href = logo;
    document.head.appendChild(favicon);

    return () => {
      if (document.head.contains(favicon)) {
        document.head.removeChild(favicon);
      }
    };
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'inbox', label: 'Inbox / Week', icon: Inbox },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'personnel', label: 'Personnel', icon: Users },
    { id: 'research', label: 'Research', icon: FlaskConical },
    { id: 'teaching', label: 'Teaching', icon: BookOpen },
    { id: 'service', label: 'Service', icon: Briefcase },
    { id: 'assistant', label: 'AI Assistant', icon: Bot },
  ];

  const formattedSavedAt = lastSavedAt
    ? new Date(lastSavedAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Not saved yet';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 transition-colors duration-200 dark:bg-slate-950">
      <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-300 md:flex">
        <div className="flex items-center space-x-3 border-b border-slate-800 p-6">
          <img src={logo} alt="FacultyOne logo" className="h-20 w-auto max-w-[210px] object-contain" />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center space-x-3 rounded-lg px-4 py-3 transition-colors ${
                currentView === item.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex w-full items-center space-x-3 px-4 py-2 text-slate-400 transition-colors hover:text-white"
          >
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <header className="z-20 flex items-center justify-between bg-slate-900 p-4 text-white shadow-md md:hidden">
          <img src={logo} alt="FacultyOne logo" className="h-16 w-auto max-w-[210px] object-contain" />
          <button onClick={() => setIsMobileMenuOpen(open => !open)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        {isMobileMenuOpen && (
          <div className="absolute left-0 right-0 top-16 z-10 border-b border-slate-700 bg-slate-800 shadow-xl md:hidden">
            <nav className="flex flex-col space-y-2 p-4">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-3 rounded-lg px-4 py-3 transition-colors ${
                    currentView === item.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  setIsSettingsOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center space-x-3 rounded-lg px-4 py-3 text-slate-300 hover:bg-slate-700"
              >
                <Settings size={20} />
                <span>Settings</span>
              </button>
            </nav>
          </div>
        )}

        <div className="relative z-40 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80 md:px-8">
          <div className="flex items-center justify-end" ref={searchContainerRef}>
            <div className="relative w-full max-w-md">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={globalSearchQuery}
                onChange={event => {
                  onGlobalSearchQueryChange(event.target.value);
                  setIsSearchOpen(Boolean(event.target.value.trim()));
                }}
                onFocus={() => setIsSearchOpen(Boolean(globalSearchQuery.trim()))}
                onKeyDown={event => {
                  if (event.key === 'Enter' && globalSearchQuery.trim()) {
                    onSubmitSearch();
                    setIsSearchOpen(false);
                  }
                  if (event.key === 'Escape') {
                    setIsSearchOpen(false);
                  }
                }}
                placeholder="Search anything..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />

              {isSearchOpen && globalSearchQuery.trim() && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {globalSearchResults.length === 0 && (
                    <div className="px-4 py-4 text-sm text-slate-400 dark:text-slate-500">No matches yet. Press Enter to open the full search page.</div>
                  )}

                  {globalSearchResults.slice(0, 6).map(result => (
                    <button
                      key={result.id}
                      onClick={() => {
                        result.onClick?.();
                        setIsSearchOpen(false);
                      }}
                      className="block w-full border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                          {result.scope}
                        </span>
                        <span className="truncate font-medium text-slate-800 dark:text-slate-100">{result.title}</span>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{result.subtitle}</p>
                    </button>
                  ))}

                  <button
                    onClick={() => {
                      onSubmitSearch();
                      setIsSearchOpen(false);
                    }}
                    className="block w-full bg-slate-50 px-4 py-3 text-left text-sm font-medium text-blue-600 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
                  >
                    View all results for &quot;{globalSearchQuery.trim()}&quot;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="scrollbar-hide flex-1 overflow-auto bg-slate-50 transition-colors duration-200 dark:bg-slate-950">
          <div className="mx-auto min-h-full max-w-7xl">{children}</div>
        </main>
      </div>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto p-4">
              <section className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-white p-2 text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                      {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">Dark Mode</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Stored locally for this browser</p>
                    </div>
                  </div>
                  <button
                    onClick={onToggleDarkMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isDarkMode ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </section>

              <section className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-slate-100 p-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      <HardDrive size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">Data Storage</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {usesDesktopRuntime
                          ? 'Desktop builds default to Documents/FacultyOne/faculty-one-data.json, and you can still choose a different JSON file if you want.'
                          : 'Choose whether app data stays in the browser or syncs to a local JSON file.'}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${storageMode === 'file' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                    {storageMode === 'file' ? 'Local File' : 'Browser'}
                  </span>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-700 dark:text-slate-200">
                        {storageMode === 'file' ? storageFileName ?? 'Connected local file' : 'Browser storage only'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Last save: {formattedSavedAt}</p>
                    </div>
                    {isStorageBusy && <RefreshCw size={16} className="mt-0.5 animate-spin text-slate-400 dark:text-slate-500" />}
                  </div>
                </div>

                {storageError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
                    {storageError}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void onChooseStorageFile()}
                    disabled={!supportsLocalFileStorage || isStorageBusy}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
                  >
                    {storageMode === 'file' ? 'Change Save File' : 'Choose Save File'}
                  </button>

                  <button
                    onClick={onUseBrowserStorage}
                    disabled={isStorageBusy}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Use Browser Storage
                  </button>

                  {onReloadFromFile && (
                    <button
                      onClick={() => void onReloadFromFile()}
                      disabled={isStorageBusy}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Reload From File
                    </button>
                  )}
                </div>

                {!supportsLocalFileStorage && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    This browser does not expose the File System Access API, so browser storage is the available local option.
                  </p>
                )}
              </section>

              <section className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-slate-100 p-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    <Bot size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">AI Assistant</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Choose the ChatGPT model and store your OpenAI API key locally in this browser.</p>
                  </div>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">ChatGPT Model</span>
                  <input
                    type="text"
                    value={aiModel}
                    onChange={event => onAiModelChange(event.target.value)}
                    placeholder="gpt-5-mini"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Enter any model name you want to use, such as <span className="font-mono">gpt-5-mini</span> or <span className="font-mono">gpt-4.1</span>.
                  </p>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">OpenAI API Key</span>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={aiApiKey}
                      onChange={event => onAiApiKeyChange(event.target.value)}
                      placeholder="sk-..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-11 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(visible => !visible)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <p className="text-xs text-slate-400 dark:text-slate-500">
                  This app stores the API key only in this browser for local use. That is convenient for personal workflows, but it is not a production-secure way to handle OpenAI credentials.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
