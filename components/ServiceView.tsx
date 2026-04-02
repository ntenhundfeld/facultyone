import React, { useState } from 'react';
import { ServiceRole, Task, Status, Category, Priority } from '../types';
import { createTask, toggleTaskDone, withTaskPriority } from '../utils/tasks';
import { useDeleteConfirmation } from '../hooks/useDeleteConfirmation';
import { AttachmentPanel } from './AttachmentPanel';
import { deleteDesktopAttachment, importDesktopAttachments, openDesktopAttachment } from '../services/attachments';
import { 
  Plus, 
  MoreHorizontal, 
  ArrowLeft, 
  CheckSquare, 
  Clock,
  Briefcase,
  Building2,
  Globe2,
  Trash2,
  Calendar,
  Edit,
  X
} from 'lucide-react';

interface ServiceViewProps {
  serviceRoles: ServiceRole[];
  tasks: Task[];
  dataFilePath?: string | null;
  onUpdateServiceRoles: (roles: ServiceRole[]) => void;
  onUpdateTasks: (tasks: Task[]) => void;
  onDeleteServiceRole: (id: string) => void;
  initialSelectedId?: string | null;
}

const SERVICE_TYPES = ['Department', 'University', 'Professional'] as const;

export const ServiceView: React.FC<ServiceViewProps> = ({ serviceRoles, tasks, dataFilePath, onUpdateServiceRoles, onUpdateTasks, onDeleteServiceRole, initialSelectedId }) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(initialSelectedId || null);
  const { requestDelete, deleteConfirmationModal } = useDeleteConfirmation();

  React.useEffect(() => {
    if (initialSelectedId) {
        setSelectedRoleId(initialSelectedId);
    }
  }, [initialSelectedId]);

  const [isAddingRole, setIsAddingRole] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  
  // New Role Form State
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newRoleType, setNewRoleType] = useState<ServiceRole['type']>('Department');
  const [newRoleTerm, setNewRoleTerm] = useState('');

  // Task Creation State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>(Priority.MEDIUM);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isAttachmentBusy, setIsAttachmentBusy] = useState(false);
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);

  const selectedRole = serviceRoles.find(r => r.id === selectedRoleId);

  // -- Handlers --

  const handleEditClick = () => {
    if (!selectedRole) return;
    setNewRoleName(selectedRole.name);
    setNewRoleTitle(selectedRole.role);
    setNewRoleType(selectedRole.type);
    setNewRoleTerm(selectedRole.termEnd || '');
    setIsEditingRole(true);
  };

  const handleUpdateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !newRoleName.trim() || !newRoleTitle.trim()) return;

    const updatedRole: ServiceRole = {
        ...selectedRole,
        name: newRoleName,
        role: newRoleTitle,
        type: newRoleType,
        termEnd: newRoleTerm || undefined
    };

    onUpdateServiceRoles(serviceRoles.map(r => r.id === selectedRole.id ? updatedRole : r));
    setIsEditingRole(false);
    // Clear form state
    setNewRoleName('');
    setNewRoleTitle('');
    setNewRoleType('Department');
    setNewRoleTerm('');
  };

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim() || !newRoleTitle.trim()) return;

    const newRole: ServiceRole = {
      id: `svc-${Date.now()}`,
      name: newRoleName,
      role: newRoleTitle,
      type: newRoleType,
      termEnd: newRoleTerm || undefined,
      files: [],
    };

    onUpdateServiceRoles([...serviceRoles, newRole]);
    setNewRoleName('');
    setNewRoleTitle('');
    setNewRoleType('Department');
    setNewRoleTerm('');
    setIsAddingRole(false);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedRoleId) return;

    const newTask: Task = createTask({
      title: newTaskTitle,
      priority: newTaskPriority,
      category: Category.SERVICE,
      serviceRoleId: selectedRoleId,
      dueDate: newTaskDueDate || undefined,
    });

    onUpdateTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskPriority(Priority.MEDIUM);
    setNewTaskDueDate('');
  };

  const handleUploadAttachment = async () => {
    if (!selectedRole || !dataFilePath) {
      setAttachmentError('Choose a local JSON save file first so attachments can be copied beside it.');
      return;
    }

    try {
      setIsAttachmentBusy(true);
      const uploadedFiles = await importDesktopAttachments({
        dataFilePath,
        scope: 'service',
        parentId: selectedRole.id,
      });

      if (uploadedFiles.length === 0) {
        return;
      }

      const updatedRole = {
        ...selectedRole,
        files: [...selectedRole.files, ...uploadedFiles],
      };

      onUpdateServiceRoles(serviceRoles.map(role => (role.id === selectedRole.id ? updatedRole : role)));
      setAttachmentError(null);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Could not import the selected service files.');
    } finally {
      setIsAttachmentBusy(false);
    }
  };

  const handleOpenAttachment = async (file: ServiceRole['files'][number]) => {
    if (!dataFilePath) {
      return;
    }

    try {
      setActiveAttachmentId(file.id);
      await openDesktopAttachment(dataFilePath, file);
      setAttachmentError(null);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Could not open the selected service file.');
    } finally {
      setActiveAttachmentId(null);
    }
  };

  const handleDeleteAttachment = async (file: ServiceRole['files'][number]) => {
    if (!selectedRole) {
      return;
    }

    try {
      setActiveAttachmentId(file.id);
      if (dataFilePath) {
        await deleteDesktopAttachment(dataFilePath, file);
      }

      const updatedRole = {
        ...selectedRole,
        files: selectedRole.files.filter(existing => existing.id !== file.id),
      };

      onUpdateServiceRoles(serviceRoles.map(role => (role.id === selectedRole.id ? updatedRole : role)));
      setAttachmentError(null);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Could not remove the selected service file.');
    } finally {
      setActiveAttachmentId(null);
    }
  };

  const toggleTaskStatus = (taskId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return toggleTaskDone(t);
      }
      return t;
    });
    onUpdateTasks(updatedTasks);
  };

  const cyclePriority = (taskId: string) => {
    const priorities = Object.values(Priority);
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const currentIndex = priorities.indexOf(t.priority);
        const nextPriority = priorities[(currentIndex + 1) % priorities.length];
        return withTaskPriority(t, nextPriority);
      }
      return t;
    });
    onUpdateTasks(updatedTasks);
  };

  const getTypeIcon = (type: ServiceRole['type']) => {
      switch (type) {
          case 'Department': return <Briefcase size={18} className="text-blue-500" />;
          case 'University': return <Building2 size={18} className="text-purple-500" />;
          case 'Professional': return <Globe2 size={18} className="text-emerald-500" />;
      }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL: return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50';
      case Priority.HIGH: return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/50';
      case Priority.MEDIUM: return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50';
      case Priority.LOW: return 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700';
      default: return 'bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600';
    }
  };

  // -- Render Detail View --
  if (selectedRole) {
    const roleTasks = tasks.filter(t => t.serviceRoleId === selectedRole.id);

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6">
                {isEditingRole ? (
                    <form onSubmit={handleUpdateRole} className="space-y-4 animate-in fade-in">
                        <div className="flex justify-between items-start">
                             <div className="space-y-4 flex-1 max-w-2xl">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Committee / Org Name</label>
                                    <input 
                                        value={newRoleName}
                                        onChange={e => setNewRoleName(e.target.value)}
                                        className="w-full text-lg font-bold border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 border focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Role</label>
                                        <input 
                                            value={newRoleTitle}
                                            onChange={e => setNewRoleTitle(e.target.value)}
                                            className="w-full text-sm border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 border focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Type</label>
                                        <select 
                                            value={newRoleType}
                                            onChange={e => setNewRoleType(e.target.value as ServiceRole['type'])}
                                            className="w-full text-sm border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 border focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800"
                                        >
                                            {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Term End</label>
                                        <input 
                                            type="date"
                                            value={newRoleTerm}
                                            onChange={e => setNewRoleTerm(e.target.value)}
                                            className="w-full text-sm border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg px-3 py-2 border focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                             </div>
                             <div className="flex gap-2">
                                <button 
                                    type="button" 
                                    onClick={() => setIsEditingRole(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium"
                                >
                                    Save Changes
                                </button>
                             </div>
                        </div>
                    </form>
                ) : (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setSelectedRoleId(null)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedRole.name}</h2>
                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide border border-slate-200 dark:border-slate-700">
                                        {selectedRole.type}
                                    </span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{selectedRole.role}</span>
                                    {selectedRole.termEnd && (
                                        <span className="text-slate-400 dark:text-slate-500 text-sm">• Term ends: {selectedRole.termEnd}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleEditClick}
                                className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Edit Role"
                            >
                                <Edit size={20} />
                            </button>
                            <button 
                                onClick={() =>
                                  requestDelete({
                                    category: 'service-roles',
                                    confirmCategoryLabel: 'service commitments',
                                    itemName: selectedRole.name,
                                    itemType: 'Service Commitment',
                                    requireTyping: true,
                                    onConfirm: () => {
                                      onDeleteServiceRole(selectedRole.id);
                                      setSelectedRoleId(null);
                                      setIsEditingRole(false);
                                    },
                                  })
                                }
                                className="text-red-400 hover:text-red-600 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Delete Role"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                <CheckSquare size={18} className="text-blue-500 dark:text-blue-400" />
                                Action Items & Responsibilities
                            </h3>
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-2 py-1 rounded-full">
                                {roleTasks.filter(t => t.status !== Status.DONE).length} Pending
                            </span>
                        </div>
                        
                        <div className="p-6">
                            <form onSubmit={handleAddTask} className="flex gap-3 mb-6">
                                <input 
                                    type="text"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder="Add new task..."
                                    className="flex-grow border-slate-300 dark:border-slate-700 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2 border"
                                />
                                <input 
                                    type="date"
                                    value={newTaskDueDate}
                                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                                    className="border-slate-300 dark:border-slate-700 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border text-sm text-slate-600 dark:text-slate-300"
                                />
                                <select
                                    value={newTaskPriority}
                                    onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                                    className="border-slate-300 dark:border-slate-700 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2 border text-sm"
                                >
                                    {Object.values(Priority).map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                                <button type="submit" disabled={!newTaskTitle.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50">
                                    Add
                                </button>
                            </form>

                            <div className="space-y-3">
                                {roleTasks.length === 0 && (
                                    <div className="text-center py-12 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                        <Briefcase size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>No tasks tracked for this role yet.</p>
                                    </div>
                                )}
                                {roleTasks.map(task => (
                                    <div key={task.id} className="flex items-start gap-4 p-4 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all group">
                                        <button 
                                            onClick={() => toggleTaskStatus(task.id)}
                                            className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                                            task.status === Status.DONE 
                                                ? 'bg-blue-500 border-blue-500 text-white' 
                                                : 'border-slate-300 dark:border-slate-500 hover:border-blue-500 bg-white dark:bg-slate-800'
                                            }`}
                                        >
                                            {task.status === Status.DONE && <CheckSquare size={14} />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <span className={`text-sm font-medium break-words ${task.status === Status.DONE ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {task.title}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <button 
                                                    onClick={() => cyclePriority(task.id)}
                                                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border transition-colors ${getPriorityColor(task.priority)}`}
                                                >
                                                    {task.priority}
                                                </button>
                                                
                                                {task.dueDate && (
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-600 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800">
                                                        <Clock size={10} />
                                                        <span>{task.dueDate}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <AttachmentPanel
                        title="Service Files"
                        attachments={selectedRole.files}
                        emptyMessage="No service files uploaded yet."
                        onUpload={() => void handleUploadAttachment()}
                        onOpen={file => void handleOpenAttachment(file)}
                        onDelete={file =>
                          requestDelete({
                            category: 'attachments',
                            confirmCategoryLabel: 'attachments',
                            itemName: file.name,
                            itemType: 'Service File',
                            onConfirm: () => {
                              void handleDeleteAttachment(file);
                            },
                          })
                        }
                        uploadDisabled={!dataFilePath}
                        uploadHint={
                          dataFilePath
                            ? 'Uploaded files are copied into the same folder as your FacultyOne JSON file.'
                            : 'Choose a local JSON save file to store service attachments beside it.'
                        }
                        error={attachmentError}
                        isBusy={isAttachmentBusy}
                        busyFileId={activeAttachmentId}
                    />
                </div>
            </div>

            {deleteConfirmationModal}
        </div>
    );
  }

  // -- Main Board View --

  return (
    <div className="p-8 h-full flex flex-col relative bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Service & Administration</h2>
          <p className="text-slate-500 dark:text-slate-400">Track committees, reviews, and administrative duties.</p>
        </div>
        <button 
            onClick={() => setIsAddingRole(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Add Commitment
        </button>
      </div>

       {/* Add Role Modal */}
       {isAddingRole && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">New Service Commitment</h3>
                    <button onClick={() => setIsAddingRole(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleAddRole} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Committee / Org Name</label>
                        <input 
                            value={newRoleName}
                            onChange={e => setNewRoleName(e.target.value)}
                            placeholder="e.g. Graduate Admissions Committee"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Your Role</label>
                        <input 
                            value={newRoleTitle}
                            onChange={e => setNewRoleTitle(e.target.value)}
                            placeholder="e.g. Chair, Member, Reviewer"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                        <select 
                            value={newRoleType}
                            onChange={e => setNewRoleType(e.target.value as ServiceRole['type'])}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-700"
                        >
                            {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Term End (Optional)</label>
                        <input 
                            type="date"
                            value={newRoleTerm}
                            onChange={e => setNewRoleTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                        <button 
                            type="button"
                            onClick={() => setIsAddingRole(false)}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={!newRoleName || !newRoleTitle}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            Add Commitment
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max h-full">
          {SERVICE_TYPES.map((type) => {
            const typeRoles = serviceRoles.filter(r => r.type === type);
            
            return (
              <div key={type} className="w-96 flex-shrink-0 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3 px-1">
                    {getTypeIcon(type)}
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">{type}</h3>
                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs font-medium ml-auto">
                        {typeRoles.length}
                    </span>
                </div>
                
                <div className="bg-slate-100/50 dark:bg-slate-900/50 rounded-xl p-3 flex-1 overflow-y-auto space-y-3 border border-slate-200/60 dark:border-slate-800">
                  {typeRoles.map(role => {
                      const activeTaskCount = tasks.filter(t => t.serviceRoleId === role.id && t.status !== Status.DONE).length;
                      return (
                        <div 
                            key={role.id} 
                            onClick={() => setSelectedRoleId(role.id)}
                            className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all cursor-pointer group"
                        >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded border border-slate-100 dark:border-slate-600">
                                {role.role}
                            </span>
                             {role.termEnd && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                    <Calendar size={10} /> {role.termEnd}
                                </span>
                            )}
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-white mb-3">{role.name}</h4>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-700">
                             <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                <CheckSquare size={14} className={activeTaskCount > 0 ? "text-blue-500 dark:text-blue-400" : "text-slate-300 dark:text-slate-600"} />
                                <span>{activeTaskCount} Active Tasks</span>
                             </div>
                             <MoreHorizontal size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                        </div>
                        </div>
                      );
                  })}
                  
                  {typeRoles.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm gap-2">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full">
                            {getTypeIcon(type)}
                        </div>
                        No {type.toLowerCase()} commitments
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
