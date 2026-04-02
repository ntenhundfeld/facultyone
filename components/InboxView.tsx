import React from 'react';
import { AlertTriangle, ArrowRight, Briefcase, CalendarClock, CheckCircle2, Clock3, FlaskConical, GraduationCap, Inbox, Users } from 'lucide-react';
import { Course, Personnel, Priority, ResearchProject, ServiceRole, Status, Task } from '../types';
import { formatDateLabel, isOverdueDate, isTodayDate, isWithinDays, relativeDateLabel } from '../utils/date';

interface InboxViewProps {
  tasks: Task[];
  projects: ResearchProject[];
  personnel: Personnel[];
  courses: Course[];
  serviceRoles: ServiceRole[];
  onTaskClick?: (task: Task) => void;
}

interface TaskBucket {
  id: string;
  title: string;
  subtitle: string;
  emptyMessage: string;
  tasks: Task[];
  accent: string;
  icon: React.ReactNode;
}

const getPriorityClasses = (priority: Priority) => {
  switch (priority) {
    case Priority.CRITICAL:
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case Priority.HIGH:
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case Priority.MEDIUM:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }
};

export const InboxView: React.FC<InboxViewProps> = ({ tasks, projects, personnel, courses, serviceRoles, onTaskClick }) => {
  const activeTasks = tasks.filter(task => task.status !== Status.DONE);

  const overdueTasks = activeTasks
    .filter(task => task.status !== Status.BLOCKED && isOverdueDate(task.dueDate))
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));

  const todayTasks = activeTasks
    .filter(task => task.status !== Status.BLOCKED && isTodayDate(task.dueDate))
    .sort((a, b) => a.priority.localeCompare(b.priority));

  const thisWeekTasks = activeTasks
    .filter(task => task.status !== Status.BLOCKED && !isTodayDate(task.dueDate) && !isOverdueDate(task.dueDate) && isWithinDays(task.dueDate, 7))
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));

  const blockedTasks = activeTasks
    .filter(task => task.status === Status.BLOCKED)
    .sort((a, b) => (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31'));

  const undatedTasks = activeTasks
    .filter(task => !task.dueDate && task.status !== Status.BLOCKED)
    .sort((a, b) => a.title.localeCompare(b.title));

  const expiringServiceRoles = serviceRoles
    .filter(role => isWithinDays(role.termEnd, 90))
    .sort((a, b) => (a.termEnd ?? '').localeCompare(b.termEnd ?? ''));

  const buckets: TaskBucket[] = [
    {
      id: 'overdue',
      title: 'Overdue',
      subtitle: 'Needs attention now',
      emptyMessage: 'Nothing overdue right now.',
      tasks: overdueTasks,
      accent: 'border-red-200 dark:border-red-900/50',
      icon: <AlertTriangle size={18} className="text-red-500 dark:text-red-400" />,
    },
    {
      id: 'today',
      title: 'Due Today',
      subtitle: 'Best placed front and center',
      emptyMessage: 'Nothing due today.',
      tasks: todayTasks,
      accent: 'border-amber-200 dark:border-amber-900/50',
      icon: <Clock3 size={18} className="text-amber-500 dark:text-amber-400" />,
    },
    {
      id: 'week',
      title: 'Next 7 Days',
      subtitle: 'Upcoming work this week',
      emptyMessage: 'Nothing due in the next week.',
      tasks: thisWeekTasks,
      accent: 'border-blue-200 dark:border-blue-900/50',
      icon: <CalendarClock size={18} className="text-blue-500 dark:text-blue-400" />,
    },
    {
      id: 'blocked',
      title: 'Blocked',
      subtitle: 'Items waiting on someone or something',
      emptyMessage: 'No blocked tasks.',
      tasks: blockedTasks,
      accent: 'border-purple-200 dark:border-purple-900/50',
      icon: <AlertTriangle size={18} className="text-purple-500 dark:text-purple-400" />,
    },
    {
      id: 'undated',
      title: 'No Due Date',
      subtitle: 'Useful for backlog review',
      emptyMessage: 'Everything has a due date.',
      tasks: undatedTasks,
      accent: 'border-slate-200 dark:border-slate-700',
      icon: <Inbox size={18} className="text-slate-500 dark:text-slate-400" />,
    },
  ];

  const getTaskContext = (task: Task) => {
    if (task.projectId) {
      const project = projects.find(item => item.id === task.projectId);
      return {
        label: project?.title ?? task.projectId,
        icon: <FlaskConical size={14} className="text-blue-500 dark:text-blue-400" />,
      };
    }

    if (task.courseId) {
      const course = courses.find(item => item.id === task.courseId);
      return {
        label: course ? `${course.code} · ${course.name}` : task.courseId,
        icon: <GraduationCap size={14} className="text-emerald-500 dark:text-emerald-400" />,
      };
    }

    if (task.relatedPersonnelId || task.assigneeId) {
      const person = personnel.find(item => item.id === task.relatedPersonnelId || item.id === task.assigneeId);
      return {
        label: person?.name ?? 'Personnel',
        icon: <Users size={14} className="text-purple-500 dark:text-purple-400" />,
      };
    }

    if (task.serviceRoleId) {
      const role = serviceRoles.find(item => item.id === task.serviceRoleId);
      return {
        label: role?.name ?? 'Service',
        icon: <Briefcase size={14} className="text-amber-500 dark:text-amber-400" />,
      };
    }

    return {
      label: task.category,
      icon: <CheckCircle2 size={14} className="text-slate-500 dark:text-slate-400" />,
    };
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Inbox / This Week</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            A cross-module view of what needs attention first.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Active tasks</div>
          <div className="mt-1 text-2xl font-bold text-slate-800 dark:text-white">{activeTasks.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {buckets.map(bucket => (
          <section key={bucket.id} className={`rounded-2xl border bg-white shadow-sm dark:bg-slate-800 ${bucket.accent}`}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">{bucket.icon}</div>
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-white">{bucket.title}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{bucket.subtitle}</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {bucket.tasks.length}
              </span>
            </div>

            <div className="space-y-3 p-4">
              {bucket.tasks.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  {bucket.emptyMessage}
                </div>
              )}

              {bucket.tasks.map(task => {
                const context = getTaskContext(task);

                return (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick?.(task)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:border-blue-300 hover:bg-white hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-blue-500 dark:hover:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          {context.icon}
                          <span className="truncate">{context.label}</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{task.title}</p>
                      </div>

                      <ArrowRight size={16} className="mt-1 flex-shrink-0 text-slate-300 dark:text-slate-600" />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${getPriorityClasses(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {task.status}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {relativeDateLabel(task.dueDate)}
                      </span>
                      {task.dueDate && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {formatDateLabel(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
              <Briefcase size={18} className="text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">Service Terms Ending Soon</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Commitments ending in the next 90 days</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {expiringServiceRoles.length}
          </span>
        </div>

        <div className="p-4">
          {expiringServiceRoles.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
              No service commitments are ending soon.
            </div>
          )}

          {expiringServiceRoles.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {expiringServiceRoles.map(role => (
                <div key={role.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{role.name}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {role.role} · {role.type}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {relativeDateLabel(role.termEnd)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{formatDateLabel(role.termEnd)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
