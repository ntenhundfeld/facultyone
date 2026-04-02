import React, { useState } from 'react';
import { ResearchProject, Task, Status, Category, Priority } from '../types';
import { createTask, toggleTaskDone, withTaskPriority, withTaskStatus } from '../utils/tasks';
import { useDeleteConfirmation } from '../hooks/useDeleteConfirmation';
import { AttachmentPanel } from './AttachmentPanel';
import { deleteDesktopAttachment, importDesktopAttachments, openDesktopAttachment } from '../services/attachments';
import { 
  Plus, 
  MoreHorizontal, 
  ArrowLeft, 
  FlaskConical, 
  CheckSquare, 
  StickyNote, 
  Users,
  Clock,
  Pencil,
  Trash2,
  X
} from 'lucide-react';

interface ResearchBoardProps {
  projects: ResearchProject[];
  researchStages: string[];
  tasks: Task[];
  dataFilePath?: string | null;
  onUpdateProjects: (projects: ResearchProject[]) => void;
  onUpdateResearchStages: (researchStages: string[]) => void;
  onUpdateTasks: (tasks: Task[]) => void;
  onDeleteProject: (id: string) => void;
  initialSelectedId?: string | null;
}

export const ResearchBoard: React.FC<ResearchBoardProps> = ({ projects, researchStages, tasks, dataFilePath, onUpdateProjects, onUpdateResearchStages, onUpdateTasks, onDeleteProject, initialSelectedId }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialSelectedId || null);
  const { requestDelete, deleteConfirmationModal } = useDeleteConfirmation();

  React.useEffect(() => {
    if (initialSelectedId) {
        setSelectedProjectId(initialSelectedId);
    }
  }, [initialSelectedId]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>(Priority.MEDIUM);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newCollaborator, setNewCollaborator] = useState('');
  const [isEditingCollaborators, setIsEditingCollaborators] = useState(false);
  const [isManagingStages, setIsManagingStages] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageInsertAfter, setNewStageInsertAfter] = useState('__end__');
  const [draggedStage, setDraggedStage] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState<string | null>(null);
  const [editingStageDraft, setEditingStageDraft] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newProjectAbstract, setNewProjectAbstract] = useState('');
  const [newProjectStage, setNewProjectStage] = useState(researchStages[0] ?? '');
  const [newProjectCollaborators, setNewProjectCollaborators] = useState('');
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isAttachmentBusy, setIsAttachmentBusy] = useState(false);
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  React.useEffect(() => {
    if (researchStages.length === 0) {
      setNewProjectStage('');
      return;
    }

    if (!researchStages.includes(newProjectStage)) {
      setNewProjectStage(researchStages[0]);
    }
  }, [newProjectStage, researchStages]);

  // -- Handlers --

  const getNextProjectId = () => {
    const highestProjectNumber = projects.reduce((highest, project) => {
      const match = /^RP-(\d+)$/i.exec(project.id.trim());
      if (!match) {
        return highest;
      }

      return Math.max(highest, Number(match[1]));
    }, 100);

    return `RP-${String(highestProjectNumber + 1).padStart(3, '0')}`;
  };

  const resetCreateProjectForm = () => {
    setNewProjectTitle('');
    setNewProjectId('');
    setNewProjectAbstract('');
    setNewProjectStage(researchStages[0] ?? '');
    setNewProjectCollaborators('');
  };

  const openCreateProjectModal = () => {
    resetCreateProjectForm();
    setIsCreatingProject(true);
  };

  const closeCreateProjectModal = () => {
    setIsCreatingProject(false);
    resetCreateProjectForm();
  };

  const handleCreateProject = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedTitle = newProjectTitle.trim();
    const trimmedId = (newProjectId.trim() || getNextProjectId()).toUpperCase();
    const trimmedAbstract = newProjectAbstract.trim();
    const stage = newProjectStage || researchStages[0] || 'Inception';

    if (!trimmedTitle || !trimmedAbstract) {
      return;
    }

    if (projects.some(project => project.id.toUpperCase() === trimmedId)) {
      return;
    }

    const collaborators = Array.from(
      new Set(
        newProjectCollaborators
          .split(',')
          .map(collaborator => collaborator.trim().toUpperCase())
          .filter(Boolean),
      ),
    );

    const newProject: ResearchProject = {
      id: trimmedId,
      title: trimmedTitle,
      abstract: trimmedAbstract,
      stage,
      collaborators,
      notes: [],
      files: [],
    };

    onUpdateProjects([...projects, newProject]);
    setSelectedProjectId(newProject.id);
    closeCreateProjectModal();
  };

  const handleStageChange = (newStage: ResearchProject['stage']) => {
    if (!selectedProject) return;
    const updatedProject = { ...selectedProject, stage: newStage };
    onUpdateProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p));
  };

  const handleAddStage = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedStage = newStageName.trim();
    if (!trimmedStage || researchStages.includes(trimmedStage)) {
      return;
    }

    const nextStages = [...researchStages];
    if (newStageInsertAfter === '__end__') {
      nextStages.push(trimmedStage);
    } else {
      const insertAfterIndex = nextStages.indexOf(newStageInsertAfter);
      nextStages.splice(insertAfterIndex + 1, 0, trimmedStage);
    }

    onUpdateResearchStages(nextStages);
    setNewStageName('');
    setNewStageInsertAfter('__end__');
  };

  const handleDeleteStage = (stageToDelete: string) => {
    if (researchStages.length <= 1) {
      return;
    }

    const currentIndex = researchStages.indexOf(stageToDelete);
    const fallbackStage = researchStages[currentIndex + 1] ?? researchStages[currentIndex - 1];

    if (!fallbackStage) {
      return;
    }

    onUpdateProjects(
      projects.map(project => (project.stage === stageToDelete ? { ...project, stage: fallbackStage } : project)),
    );
    onUpdateResearchStages(researchStages.filter(stage => stage !== stageToDelete));
  };

  const handleStartStageRename = (stage: string) => {
    setEditingStageName(stage);
    setEditingStageDraft(stage);
  };

  const handleCancelStageRename = () => {
    setEditingStageName(null);
    setEditingStageDraft('');
  };

  const handleSaveStageRename = (originalStage: string) => {
    const trimmedStage = editingStageDraft.trim();
    if (!trimmedStage || (trimmedStage !== originalStage && researchStages.includes(trimmedStage))) {
      return;
    }

    onUpdateProjects(
      projects.map(project => (project.stage === originalStage ? { ...project, stage: trimmedStage } : project)),
    );
    onUpdateResearchStages(researchStages.map(stage => (stage === originalStage ? trimmedStage : stage)));
    handleCancelStageRename();
  };

  const handleReorderStages = (sourceStage: string, targetStage: string) => {
    if (sourceStage === targetStage) {
      return;
    }

    const nextStages = [...researchStages];
    const sourceIndex = nextStages.indexOf(sourceStage);
    const targetIndex = nextStages.indexOf(targetStage);

    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }

    nextStages.splice(sourceIndex, 1);
    const insertAt = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    nextStages.splice(insertAt, 0, sourceStage);
    onUpdateResearchStages(nextStages);
  };

  const handleAddCollaborator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newCollaborator.trim()) return;

    const collaborator = newCollaborator.trim().toUpperCase();
    if (selectedProject.collaborators.includes(collaborator)) {
      setNewCollaborator('');
      return;
    }

    const updatedProject = { ...selectedProject, collaborators: [...selectedProject.collaborators, collaborator] };
    onUpdateProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p));
    setNewCollaborator('');
  };

  const handleRemoveCollaborator = (collaborator: string) => {
    if (!selectedProject) return;

    const updatedProject = {
      ...selectedProject,
      collaborators: selectedProject.collaborators.filter(existing => existing !== collaborator),
    };

    onUpdateProjects(projects.map(project => (project.id === selectedProject.id ? updatedProject : project)));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedProjectId) return;

    const newTask: Task = createTask({
      title: newTaskTitle,
      priority: newTaskPriority,
      category: Category.RESEARCH,
      projectId: selectedProjectId,
      dueDate: newTaskDueDate || undefined,
    });

    onUpdateTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskPriority(Priority.MEDIUM);
    setNewTaskDueDate('');
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

  const handleStatusChange = (taskId: string, newStatus: Status) => {
    const updatedTasks = tasks.map(t => t.id === taskId ? withTaskStatus(t, newStatus) : t);
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

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedProject) return;
    const updatedProject = { 
        ...selectedProject, 
        notes: [...(selectedProject.notes || []), newNote] 
    };
    onUpdateProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p));
    setNewNote('');
  };

  const handleDeleteNote = (index: number) => {
    if (!selectedProject) return;
    const newNotes = [...selectedProject.notes];
    newNotes.splice(index, 1);
    const updatedProject = { ...selectedProject, notes: newNotes };
    onUpdateProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p));
  };

  const handleUploadAttachment = async () => {
    if (!selectedProject || !dataFilePath) {
      setAttachmentError('Choose a local JSON save file first so attachments can be copied beside it.');
      return;
    }

    try {
      setIsAttachmentBusy(true);
      const uploadedFiles = await importDesktopAttachments({
        dataFilePath,
        scope: 'research',
        parentId: selectedProject.id,
      });

      if (uploadedFiles.length === 0) {
        return;
      }

      const updatedProject = {
        ...selectedProject,
        files: [...selectedProject.files, ...uploadedFiles],
      };

      onUpdateProjects(projects.map(project => (project.id === selectedProject.id ? updatedProject : project)));
      setAttachmentError(null);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Could not import the selected project files.');
    } finally {
      setIsAttachmentBusy(false);
    }
  };

  const handleOpenAttachment = async (file: ResearchProject['files'][number]) => {
    if (!dataFilePath) {
      return;
    }

    try {
      setActiveAttachmentId(file.id);
      await openDesktopAttachment(dataFilePath, file);
      setAttachmentError(null);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Could not open the selected project file.');
    } finally {
      setActiveAttachmentId(null);
    }
  };

  const handleDeleteAttachment = async (file: ResearchProject['files'][number]) => {
    if (!selectedProject) {
      return;
    }

    try {
      setActiveAttachmentId(file.id);
      if (dataFilePath) {
        await deleteDesktopAttachment(dataFilePath, file);
      }

      const updatedProject = {
        ...selectedProject,
        files: selectedProject.files.filter(existing => existing.id !== file.id),
      };

      onUpdateProjects(projects.map(project => (project.id === selectedProject.id ? updatedProject : project)));
      setAttachmentError(null);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Could not remove the selected project file.');
    } finally {
      setActiveAttachmentId(null);
    }
  };

  const getNotePreview = (note: string) => {
    const trimmed = note.trim();
    if (!trimmed) {
      return 'this note';
    }

    return trimmed.length > 48 ? `${trimmed.slice(0, 48)}...` : trimmed;
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

  const getStatusColor = (status: Status) => {
    switch (status) {
        case Status.TODO: return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600';
        case Status.IN_PROGRESS: return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        case Status.REVIEW: return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
        case Status.BLOCKED: return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
        case Status.DONE: return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
        default: return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600';
    }
  };


  // -- Render Detail View --
  if (selectedProject) {
    const projectTasks = tasks.filter(t => t.projectId === selectedProject.id);

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button 
                    onClick={() => setSelectedProjectId(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                    >
                    <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedProject.title}</h2>
                            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                                {selectedProject.id}
                            </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{selectedProject.abstract}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                     <div className="flex gap-2">
                        <button 
                            onClick={() =>
                              requestDelete({
                                category: 'projects',
                                confirmCategoryLabel: 'research projects',
                                itemName: selectedProject.title,
                                itemType: 'Research Project',
                                requireTyping: true,
                                onConfirm: () => {
                                  onDeleteProject(selectedProject.id);
                                  setSelectedProjectId(null);
                                },
                              })
                            }
                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Project"
                        >
                            <Trash2 size={18} />
                        </button>
                        <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-1 self-center">Current Stage</span>
                     </div>
                     <select 
                        value={selectedProject.stage}
                        onChange={(e) => handleStageChange(e.target.value as any)}
                        className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                     >
                        {researchStages.map(stage => (
                            <option key={stage} value={stage}>{stage}</option>
                        ))}
                     </select>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    
                    {/* Left Column: Project Info */}
                    <div className="space-y-6">
                        {/* Collaborators */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Users size={18} className="text-blue-500 dark:text-blue-400" />
                                    Collaborators
                                </h3>
                                <button
                                  onClick={() => {
                                    setIsEditingCollaborators(true);
                                    setNewCollaborator('');
                                  }}
                                  className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                                >
                                  Edit
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedProject.collaborators.map((c, i) => (
                                    <span key={i} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-full text-sm font-medium border border-slate-200 dark:border-slate-600">
                                        {c}
                                    </span>
                                ))}
                                {selectedProject.collaborators.length === 0 && (
                                    <span className="text-slate-400 dark:text-slate-500 text-sm italic">No collaborators listed</span>
                                )}
                            </div>
                        </div>

                         {/* Notes */}
                         <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                                <StickyNote size={18} className="text-amber-500" />
                                Project Notes
                            </h3>
                            <div className="space-y-3 mb-4">
                                {selectedProject.notes?.map((note, i) => (
                                    <div key={i} className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800/50 text-sm text-slate-700 dark:text-slate-300 flex justify-between group">
                                        <span>{note}</span>
                                        <button
                                            onClick={() =>
                                              requestDelete({
                                                category: 'research-notes',
                                                confirmCategoryLabel: 'research notes',
                                                itemName: getNotePreview(note),
                                                itemType: 'Research Note',
                                                onConfirm: () => handleDeleteNote(i),
                                              })
                                            }
                                            className="text-amber-300 dark:text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {(!selectedProject.notes || selectedProject.notes.length === 0) && (
                                     <div className="text-slate-400 dark:text-slate-500 text-sm italic">No notes added</div>
                                )}
                            </div>
                            <form onSubmit={handleAddNote} className="flex gap-2">
                                <input
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Add quick note..."
                                    className="flex-1 text-sm border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md focus:ring-amber-500 focus:border-amber-500 px-3 py-2 border"
                                />
                                <button type="submit" disabled={!newNote.trim()} className="bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                                    Add
                                </button>
                            </form>
                        </div>

                        <AttachmentPanel
                          title="Project Files"
                          attachments={selectedProject.files}
                          emptyMessage="No project files uploaded yet."
                          onUpload={() => void handleUploadAttachment()}
                          onOpen={file => void handleOpenAttachment(file)}
                          onDelete={file =>
                            requestDelete({
                              category: 'attachments',
                              confirmCategoryLabel: 'attachments',
                              itemName: file.name,
                              itemType: 'Project File',
                              onConfirm: () => {
                                void handleDeleteAttachment(file);
                              },
                            })
                          }
                          uploadDisabled={!dataFilePath}
                          uploadHint={
                            dataFilePath
                              ? 'Uploaded files are copied into the same folder as your FacultyOne JSON file.'
                              : 'Choose a local JSON save file to store project attachments beside it.'
                          }
                          error={attachmentError}
                          isBusy={isAttachmentBusy}
                          busyFileId={activeAttachmentId}
                        />
                    </div>

                    {/* Right Column: Tasks (Spans 2 cols) */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-full">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                    <CheckSquare size={18} className="text-emerald-500" />
                                    Research Tasks
                                </h3>
                                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2 py-1 rounded-full">
                                    {projectTasks.filter(t => t.status !== Status.DONE).length} Pending
                                </span>
                            </div>
                            
                            <div className="p-6 flex-1">
                                <form onSubmit={handleAddTask} className="flex gap-3 mb-6 flex-wrap md:flex-nowrap">
                                    <input 
                                        type="text"
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        placeholder="Add a new task..."
                                        className="flex-grow border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 px-4 py-2 border min-w-[200px]"
                                    />
                                    <input 
                                        type="date"
                                        value={newTaskDueDate}
                                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                                        className="border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 px-3 py-2 border text-sm text-slate-600 dark:text-slate-300"
                                        title="Optional due date"
                                    />
                                    <select
                                        value={newTaskPriority}
                                        onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                                        className="border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 px-3 py-2 border text-sm"
                                    >
                                        {Object.values(Priority).map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                    <button type="submit" disabled={!newTaskTitle.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 whitespace-nowrap">
                                        Add Task
                                    </button>
                                </form>

                                <div className="space-y-3">
                                    {projectTasks.map(task => (
                                        <div key={task.id} className="flex items-start gap-4 p-4 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm transition-all group">
                                            <button 
                                                onClick={() => toggleTaskStatus(task.id)}
                                                className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                                                task.status === Status.DONE 
                                                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                                                    : 'border-slate-300 dark:border-slate-500 hover:border-emerald-500 bg-white dark:bg-slate-800'
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
                                                    {/* Status Selector */}
                                                    <select
                                                        value={task.status}
                                                        onChange={(e) => handleStatusChange(task.id, e.target.value as Status)}
                                                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${getStatusColor(task.status)}`}
                                                    >
                                                        {Object.values(Status).map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>

                                                    {/* Priority Selector */}
                                                    <button 
                                                        onClick={() => cyclePriority(task.id)}
                                                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border transition-colors ${getPriorityColor(task.priority)}`}
                                                        title="Click to change priority"
                                                    >
                                                        {task.priority}
                                                    </button>
                                                    
                                                    {/* Due Date */}
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
                                    {projectTasks.length === 0 && (
                                        <div className="text-center py-12 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                            <FlaskConical size={32} className="mx-auto mb-2 opacity-50" />
                                            <p>No active tasks for this project.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            
            {isEditingCollaborators && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-700">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Edit Collaborators</h3>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add or remove collaborators for this project.</p>
                            </div>
                            <button
                                onClick={() => {
                                  setIsEditingCollaborators(false);
                                  setNewCollaborator('');
                                }}
                                className="text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4 overflow-y-auto p-5">
                            <form onSubmit={handleAddCollaborator} className="flex gap-2">
                                <input
                                    value={newCollaborator}
                                    onChange={(e) => setNewCollaborator(e.target.value)}
                                    placeholder="Initials or short name"
                                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!newCollaborator.trim()}
                                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Add
                                </button>
                            </form>

                            <div className="space-y-2">
                                {selectedProject.collaborators.length === 0 && (
                                    <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
                                        No collaborators listed yet.
                                    </div>
                                )}

                                {selectedProject.collaborators.map((collaborator, index) => (
                                    <div
                                        key={`${collaborator}-${index}`}
                                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                                    >
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{collaborator}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCollaborator(collaborator)}
                                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end border-t border-slate-100 p-4 dark:border-slate-700">
                            <button
                                onClick={() => {
                                  setIsEditingCollaborators(false);
                                  setNewCollaborator('');
                                }}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {deleteConfirmationModal}
        </div>
    );
  }

  // -- Render Kanban Board (Default) --

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Research Pipeline</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage lifecycle from idea to publication</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsManagingStages(true);
              setNewStageName('');
              setNewStageInsertAfter('__end__');
              handleCancelStageRename();
            }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Manage Stages
          </button>
          <button
            onClick={openCreateProjectModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max h-full">
          {researchStages.map((stage) => {
            const stageProjects = projects.filter(p => p.stage === stage);
            
            return (
              <div key={stage} className="w-80 flex-shrink-0 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">{stage}</h3>
                  <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs font-medium">
                    {stageProjects.length}
                  </span>
                </div>
                
                <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-3 flex-1 overflow-y-auto space-y-3 border border-slate-200 dark:border-slate-800">
                  {stageProjects.map(project => (
                    <div 
                        key={project.id} 
                        onClick={() => setSelectedProjectId(project.id)}
                        className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                          {project.id}
                        </span>
                        <button className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{project.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-3">{project.abstract}</p>
                      
                      <div className="flex items-center -space-x-2">
                        {project.collaborators.map((collab, i) => (
                           <div key={i} className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-200" title={collab}>
                             {collab.charAt(0)}
                           </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {stageProjects.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                      No items
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isManagingStages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Manage Research Stages</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create or remove the steps in your pipeline. Deleting a stage moves existing projects into the next available stage.</p>
              </div>
              <button
                onClick={() => {
                  setIsManagingStages(false);
                  setNewStageName('');
                  setNewStageInsertAfter('__end__');
                  handleCancelStageRename();
                }}
                className="text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-5">
              <form onSubmit={handleAddStage} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                <input
                  value={newStageName}
                  onChange={(event) => setNewStageName(event.target.value)}
                  placeholder="New stage name"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <select
                  value={newStageInsertAfter}
                  onChange={(event) => setNewStageInsertAfter(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="__end__">Add at end</option>
                  {researchStages.map(stage => (
                    <option key={stage} value={stage}>
                      Add after {stage}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!newStageName.trim() || researchStages.includes(newStageName.trim())}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  Add Stage
                </button>
              </form>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Drag stage rows to reorder the pipeline.
              </p>

              <div className="max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                {researchStages.map((stage, index) => {
                  const projectsInStage = projects.filter(project => project.stage === stage).length;
                  const nextFallbackStage = researchStages[index + 1] ?? researchStages[index - 1] ?? null;

                  return (
                    <div
                      key={stage}
                      draggable={editingStageName === null}
                      onDragStart={() => {
                        setDraggedStage(stage);
                        setDragOverStage(stage);
                      }}
                      onDragEnd={() => {
                        setDraggedStage(null);
                        setDragOverStage(null);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (dragOverStage !== stage) {
                          setDragOverStage(stage);
                        }
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (draggedStage) {
                          handleReorderStages(draggedStage, stage);
                        }
                        setDraggedStage(null);
                        setDragOverStage(null);
                      }}
                      className={`flex items-center justify-between rounded-xl border bg-white px-4 py-3 dark:bg-slate-900 ${
                        dragOverStage === stage
                          ? 'border-blue-300 ring-2 ring-blue-200 dark:border-blue-600 dark:ring-blue-900/40'
                          : 'border-slate-200 dark:border-slate-700'
                      } ${draggedStage === stage ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 cursor-grab text-slate-300 dark:text-slate-600">
                          <MoreHorizontal size={18} />
                        </div>
                        <div>
                          {editingStageName === stage ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={editingStageDraft}
                                onChange={(event) => setEditingStageDraft(event.target.value)}
                                className="rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveStageRename(stage)}
                                disabled={!editingStageDraft.trim() || (editingStageDraft.trim() !== stage && researchStages.includes(editingStageDraft.trim()))}
                                className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelStageRename}
                                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="font-medium text-slate-800 dark:text-slate-100">{stage}</div>
                          )}
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {projectsInStage} project{projectsInStage === 1 ? '' : 's'}
                            {nextFallbackStage ? ` · Deletes move projects to ${nextFallbackStage}` : ''}
                          </div>
                        </div>
                      </div>
                      {editingStageName !== stage && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartStageRename(stage)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                          >
                            <span className="inline-flex items-center gap-1">
                              <Pencil size={13} />
                              Rename
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={researchStages.length <= 1}
                            onClick={() =>
                              requestDelete({
                                category: 'research-stages',
                                confirmCategoryLabel: 'research stages',
                                itemName: stage,
                                itemType: 'Research Stage',
                                onConfirm: () => handleDeleteStage(stage),
                              })
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 p-4 dark:border-slate-700">
              <button
                onClick={() => {
                  setIsManagingStages(false);
                  setNewStageName('');
                  setNewStageInsertAfter('__end__');
                  handleCancelStageRename();
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {isCreatingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Create New Project</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add a research project and drop it straight into your pipeline.</p>
              </div>
              <button
                onClick={closeCreateProjectModal}
                className="text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-5 overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Project Title</label>
                  <input
                    value={newProjectTitle}
                    onChange={(event) => setNewProjectTitle(event.target.value)}
                    placeholder="e.g. Adaptive Flight Control for UAVs"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Project ID</label>
                  <input
                    value={newProjectId}
                    onChange={(event) => setNewProjectId(event.target.value)}
                    placeholder={getNextProjectId()}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Leave blank to use {getNextProjectId()}.</p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Abstract</label>
                <textarea
                  value={newProjectAbstract}
                  onChange={(event) => setNewProjectAbstract(event.target.value)}
                  rows={4}
                  placeholder="Summarize the project goals, scope, or current research question."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Stage</label>
                  <select
                    value={newProjectStage}
                    onChange={(event) => setNewProjectStage(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  >
                    {researchStages.map(stage => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Collaborators</label>
                  <input
                    value={newProjectCollaborators}
                    onChange={(event) => setNewProjectCollaborators(event.target.value)}
                    placeholder="Comma-separated initials or names, e.g. JS, AG"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              {!!newProjectId.trim() && projects.some(project => project.id.toUpperCase() === newProjectId.trim().toUpperCase()) && (
                <p className="text-sm text-red-600 dark:text-red-400">That project ID already exists. Choose a different ID or leave it blank to auto-generate one.</p>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeCreateProjectModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !newProjectTitle.trim() ||
                    !newProjectAbstract.trim() ||
                    projects.some(project => project.id.toUpperCase() === newProjectId.trim().toUpperCase())
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteConfirmationModal}
    </div>
  );
};
