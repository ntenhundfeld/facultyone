import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, ArrowDown, ArrowUp, Briefcase, CheckSquare, Clock, Eye, EyeOff, FlaskConical, GraduationCap, Settings, ShieldAlert, Users, X } from 'lucide-react';
import { Category, Course, Personnel, Priority, ResearchProject, ServiceRole, Status, Task } from '../types';
import { formatDateLabel, isOverdueDate, isWithinDays } from '../utils/date';
import { getTerminalResearchStage } from '../utils/researchStages';

interface DashboardProps {
  tasks: Task[];
  projects: ResearchProject[];
  researchStages: string[];
  personnel: Personnel[];
  courses: Course[];
  serviceRoles: ServiceRole[];
  onTaskClick?: (task: Task) => void;
}

type SectionType = 'stats' | 'charts' | 'actionItems';

interface DashboardConfig {
  layout: SectionType[];
  visibility: {
    stats: boolean;
    charts: boolean;
    actionItems: boolean;
  };
  chartVisibility: {
    taskDistribution: boolean;
    researchPipeline: boolean;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const DEFAULT_CONFIG: DashboardConfig = {
  layout: ['stats', 'charts', 'actionItems'],
  visibility: {
    stats: true,
    charts: true,
    actionItems: true,
  },
  chartVisibility: {
    taskDistribution: true,
    researchPipeline: true,
  },
};

const priorityWeight: Record<Priority, number> = {
  [Priority.CRITICAL]: 0,
  [Priority.HIGH]: 1,
  [Priority.MEDIUM]: 2,
  [Priority.LOW]: 3,
};

export const Dashboard: React.FC<DashboardProps> = ({ tasks, projects, researchStages, personnel, courses, serviceRoles, onTaskClick }) => {
  const [config, setConfig] = useState<DashboardConfig>(() => {
    const saved = localStorage.getItem('dashboard_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('dashboard_config', JSON.stringify(config));
  }, [config]);

  const activeTasks = tasks.filter(task => task.status !== Status.DONE);
  const overdueTasks = activeTasks.filter(task => isOverdueDate(task.dueDate));
  const upcomingTasks = activeTasks.filter(task => !isOverdueDate(task.dueDate) && isWithinDays(task.dueDate, 7));
  const blockedTasks = activeTasks.filter(task => task.status === Status.BLOCKED);
  const terminalResearchStage = getTerminalResearchStage(researchStages);
  const activeProjects = projects.filter(project => project.stage !== terminalResearchStage);
  const serviceTermsEndingSoon = serviceRoles.filter(role => isWithinDays(role.termEnd, 90));
  const recentActivity = [...tasks]
    .filter(task => task.updatedAt || task.createdAt || task.completedAt)
    .sort((left, right) => {
      const leftDate = left.updatedAt ?? left.completedAt ?? left.createdAt ?? '';
      const rightDate = right.updatedAt ?? right.completedAt ?? right.createdAt ?? '';
      return rightDate.localeCompare(leftDate);
    })
    .slice(0, 8);

  const taskStatusData = [
    { name: 'To Do', value: tasks.filter(task => task.status === Status.TODO).length },
    { name: 'In Progress', value: tasks.filter(task => task.status === Status.IN_PROGRESS).length },
    { name: 'Review', value: tasks.filter(task => task.status === Status.REVIEW).length },
    { name: 'Blocked', value: tasks.filter(task => task.status === Status.BLOCKED).length },
    { name: 'Done', value: tasks.filter(task => task.status === Status.DONE).length },
  ];

  const projectStagesData = researchStages.map(stage => ({
    name: stage,
    value: projects.filter(project => project.stage === stage).length,
  }));

  const categories = [Category.RESEARCH, Category.TEACHING, Category.PERSONNEL, Category.SERVICE];

  const getCategoryConfig = (category: Category) => {
    switch (category) {
      case Category.RESEARCH:
        return {
          icon: <FlaskConical size={18} />,
          text: 'text-blue-600 dark:text-blue-400',
          background: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-100 dark:border-blue-800',
        };
      case Category.TEACHING:
        return {
          icon: <GraduationCap size={18} />,
          text: 'text-emerald-600 dark:text-emerald-400',
          background: 'bg-emerald-50 dark:bg-emerald-900/20',
          border: 'border-emerald-100 dark:border-emerald-800',
        };
      case Category.PERSONNEL:
        return {
          icon: <Users size={18} />,
          text: 'text-purple-600 dark:text-purple-400',
          background: 'bg-purple-50 dark:bg-purple-900/20',
          border: 'border-purple-100 dark:border-purple-800',
        };
      case Category.SERVICE:
        return {
          icon: <Briefcase size={18} />,
          text: 'text-amber-600 dark:text-amber-400',
          background: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-100 dark:border-amber-800',
        };
      default:
        return {
          icon: <CheckSquare size={18} />,
          text: 'text-slate-600 dark:text-slate-400',
          background: 'bg-slate-50 dark:bg-slate-800',
          border: 'border-slate-100 dark:border-slate-700',
        };
    }
  };

  const getPriorityClasses = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL:
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case Priority.HIGH:
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case Priority.MEDIUM:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getEntityLabel = (task: Task) => {
    if (task.projectId) {
      return projects.find(item => item.id === task.projectId)?.title ?? task.projectId;
    }

    if (task.courseId) {
      const course = courses.find(item => item.id === task.courseId);
      return course ? `${course.code}` : task.courseId;
    }

    if (task.relatedPersonnelId || task.assigneeId) {
      return personnel.find(item => item.id === task.relatedPersonnelId || item.id === task.assigneeId)?.name ?? 'Personnel';
    }

    if (task.serviceRoleId) {
      return serviceRoles.find(item => item.id === task.serviceRoleId)?.name ?? 'Service';
    }

    return task.category;
  };

  const sortTasksForAttention = (items: Task[]) =>
    [...items].sort((left, right) => {
      const leftDue = left.dueDate ?? '9999-12-31';
      const rightDue = right.dueDate ?? '9999-12-31';

      if (leftDue !== rightDue) {
        return leftDue.localeCompare(rightDue);
      }

      return priorityWeight[left.priority] - priorityWeight[right.priority];
    });

  const renderStats = () => (
    <div key="stats" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {[
        {
          label: 'Overdue Tasks',
          value: overdueTasks.length,
          detail: 'Past due and still open',
          icon: <AlertCircle size={20} />,
          classes: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        },
        {
          label: 'Due This Week',
          value: upcomingTasks.length,
          detail: 'Next 7 days',
          icon: <Clock size={20} />,
          classes: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        },
        {
          label: 'Blocked Work',
          value: blockedTasks.length,
          detail: 'Waiting on dependencies',
          icon: <ShieldAlert size={20} />,
          classes: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        },
        {
          label: 'Active Research',
          value: activeProjects.length,
          detail: 'Projects in motion',
          icon: <FlaskConical size={20} />,
          classes: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        },
        {
          label: 'Terms Ending Soon',
          value: serviceTermsEndingSoon.length,
          detail: 'Service roles within 90 days',
          icon: <Briefcase size={20} />,
          classes: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        },
      ].map(card => (
        <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
              <h3 className="mt-1 text-2xl font-bold text-slate-800 dark:text-white">{card.value}</h3>
            </div>
            <div className={`rounded-lg p-2 ${card.classes}`}>{card.icon}</div>
          </div>
          <div className="mt-4 text-xs text-slate-400 dark:text-slate-500">{card.detail}</div>
        </div>
      ))}
    </div>
  );

  const renderCharts = () => (
    <div key="charts" className="grid grid-cols-1 gap-8 lg:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      {config.chartVisibility.taskDistribution && (
        <div className="flex h-[28rem] flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-white">Task Distribution</h3>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} itemStyle={{ color: '#f8fafc' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            {taskStatusData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                {item.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {config.chartVisibility.researchPipeline && (
        <div className="flex h-[28rem] flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-white">Research Pipeline</h3>
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectStagesData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" allowDecimals={false} tickFormatter={value => `${Math.round(Number(value))}`} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: '#94a3b8' }} stroke="#94a3b8" />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} itemStyle={{ color: '#f8fafc' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );

  const renderActionItems = () => (
    <div key="actionItems" className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">What Needs Attention</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Each lane is sorted by urgency and due date.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {categories.map(category => {
          const categoryTasks = sortTasksForAttention(activeTasks.filter(task => task.category === category)).slice(0, 8);
          const categoryStyle = getCategoryConfig(category);

          return (
            <div key={category} className="flex h-full max-h-[560px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className={`flex items-center justify-between rounded-t-xl border-b p-4 ${categoryStyle.background} ${categoryStyle.border}`}>
                <div className={`flex items-center gap-2 font-bold ${categoryStyle.text}`}>
                  {categoryStyle.icon}
                  {category}
                </div>
                <span className={`rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold dark:bg-black/20 ${categoryStyle.text}`}>
                  {categoryTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {categoryTasks.length === 0 && <p className="py-4 text-center text-sm italic text-slate-400 dark:text-slate-500">No active tasks.</p>}

                {categoryTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick?.(task)}
                    className="w-full cursor-pointer rounded-lg border border-slate-100 bg-slate-50 p-3 text-left shadow-sm transition-all hover:border-slate-300 hover:bg-white hover:shadow-md dark:border-slate-600 dark:bg-slate-700 dark:hover:border-slate-500"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${getPriorityClasses(task.priority)}`}>{task.priority}</span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                        <Clock size={10} />
                        {task.dueDate ? formatDateLabel(task.dueDate) : 'No due date'}
                      </span>
                    </div>

                    <div className="mb-1">
                      <span className="inline-block max-w-full truncate rounded border border-slate-100 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {getEntityLabel(task)}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-sm font-semibold leading-tight text-slate-800 dark:text-slate-200">{task.title}</p>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {task.status}
                      </span>
                      {isOverdueDate(task.dueDate) && <span className="text-[11px] font-medium text-red-500 dark:text-red-400">Overdue</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-white">Recent Activity</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">Latest task updates across the workspace.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {recentActivity.length}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2">
          {recentActivity.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
              Activity will appear here as tasks are created or updated.
            </div>
          )}

          {recentActivity.map(task => {
            const activityTime = task.updatedAt ?? task.completedAt ?? task.createdAt;
            const label = task.completedAt && task.status === Status.DONE ? 'Completed' : task.createdAt === task.updatedAt ? 'Created' : 'Updated';

            return (
              <button
                key={`activity-${task.id}`}
                onClick={() => onTaskClick?.(task)}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:border-blue-300 hover:bg-white hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-blue-500 dark:hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        {label}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{task.category}</span>
                    </div>
                    <p className="mt-2 font-medium text-slate-800 dark:text-slate-100">{task.title}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{getEntityLabel(task)}</p>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {activityTime ? new Date(activityTime).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const nextLayout = [...config.layout];
    if (direction === 'up' && index > 0) {
      [nextLayout[index], nextLayout[index - 1]] = [nextLayout[index - 1], nextLayout[index]];
    } else if (direction === 'down' && index < nextLayout.length - 1) {
      [nextLayout[index], nextLayout[index + 1]] = [nextLayout[index + 1], nextLayout[index]];
    }
    setConfig({ ...config, layout: nextLayout });
  };

  const toggleVisibility = (section: SectionType) => {
    setConfig({
      ...config,
      visibility: { ...config.visibility, [section]: !config.visibility[section] },
    });
  };

  const toggleChart = (chart: keyof DashboardConfig['chartVisibility']) => {
    setConfig({
      ...config,
      chartVisibility: { ...config.chartVisibility, [chart]: !config.chartVisibility[chart] },
    });
  };

  return (
    <div className="relative space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Dashboard Overview</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">A quick read on this week&apos;s pressure points across research, teaching, personnel, and service.</p>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          title="Customize Dashboard"
        >
          <Settings size={20} />
        </button>
      </div>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Customize Dashboard</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto p-6">
              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Layout & Visibility</h4>
                <div className="space-y-2">
                  {config.layout.map((section, index) => (
                    <div key={section} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-700/50">
                      <span className="font-medium capitalize text-slate-700 dark:text-slate-200">{section === 'actionItems' ? 'Attention Lanes' : section}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleVisibility(section)}
                          className={`rounded p-1.5 transition-colors ${config.visibility[section] ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'text-slate-400'}`}
                        >
                          {config.visibility[section] ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => moveSection(index, 'up')} disabled={index === 0} className="text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-30 dark:hover:text-slate-300">
                            <ArrowUp size={12} />
                          </button>
                          <button
                            onClick={() => moveSection(index, 'down')}
                            disabled={index === config.layout.length - 1}
                            className="text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-30 dark:hover:text-slate-300"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Graphs</h4>
                <div className="space-y-2">
                  {[
                    { key: 'taskDistribution', label: 'Task Distribution' },
                    { key: 'researchPipeline', label: 'Research Pipeline' },
                  ].map(item => (
                    <label key={item.key} className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-700/50">
                      <span className="text-slate-700 dark:text-slate-200">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={config.chartVisibility[item.key as keyof DashboardConfig['chartVisibility']]}
                        onChange={() => toggleChart(item.key as keyof DashboardConfig['chartVisibility'])}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700/30">
              <button onClick={() => setIsSettingsOpen(false)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8">
        {config.layout.map(section => {
          if (!config.visibility[section]) {
            return null;
          }

          switch (section) {
            case 'stats':
              return renderStats();
            case 'charts':
              return renderCharts();
            case 'actionItems':
              return renderActionItems();
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
};
