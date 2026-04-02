import React from 'react';
import { Briefcase, CheckSquare, FlaskConical, GraduationCap, Search, Users } from 'lucide-react';
import { AppData } from '../types';
import { buildSearchResults, scopeOptions, SearchCallbacks, SearchResult, SearchScope } from '../utils/search';

interface SearchViewProps extends AppData, SearchCallbacks {
  query: string;
  onQueryChange: (query: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  tasks,
  projects,
  courses,
  personnel,
  serviceRoles,
  onTaskClick,
  onOpenProject,
  onOpenCourse,
  onOpenPersonnel,
  onOpenServiceRole,
  query,
  onQueryChange,
}) => {
  const [scope, setScope] = React.useState<SearchScope>('all');

  const results = React.useMemo(
    () =>
      buildSearchResults(
        { tasks, projects, courses, personnel, serviceRoles },
        query,
        scope,
        { onTaskClick, onOpenProject, onOpenCourse, onOpenPersonnel, onOpenServiceRole },
      ),
    [tasks, projects, courses, personnel, serviceRoles, query, scope, onTaskClick, onOpenProject, onOpenCourse, onOpenPersonnel, onOpenServiceRole],
  );

  const iconForScope = (resultScope: SearchResult['scope']) => {
    switch (resultScope) {
      case 'tasks':
        return <CheckSquare size={16} className="text-blue-500 dark:text-blue-400" />;
      case 'research':
        return <FlaskConical size={16} className="text-indigo-500 dark:text-indigo-400" />;
      case 'teaching':
        return <GraduationCap size={16} className="text-emerald-500 dark:text-emerald-400" />;
      case 'personnel':
        return <Users size={16} className="text-purple-500 dark:text-purple-400" />;
      case 'service':
        return <Briefcase size={16} className="text-amber-500 dark:text-amber-400" />;
    }
  };

  const normalizedQuery = query.trim();

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Search</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Find tasks, projects, courses, people, and service commitments from one place.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row">
          <label className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={event => onQueryChange(event.target.value)}
              placeholder="Search by task title, faculty name, course code, project stage..."
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>

          <select
            value={scope}
            onChange={event => setScope(event.target.value as SearchScope)}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            {scopeOptions.map(option => (
              <option key={option} value={option}>
                {option === 'all' ? 'All areas' : option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <h2 className="font-semibold text-slate-800 dark:text-white">
            {normalizedQuery ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Start typing to search'}
          </h2>
        </div>

        <div className="space-y-3 p-4">
          {!normalizedQuery && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
              Search understands task titles, emails, course codes, project notes, and more.
            </div>
          )}

          {normalizedQuery && results.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
              No matches found for that query.
            </div>
          )}

          {results.map(result => {
            const Wrapper = result.onClick ? 'button' : 'div';

            return (
              <Wrapper
                key={result.id}
                {...(result.onClick ? { onClick: result.onClick } : {})}
                className={`w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-slate-900/50 ${result.onClick ? 'transition-all hover:border-blue-300 hover:bg-white hover:shadow-sm dark:hover:border-blue-500 dark:hover:bg-slate-900' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-white p-2 dark:bg-slate-800">{iconForScope(result.scope)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{result.title}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-700 dark:text-slate-300">{result.scope}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{result.subtitle}</p>
                    {result.extra && <p className="mt-2 line-clamp-2 text-sm text-slate-400 dark:text-slate-500">{result.extra}</p>}
                  </div>
                </div>
              </Wrapper>
            );
          })}
        </div>
      </section>
    </div>
  );
};
