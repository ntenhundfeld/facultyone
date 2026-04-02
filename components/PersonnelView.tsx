import React, { useMemo, useState } from 'react';
import { Personnel, Task, Status, Category, Priority } from '../types';
import { createTask, toggleTaskDone, withTaskPriority, withTaskStatus } from '../utils/tasks';
import { useDeleteConfirmation } from '../hooks/useDeleteConfirmation';
import {
  Pencil,
  FileText,
  CheckSquare,
  ChevronRight,
  Users,
  Plus,
  UserCheck,
  UserCog,
  Clock,
  X,
  Filter,
  ArrowUpDown,
  Trash2,
  Mail,
  Phone,
} from 'lucide-react';

interface PersonnelViewProps {
  personnelList: Personnel[];
  tasks: Task[];
  onUpdateTasks: (tasks: Task[]) => void;
  onAddPersonnel: (personnel: Personnel) => void;
  onUpdatePersonnel: (personnel: Personnel[]) => void;
  onDeletePersonnel: (id: string) => void;
  initialSelectedId?: string | null;
}

type SortOption = 'lastName' | 'firstName';
type SortDirection = 'asc' | 'desc';

const HONORIFICS: Array<NonNullable<Personnel['honorific']>> = ['Dr.', 'Prof.', 'Mr.', 'Miss', 'Mrs.', 'Ms.'];

const getDisplayName = (person: Personnel) => `${person.honorific ? `${person.honorific} ` : ''}${person.name}`.trim();

export const PersonnelView: React.FC<PersonnelViewProps> = ({
  personnelList,
  tasks,
  onUpdateTasks,
  onAddPersonnel,
  onUpdatePersonnel,
  onDeletePersonnel,
  initialSelectedId,
}) => {
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Personnel | null>(null);
  const { requestDelete, deleteConfirmationModal } = useDeleteConfirmation();

  React.useEffect(() => {
    if (initialSelectedId) {
      const found = personnelList.find(person => person.id === initialSelectedId);
      if (found) {
        setSelectedPersonnel(found);
        setProfileDraft(found);
        setIsEditingProfile(false);
      }
    }
  }, [initialSelectedId, personnelList]);

  React.useEffect(() => {
    if (!selectedPersonnel) {
      return;
    }

    const refreshed = personnelList.find(person => person.id === selectedPersonnel.id);
    if (refreshed && refreshed !== selectedPersonnel) {
      setSelectedPersonnel(refreshed);
      if (!isEditingProfile) {
        setProfileDraft(refreshed);
      }
    }
  }, [personnelList, selectedPersonnel, isEditingProfile]);

  const [sortBy, setSortBy] = useState<SortOption>('lastName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedRoleFilters, setSelectedRoleFilters] = useState<string[]>([]);
  const [selectedDeptFilters, setSelectedDeptFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false);
  const [isDeptFilterOpen, setIsDeptFilterOpen] = useState(false);

  React.useEffect(() => {
    if (showFilters) {
      return;
    }

    setIsRoleFilterOpen(false);
    setIsDeptFilterOpen(false);
  }, [showFilters]);

  const [myTaskTitle, setMyTaskTitle] = useState('');
  const [assignedTaskTitle, setAssignedTaskTitle] = useState('');
  const [myTaskPriority, setMyTaskPriority] = useState<Priority>(Priority.MEDIUM);
  const [assignedTaskPriority, setAssignedTaskPriority] = useState<Priority>(Priority.MEDIUM);
  const [myTaskDueDate, setMyTaskDueDate] = useState('');
  const [assignedTaskDueDate, setAssignedTaskDueDate] = useState('');

  const [isAddingPersonnel, setIsAddingPersonnel] = useState(false);
  const [newPersonnelHonorific, setNewPersonnelHonorific] = useState<Personnel['honorific']>('Dr.');
  const [newPersonnelName, setNewPersonnelName] = useState('');
  const [newPersonnelRole, setNewPersonnelRole] = useState('');
  const [newPersonnelEmail, setNewPersonnelEmail] = useState('');
  const [newPersonnelPhone, setNewPersonnelPhone] = useState('');
  const [newPersonnelDept, setNewPersonnelDept] = useState('');
  const [newPerformanceNote, setNewPerformanceNote] = useState('');

  const roleOptions = useMemo(
    () => Array.from(new Set(personnelList.map(person => person.role))).sort((left, right) => left.localeCompare(right)),
    [personnelList],
  );

  const departmentOptions = useMemo(
    () => Array.from(new Set(personnelList.map(person => person.department))).sort((left, right) => left.localeCompare(right)),
    [personnelList],
  );

  const processedPersonnel = useMemo(() => {
    const result = [...personnelList]
      .filter(person => (selectedRoleFilters.length > 0 ? selectedRoleFilters.includes(person.role) : true))
      .filter(person => (selectedDeptFilters.length > 0 ? selectedDeptFilters.includes(person.department) : true));

    result.sort((left, right) => {
      const leftName = sortBy === 'lastName' ? left.name.split(' ').pop() || '' : left.name;
      const rightName = sortBy === 'lastName' ? right.name.split(' ').pop() || '' : right.name;
      return sortDirection === 'asc' ? leftName.localeCompare(rightName) : rightName.localeCompare(leftName);
    });

    return result;
  }, [personnelList, selectedRoleFilters, selectedDeptFilters, sortBy, sortDirection]);

  const toggleRoleFilter = (role: string) => {
    setSelectedRoleFilters(current => (current.includes(role) ? current.filter(item => item !== role) : [...current, role]));
  };

  const toggleDeptFilter = (department: string) => {
    setSelectedDeptFilters(current => (current.includes(department) ? current.filter(item => item !== department) : [...current, department]));
  };

  const myTasks = selectedPersonnel ? tasks.filter(task => task.relatedPersonnelId === selectedPersonnel.id && !task.assigneeId) : [];
  const assignedTasks = selectedPersonnel ? tasks.filter(task => task.assigneeId === selectedPersonnel.id) : [];

  const updateSelectedPersonnel = (updater: (person: Personnel) => Personnel) => {
    if (!selectedPersonnel) {
      return;
    }

    const updated = updater(selectedPersonnel);
    onUpdatePersonnel(personnelList.map(person => (person.id === updated.id ? updated : person)));
    setSelectedPersonnel(updated);
  };

  const handleStartProfileEdit = () => {
    if (!selectedPersonnel) {
      return;
    }
    setProfileDraft(selectedPersonnel);
    setIsEditingProfile(true);
  };

  const handleCancelProfileEdit = () => {
    setProfileDraft(selectedPersonnel);
    setIsEditingProfile(false);
  };

  const handleSaveProfileEdit = () => {
    if (!profileDraft) {
      return;
    }
    updateSelectedPersonnel(() => profileDraft);
    setIsEditingProfile(false);
  };

  const handleCreateTask = (event: React.FormEvent, type: 'mine' | 'assigned') => {
    event.preventDefault();
    if (!selectedPersonnel) {
      return;
    }

    const title = type === 'mine' ? myTaskTitle : assignedTaskTitle;
    const priority = type === 'mine' ? myTaskPriority : assignedTaskPriority;
    const dueDate = type === 'mine' ? myTaskDueDate : assignedTaskDueDate;

    if (!title.trim()) {
      return;
    }

    const newTask = createTask({
      title,
      priority,
      category: Category.PERSONNEL,
      relatedPersonnelId: selectedPersonnel.id,
      assigneeId: type === 'assigned' ? selectedPersonnel.id : undefined,
      dueDate: dueDate || undefined,
    });

    onUpdateTasks([...tasks, newTask]);

    if (type === 'mine') {
      setMyTaskTitle('');
      setMyTaskPriority(Priority.MEDIUM);
      setMyTaskDueDate('');
    } else {
      setAssignedTaskTitle('');
      setAssignedTaskPriority(Priority.MEDIUM);
      setAssignedTaskDueDate('');
    }
  };

  const handleAddPersonnelSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPersonnelName.trim() || !newPersonnelEmail.trim()) {
      return;
    }

    const newPersonnel: Personnel = {
      id: `p-${Date.now()}`,
      honorific: newPersonnelHonorific,
      name: newPersonnelName.trim(),
      role: newPersonnelRole || 'Team Member',
      email: newPersonnelEmail.trim(),
      phone: newPersonnelPhone.trim() || undefined,
      department: newPersonnelDept || 'General',
      performanceNotes: [],
    };

    onAddPersonnel(newPersonnel);
    setNewPersonnelHonorific('Dr.');
    setNewPersonnelName('');
    setNewPersonnelRole('');
    setNewPersonnelEmail('');
    setNewPersonnelPhone('');
    setNewPersonnelDept('');
    setIsAddingPersonnel(false);
    setSelectedPersonnel(newPersonnel);
    setProfileDraft(newPersonnel);
    setIsEditingProfile(false);
  };

  const handleAddPerformanceNote = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPerformanceNote.trim()) {
      return;
    }

    updateSelectedPersonnel(person => ({
      ...person,
      performanceNotes: [...person.performanceNotes, newPerformanceNote.trim()],
    }));
    setNewPerformanceNote('');
  };

  const handleDeletePerformanceNote = (noteIndex: number) => {
    updateSelectedPersonnel(person => ({
      ...person,
      performanceNotes: person.performanceNotes.filter((_, index) => index !== noteIndex),
    }));
  };

  const getNotePreview = (note: string) => {
    const trimmed = note.trim();
    if (!trimmed) {
      return 'this note';
    }

    return trimmed.length > 48 ? `${trimmed.slice(0, 48)}...` : trimmed;
  };

  const toggleTaskStatus = (taskId: string) => {
    onUpdateTasks(tasks.map(task => (task.id === taskId ? toggleTaskDone(task) : task)));
  };

  const handleStatusChange = (taskId: string, newStatus: Status) => {
    onUpdateTasks(tasks.map(task => (task.id === taskId ? withTaskStatus(task, newStatus) : task)));
  };

  const cyclePriority = (taskId: string) => {
    const priorities = Object.values(Priority);
    onUpdateTasks(
      tasks.map(task => {
        if (task.id !== taskId) {
          return task;
        }
        const currentIndex = priorities.indexOf(task.priority);
        return withTaskPriority(task, priorities[(currentIndex + 1) % priorities.length]);
      }),
    );
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL:
        return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50';
      case Priority.HIGH:
        return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/50';
      case Priority.MEDIUM:
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50';
      default:
        return 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700';
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case Status.TODO:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600';
      case Status.IN_PROGRESS:
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case Status.REVIEW:
        return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case Status.BLOCKED:
        return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
      case Status.DONE:
        return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600';
    }
  };

  const renderTaskItem = (task: Task) => (
    <div key={task.id} className="group flex items-start gap-2 rounded border border-transparent p-2 transition-all hover:border-slate-100 hover:bg-slate-50 dark:hover:border-slate-600 dark:hover:bg-slate-700">
      <button
        onClick={() => toggleTaskStatus(task.id)}
        className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
          task.status === Status.DONE ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 bg-white hover:border-amber-500 dark:border-slate-500 dark:bg-slate-800'
        }`}
      >
        {task.status === Status.DONE && <CheckSquare size={10} />}
      </button>
      <div className="min-w-0 flex-1">
        <span className={`text-sm break-words ${task.status === Status.DONE ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
          {task.title}
        </span>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <select
            value={task.status}
            onChange={event => handleStatusChange(task.id, event.target.value as Status)}
            className={`cursor-pointer rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase focus:outline-none focus:ring-1 focus:ring-blue-500 ${getStatusColor(task.status)}`}
          >
            {Object.values(Status).map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button onClick={() => cyclePriority(task.id)} className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase transition-colors ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </button>
          {task.dueDate && (
            <span className="flex items-center gap-0.5 rounded border border-slate-100 bg-white px-1 py-0.5 text-[10px] text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500">
              <Clock size={10} /> {task.dueDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className={`flex w-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:w-1/3 ${selectedPersonnel ? 'hidden md:flex' : 'flex'}`}>
        <div className="border-b border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Personnel Directory</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage team members</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(show => !show)}
                className={`rounded-lg border p-2 transition-colors ${showFilters ? 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                title="Toggle Filters"
              >
                <Filter size={20} />
              </button>
              <button
                onClick={() => setIsAddingPersonnel(open => !open)}
                className={`rounded-lg p-2 transition-colors ${isAddingPersonnel ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                title="Add Personnel"
              >
                {isAddingPersonnel ? <X size={20} /> : <Plus size={20} />}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="animate-in slide-in-from-top-2 space-y-3 border-t border-slate-200 pt-2 dark:border-slate-800">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsRoleFilterOpen(open => !open);
                      setIsDeptFilterOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded border border-slate-300 bg-white px-3 py-2 text-left text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <span>{selectedRoleFilters.length > 0 ? `Roles (${selectedRoleFilters.length})` : 'Filter by Role'}</span>
                    <ChevronRight size={14} className={`transition-transform ${isRoleFilterOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {isRoleFilterOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Roles</span>
                        <button
                          onClick={() => setSelectedRoleFilters([])}
                          className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="max-h-48 space-y-2 overflow-y-auto">
                        {roleOptions.map(role => (
                          <label key={role} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                            <input
                              type="checkbox"
                              checked={selectedRoleFilters.includes(role)}
                              onChange={() => toggleRoleFilter(role)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                            />
                            <span>{role}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => {
                      setIsDeptFilterOpen(open => !open);
                      setIsRoleFilterOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded border border-slate-300 bg-white px-3 py-2 text-left text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <span>{selectedDeptFilters.length > 0 ? `Departments (${selectedDeptFilters.length})` : 'Filter by Department'}</span>
                    <ChevronRight size={14} className={`transition-transform ${isDeptFilterOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {isDeptFilterOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Departments</span>
                        <button
                          onClick={() => setSelectedDeptFilters([])}
                          className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="max-h-48 space-y-2 overflow-y-auto">
                        {departmentOptions.map(department => (
                          <label key={department} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                            <input
                              type="checkbox"
                              checked={selectedDeptFilters.includes(department)}
                              onChange={() => toggleDeptFilter(department)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                            />
                            <span>{department}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Sort by:</span>
                <select value={sortBy} onChange={event => setSortBy(event.target.value as SortOption)} className="flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="lastName">Last Name</option>
                  <option value="firstName">First Name</option>
                </select>
                <button onClick={() => setSortDirection(direction => (direction === 'asc' ? 'desc' : 'asc'))} className="rounded border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700" title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}>
                  <ArrowUpDown size={14} className={sortDirection === 'desc' ? 'rotate-180 transform' : ''} />
                </button>
              </div>
            </div>
          )}
        </div>

        {isAddingPersonnel && (
          <div className="animate-in slide-in-from-top-2 border-b border-blue-100 bg-blue-50 p-4 dark:border-blue-800/50 dark:bg-blue-900/20">
            <h3 className="mb-3 text-sm font-semibold text-blue-800 dark:text-blue-300">Add New Personnel</h3>
            <form onSubmit={handleAddPersonnelSubmit} className="space-y-3">
              <div>
                <select value={newPersonnelHonorific ?? 'Dr.'} onChange={event => setNewPersonnelHonorific(event.target.value as Personnel['honorific'])} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  {HONORIFICS.map(honorific => (
                    <option key={honorific} value={honorific}>
                      {honorific}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input value={newPersonnelName} onChange={event => setNewPersonnelName(event.target.value)} placeholder="Full Name" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <input value={newPersonnelRole} onChange={event => setNewPersonnelRole(event.target.value)} placeholder="Role (e.g. Associate Professor)" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <input value={newPersonnelEmail} onChange={event => setNewPersonnelEmail(event.target.value)} placeholder="Email Address" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <input value={newPersonnelPhone} onChange={event => setNewPersonnelPhone(event.target.value)} placeholder="Phone Number" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <input value={newPersonnelDept} onChange={event => setNewPersonnelDept(event.target.value)} placeholder="Department" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <button type="submit" disabled={!newPersonnelName || !newPersonnelEmail} className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                Create Profile
              </button>
            </form>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {processedPersonnel.length === 0 && <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">No personnel found matching your filters.</div>}
          {processedPersonnel.map(person => (
            <div
              key={person.id}
              onClick={() => {
                setSelectedPersonnel(person);
                setProfileDraft(person);
                setIsEditingProfile(false);
              }}
              className={`cursor-pointer border-b border-slate-100 p-4 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${selectedPersonnel?.id === person.id ? 'border-l-4 border-l-blue-600 bg-blue-50 dark:border-l-blue-500 dark:bg-blue-900/20' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-white">{getDisplayName(person)}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{person.role}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
              </div>
              <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">{person.department}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={`flex flex-1 flex-col bg-slate-50 dark:bg-slate-950 ${!selectedPersonnel ? 'hidden md:flex' : 'flex'}`}>
        {selectedPersonnel ? (
          <>
            <div className="border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:hidden">
              <button onClick={() => setSelectedPersonnel(null)} className="font-medium text-blue-600 dark:text-blue-400">
                &larr; Back to List
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="mb-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                      {selectedPersonnel.name.charAt(0)}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{getDisplayName(selectedPersonnel)}</h1>
                      <p className="text-slate-500 dark:text-slate-400">{selectedPersonnel.role} • {selectedPersonnel.department}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isEditingProfile && (
                      <button
                        onClick={handleStartProfileEdit}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <Pencil size={16} />
                        Edit Profile
                      </button>
                    )}
                    <button
                      onClick={() =>
                        requestDelete({
                          category: 'personnel',
                          confirmCategoryLabel: 'personnel records',
                          itemName: getDisplayName(selectedPersonnel),
                          itemType: 'Personnel Member',
                          requireTyping: true,
                          onConfirm: () => {
                            onDeletePersonnel(selectedPersonnel.id);
                            setSelectedPersonnel(null);
                            setProfileDraft(null);
                            setIsEditingProfile(false);
                          },
                        })
                      }
                      className="rounded-full p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      title="Delete Team Member"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {isEditingProfile && profileDraft ? (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Honorific</label>
                        <select
                          value={profileDraft.honorific ?? ''}
                          onChange={event => setProfileDraft(person => (person ? { ...person, honorific: (event.target.value || undefined) as Personnel['honorific'] } : person))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="">None</option>
                          {HONORIFICS.map(honorific => (
                            <option key={honorific} value={honorific}>
                              {honorific}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Full Name</label>
                        <input
                          value={profileDraft.name}
                          onChange={event => setProfileDraft(person => (person ? { ...person, name: event.target.value } : person))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Role</label>
                        <input
                          value={profileDraft.role}
                          onChange={event => setProfileDraft(person => (person ? { ...person, role: event.target.value } : person))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Department</label>
                        <input
                          value={profileDraft.department}
                          onChange={event => setProfileDraft(person => (person ? { ...person, department: event.target.value } : person))}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Email</label>
                        <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                          <Mail size={18} className="text-slate-400 dark:text-slate-500" />
                          <input
                            value={profileDraft.email}
                            onChange={event => setProfileDraft(person => (person ? { ...person, email: event.target.value } : person))}
                            className="w-full bg-transparent text-sm text-slate-700 outline-none dark:text-slate-300"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Phone</label>
                        <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                          <Phone size={18} className="text-slate-400 dark:text-slate-500" />
                          <input
                            value={profileDraft.phone ?? ''}
                            onChange={event => setProfileDraft(person => (person ? { ...person, phone: event.target.value || undefined } : person))}
                            placeholder="Phone Number"
                            className="w-full bg-transparent text-sm text-slate-700 outline-none dark:text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        onClick={handleCancelProfileEdit}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfileEdit}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Honorific</div>
                      <div className="text-sm text-slate-700 dark:text-slate-200">{selectedPersonnel.honorific ?? 'None'}</div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Full Name</div>
                      <div className="text-sm text-slate-700 dark:text-slate-200">{selectedPersonnel.name}</div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Role</div>
                      <div className="text-sm text-slate-700 dark:text-slate-200">{selectedPersonnel.role}</div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Department</div>
                      <div className="text-sm text-slate-700 dark:text-slate-200">{selectedPersonnel.department}</div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Email</div>
                      <div className="text-sm text-slate-700 dark:text-slate-200">{selectedPersonnel.email}</div>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Phone</div>
                      <div className="text-sm text-slate-700 dark:text-slate-200">{selectedPersonnel.phone ?? 'Not provided'}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
                    <FileText size={18} />
                    Performance Notes
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    {selectedPersonnel.performanceNotes.length > 0 ? (
                      <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                        {selectedPersonnel.performanceNotes.map((note, index) => (
                          <li key={index} className="group flex items-start justify-between gap-3 p-4 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                            <span>{note}</span>
                            <button
                              onClick={() =>
                                requestDelete({
                                  category: 'performance-notes',
                                  confirmCategoryLabel: 'performance notes',
                                  itemName: getNotePreview(note),
                                  itemType: 'Performance Note',
                                  onConfirm: () => handleDeletePerformanceNote(index),
                                })
                              }
                              className="opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-8 text-center text-sm text-slate-400 dark:text-slate-500">No notes recorded.</div>
                    )}
                    <form onSubmit={handleAddPerformanceNote} className="border-t border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-start gap-2">
                        <textarea
                          value={newPerformanceNote}
                          onChange={event => setNewPerformanceNote(event.target.value)}
                          placeholder="Add a performance note..."
                          rows={3}
                          className="min-h-[88px] flex-1 resize-y rounded-md border border-slate-200 px-3 py-2 text-sm leading-6 focus:border-blue-500 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <button type="submit" disabled={!newPerformanceNote.trim()} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                          Add
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
                    <UserCog size={18} className="text-amber-500" />
                    My Action Items
                  </h3>
                  <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-slate-100 p-3 dark:border-slate-700">
                      <form onSubmit={event => handleCreateTask(event, 'mine')} className="flex flex-col gap-2">
                        <div className="flex gap-1">
                          <input value={myTaskTitle} onChange={event => setMyTaskTitle(event.target.value)} placeholder="Task for me..." className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-sm focus:border-amber-500 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                          <button type="submit" disabled={!myTaskTitle.trim()} className="flex-shrink-0 rounded bg-amber-100 p-1.5 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:hover:bg-amber-900/60">
                            <Plus size={16} />
                          </button>
                        </div>
                        <div className="flex gap-1">
                          <input type="date" value={myTaskDueDate} onChange={event => setMyTaskDueDate(event.target.value)} className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-amber-500 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                          <select value={myTaskPriority} onChange={event => setMyTaskPriority(event.target.value as Priority)} className="flex-1 rounded border border-slate-200 bg-white px-1 py-1 text-xs focus:border-amber-500 focus:ring-amber-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                            {Object.values(Priority).map(priority => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                        </div>
                      </form>
                    </div>
                    <div className="space-y-2 p-2">
                      {myTasks.length === 0 && <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">No tasks regarding {selectedPersonnel.name.split(' ')[0]}</p>}
                      {myTasks.map(renderTaskItem)}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white">
                    <UserCheck size={18} className="text-purple-500 dark:text-purple-400" />
                    Assigned / Follow Up
                  </h3>
                  <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="border-b border-slate-100 p-3 dark:border-slate-700">
                      <form onSubmit={event => handleCreateTask(event, 'assigned')} className="flex flex-col gap-2">
                        <div className="flex gap-1">
                          <input value={assignedTaskTitle} onChange={event => setAssignedTaskTitle(event.target.value)} placeholder="Assign to person..." className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-sm focus:border-purple-500 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                          <button type="submit" disabled={!assignedTaskTitle.trim()} className="flex-shrink-0 rounded bg-purple-100 p-1.5 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-400 dark:hover:bg-purple-900/60">
                            <Plus size={16} />
                          </button>
                        </div>
                        <div className="flex gap-1">
                          <input type="date" value={assignedTaskDueDate} onChange={event => setAssignedTaskDueDate(event.target.value)} className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-purple-500 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white" />
                          <select value={assignedTaskPriority} onChange={event => setAssignedTaskPriority(event.target.value as Priority)} className="flex-1 rounded border border-slate-200 bg-white px-1 py-1 text-xs focus:border-purple-500 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white">
                            {Object.values(Priority).map(priority => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                        </div>
                      </form>
                    </div>
                    <div className="space-y-2 p-2">
                      {assignedTasks.length === 0 && <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">No tasks assigned to {selectedPersonnel.name.split(' ')[0]}</p>}
                      {assignedTasks.map(renderTaskItem)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-400 dark:text-slate-500">
            <div className="text-center">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a person to view details</p>
            </div>
          </div>
        )}
      </div>

      {deleteConfirmationModal}
    </div>
  );
};
