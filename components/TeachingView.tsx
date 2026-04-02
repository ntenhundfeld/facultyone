import React, { useState } from 'react';
import { Course, Task, Status, Category, Priority, Student, CourseFile } from '../types';
import { createTask, toggleTaskDone, withTaskPriority, withTaskStatus } from '../utils/tasks';
import { useDeleteConfirmation } from '../hooks/useDeleteConfirmation';
import { AttachmentPanel } from './AttachmentPanel';
import { deleteDesktopAttachment, importDesktopAttachments, openDesktopAttachment } from '../services/attachments';
import { 
  BookOpen, 
  CheckSquare, 
  Clock, 
  Users, 
  FileText, 
  ChevronRight, 
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Search,
  MoreVertical,
  X
} from 'lucide-react';

interface TeachingViewProps {

  courses: Course[];

  tasks: Task[];

  dataFilePath?: string | null;

  onUpdateCourses: (courses: Course[]) => void;

  onUpdateTasks: (tasks: Task[]) => void;

  onDeleteCourse: (id: string) => void;

  initialSelectedId?: string | null;

}



export const TeachingView: React.FC<TeachingViewProps> = ({ courses, tasks, dataFilePath, onUpdateCourses, onUpdateTasks, onDeleteCourse, initialSelectedId }) => {

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(initialSelectedId || null);
  const { requestDelete, deleteConfirmationModal } = useDeleteConfirmation();



  React.useEffect(() => {

    if (initialSelectedId) {

        setSelectedCourseId(initialSelectedId);

    }

  }, [initialSelectedId]);

  

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);


  
  // Task Creation State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>(Priority.MEDIUM);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  
  // Student Management State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const rosterFileInputRef = React.useRef<HTMLInputElement>(null);
  const [rosterImportMessage, setRosterImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isAttachmentBusy, setIsAttachmentBusy] = useState(false);
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);
  
  // Student Detail State
  const [newNote, setNewNote] = useState('');

  // Course Creation State
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseSemester, setNewCourseSemester] = useState('');

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const selectedStudent = selectedCourse?.students.find(s => s.id === selectedStudentId);

  // -- Handlers --

  const handleUpdateStudent = (updatedStudent: Student) => {
    if (!selectedCourse) return;
    const updatedStudents = selectedCourse.students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    const updatedCourse = { ...selectedCourse, students: updatedStudents };
    onUpdateCourses(courses.map(c => c.id === selectedCourse.id ? updatedCourse : c));
  };

  const handleAddNote = () => {
    if (!selectedStudent || !newNote.trim()) return;
    const updatedStudent = {
      ...selectedStudent,
      notes: [...(selectedStudent.notes || []), newNote]
    };
    handleUpdateStudent(updatedStudent);
    setNewNote('');
  };

  const handleDeleteNote = (index: number) => {
    if (!selectedStudent || !selectedStudent.notes) return;
    const updatedNotes = selectedStudent.notes.filter((_, i) => i !== index);
    const updatedStudent = { ...selectedStudent, notes: updatedNotes };
    handleUpdateStudent(updatedStudent);
  };

  const handleAddStudent = () => {
    if (!newStudentName.trim() || !newStudentEmail.trim() || !selectedCourse) return;

    const newStudent: Student = {
      id: `s-${Date.now()}`,
      name: newStudentName,
      email: newStudentEmail,
      status: 'Enrolled'
    };

    const updatedCourse = {
      ...selectedCourse,
      students: [...selectedCourse.students, newStudent],
      studentCount: selectedCourse.students.length + 1
    };

    const updatedCourses = courses.map(c => c.id === selectedCourse.id ? updatedCourse : c);
    onUpdateCourses(updatedCourses);
    setNewStudentName('');
    setNewStudentEmail('');
    setIsAddingStudent(false);
  };

  const handleDeleteStudent = (studentId: string) => {
    if (!selectedCourse) return;
    const updatedCourse = {
        ...selectedCourse,
        students: selectedCourse.students.filter(s => s.id !== studentId),
        studentCount: selectedCourse.students.length - 1
    };
    onUpdateCourses(courses.map(c => c.id === selectedCourse.id ? updatedCourse : c));
  };

  const handleUploadFile = async () => {
    if (!selectedCourse || !dataFilePath) {
      setAttachmentError('Choose a local JSON save file first so attachments can be copied beside it.');
      return;
    }

    try {
      setIsAttachmentBusy(true);
      const uploadedFiles = await importDesktopAttachments({
        dataFilePath,
        scope: 'teaching',
        parentId: selectedCourse.id,
      });

      if (uploadedFiles.length === 0) {
        return;
      }

      const updatedCourse = {
        ...selectedCourse,
        files: [...selectedCourse.files, ...uploadedFiles],
      };

      onUpdateCourses(courses.map(c => c.id === selectedCourse.id ? updatedCourse : c));
      setAttachmentError(null);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Could not import the selected course files.');
    } finally {
      setIsAttachmentBusy(false);
    }
  };

  const handleOpenFile = async (file: CourseFile) => {
    if (!dataFilePath) {
      return;
    }

    try {
      setActiveAttachmentId(file.id);
      await openDesktopAttachment(dataFilePath, file);
      setAttachmentError(null);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : 'Could not open the selected course file.');
    } finally {
      setActiveAttachmentId(null);
    }
  };

  const handleDeleteFile = async (file: CourseFile) => {
     if (!selectedCourse) return;

     try {
        setActiveAttachmentId(file.id);
        if (dataFilePath) {
          await deleteDesktopAttachment(dataFilePath, file);
        }

        const updatedCourse = {
          ...selectedCourse,
          files: selectedCourse.files.filter(f => f.id !== file.id)
        };
        onUpdateCourses(courses.map(c => c.id === selectedCourse.id ? updatedCourse : c));
        setAttachmentError(null);
     } catch (error) {
        setAttachmentError(error instanceof Error ? error.message : 'Could not remove the selected course file.');
     } finally {
        setActiveAttachmentId(null);
     }
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode.trim() || !newCourseName.trim()) return;

    const newCourse: Course = {
      id: `c-${Date.now()}`,
      code: newCourseCode,
      name: newCourseName,
      semester: newCourseSemester || 'Upcoming',
      studentCount: 0,
      students: [],
      files: []
    };

    onUpdateCourses([...courses, newCourse]);
    setNewCourseCode('');
    setNewCourseName('');
    setNewCourseSemester('');
    setIsCreatingCourse(false);
  };

  const handleBulkUploadClick = () => {
    setRosterImportMessage(null);
    rosterFileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCourse) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      if (lines.length < 2) {
        setRosterImportMessage({ type: 'error', text: 'CSV file is empty or missing headers.' });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIndex = headers.indexOf('name');
      const emailIndex = headers.indexOf('email');
      const statusIndex = headers.indexOf('status');

      if (nameIndex === -1 || emailIndex === -1) {
        setRosterImportMessage({ type: 'error', text: 'CSV format is missing required columns: Name and Email.' });
        return;
      }

      const newStudents: Student[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim());
        if (values.length < 2) continue;

        const name = values[nameIndex];
        const email = values[emailIndex];
        // simple validation
        if (!name || !email) continue;

        const statusRaw = statusIndex !== -1 ? values[statusIndex] : 'Enrolled';
        let status: 'Enrolled' | 'Waitlist' | 'Dropped' = 'Enrolled';
        if (statusRaw.toLowerCase() === 'waitlist') status = 'Waitlist';
        else if (statusRaw.toLowerCase() === 'dropped') status = 'Dropped';

        newStudents.push({
            id: `s-${Date.now()}-${i}`,
            name,
            email,
            status
        });
      }

      if (newStudents.length > 0) {
        const updatedCourse = {
            ...selectedCourse,
            students: [...selectedCourse.students, ...newStudents],
            studentCount: selectedCourse.students.length + newStudents.length
        };
        onUpdateCourses(courses.map(c => c.id === selectedCourse.id ? updatedCourse : c));
        setRosterImportMessage({ type: 'success', text: `Imported ${newStudents.length} students from ${file.name}.` });
      } else {
        setRosterImportMessage({ type: 'error', text: 'No valid student records were found in the CSV.' });
      }
      
      // Reset input
      if (rosterFileInputRef.current) rosterFileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedCourseId) return;

    const newTask: Task = createTask({
      title: newTaskTitle,
      priority: newTaskPriority,
      category: Category.TEACHING,
      courseId: selectedCourseId,
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

  const getNotePreview = (note: string) => {
    const trimmed = note.trim();
    if (!trimmed) {
      return 'this note';
    }

    return trimmed.length > 48 ? `${trimmed.slice(0, 48)}...` : trimmed;
  };

// ... existing code ...

  // -- Render Views --

  if (selectedCourse) {
    if (selectedStudent) {
        return (
            <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
                {/* Student Header */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6 flex items-center gap-4">
                    <button 
                        onClick={() => setSelectedStudentId(null)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedStudent.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                                selectedStudent.status === 'Enrolled' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                                selectedStudent.status === 'Waitlist' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                                {selectedStudent.status}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 text-sm">• {selectedCourse.code}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Student Details Form */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <Users size={18} className="text-blue-500 dark:text-blue-400" />
                                Student Details
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Full Name</label>
                                    <input 
                                        value={selectedStudent.name}
                                        onChange={(e) => handleUpdateStudent({ ...selectedStudent, name: e.target.value })}
                                        className="w-full text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Email Address</label>
                                    <input 
                                        value={selectedStudent.email}
                                        onChange={(e) => handleUpdateStudent({ ...selectedStudent, email: e.target.value })}
                                        className="w-full text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">University ID</label>
                                    <input 
                                        value={selectedStudent.universityId || ''}
                                        onChange={(e) => handleUpdateStudent({ ...selectedStudent, universityId: e.target.value })}
                                        placeholder="e.g. U12345678"
                                        className="w-full text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Major / Program</label>
                                    <input 
                                        value={selectedStudent.major || ''}
                                        onChange={(e) => handleUpdateStudent({ ...selectedStudent, major: e.target.value })}
                                        placeholder="e.g. Computer Science"
                                        className="w-full text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Status</label>
                                    <select
                                        value={selectedStudent.status}
                                        onChange={(e) => handleUpdateStudent({ ...selectedStudent, status: e.target.value as any })}
                                        className="w-full text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="Enrolled">Enrolled</option>
                                        <option value="Waitlist">Waitlist</option>
                                        <option value="Dropped">Dropped</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
                            <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <FileText size={18} className="text-amber-500" />
                                Private Notes
                            </h3>
                            
                            <div className="flex-1 overflow-y-auto mb-4 space-y-3 min-h-[200px]">
                                {(!selectedStudent.notes || selectedStudent.notes.length === 0) && (
                                    <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-8">No notes added yet.</div>
                                )}
                                {selectedStudent.notes?.map((note, index) => (
                                    <div key={index} className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800/50 text-sm text-slate-700 dark:text-slate-300 relative group">
                                        {note}
                                        <button 
                                            onClick={() =>
                                              requestDelete({
                                                category: 'student-notes',
                                                confirmCategoryLabel: 'student notes',
                                                itemName: getNotePreview(note),
                                                itemType: 'Student Note',
                                                onConfirm: () => handleDeleteNote(index),
                                              })
                                            }
                                            className="absolute top-2 right-2 text-amber-300 dark:text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input 
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                    placeholder="Add a note..."
                                    className="flex-1 text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                                <button 
                                    onClick={handleAddNote}
                                    disabled={!newNote.trim()}
                                    className="bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-400 px-3 py-2 rounded-lg disabled:opacity-50"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const courseTasks = tasks.filter(t => t.courseId === selectedCourse.id);
    
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedCourseId(null)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                  {selectedCourse.code}
                </span>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedCourse.name}</h2>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{selectedCourse.semester} • {selectedCourse.students.length} Students</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={() =>
                  requestDelete({
                    category: 'courses',
                    confirmCategoryLabel: 'courses',
                    itemName: selectedCourse.name,
                    itemType: 'Course',
                    requireTyping: true,
                    onConfirm: () => {
                      onDeleteCourse(selectedCourse.id);
                      setSelectedCourseId(null);
                      setSelectedStudentId(null);
                    },
                  })
                }
                className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-2"
            >
                <Trash2 size={16} />
                Delete
            </button>
          </div>
        </div>

        {/* Content Columns */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800">
            
            {/* Column 1: Tasks */}
            <div className="bg-slate-50 dark:bg-slate-950 flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex justify-between items-center backdrop-blur-sm sticky top-0 z-10">
                <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <CheckSquare size={18} className="text-blue-500 dark:text-blue-400" />
                  Course To-Dos
                </h3>
                <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                  {courseTasks.filter(t => t.status !== Status.DONE).length}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <form onSubmit={handleAddTask} className="flex flex-col gap-2 mb-4">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add new task..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                      <input 
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="flex-1 px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        title="Optional due date"
                      />
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                        className="px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                         {Object.values(Priority).map(p => (
                            <option key={p} value={p}>{p}</option>
                         ))}
                      </select>
                      <button type="submit" disabled={!newTaskTitle.trim()} className="bg-blue-600 dark:bg-blue-700 text-white p-2 rounded-lg disabled:opacity-50 hover:bg-blue-700 dark:hover:bg-blue-600">
                        <Plus size={18} />
                      </button>
                  </div>
                </form>

                {courseTasks.length === 0 && (
                  <div className="text-center text-slate-400 dark:text-slate-500 py-8 text-sm">
                    No tasks yet.
                  </div>
                )}

                {courseTasks.map(task => (
                  <div key={task.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-start gap-3">
                      <button 
                        onClick={() => toggleTaskStatus(task.id)}
                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                          task.status === Status.DONE 
                            ? 'bg-blue-500 border-blue-500 text-white' 
                            : 'border-slate-300 dark:border-slate-500 hover:border-blue-500 dark:hover:border-blue-400'
                        }`}
                      >
                         {task.status === Status.DONE && <CheckSquare size={12} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <p className={`text-sm break-words ${task.status === Status.DONE ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>
                            {task.title}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <select
                                value={task.status}
                                onChange={(e) => handleStatusChange(task.id, e.target.value as Status)}
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${getStatusColor(task.status)}`}
                            >
                                {Object.values(Status).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>

                            <button 
                                onClick={() => cyclePriority(task.id)}
                                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border transition-colors ${getPriorityColor(task.priority)}`}
                                title="Click to change priority"
                            >
                                {task.priority}
                            </button>
                            {task.dueDate && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 border border-slate-100 dark:border-slate-600 px-1 rounded bg-slate-50 dark:bg-slate-700/50">
                                    <Clock size={10} /> {task.dueDate}
                                </span>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Roster */}
            <div className="bg-white dark:bg-slate-900 flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 z-10 bg-white dark:bg-slate-900">
                <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <Users size={18} className="text-emerald-500 dark:text-emerald-400" />
                  Student Roster
                </h3>
                <div className="flex gap-2">
                    <input 
                        type="file" 
                        ref={rosterFileInputRef} 
                        onChange={handleFileChange} 
                        accept=".csv" 
                        className="hidden" 
                    />
                    <button 
                        onClick={handleBulkUploadClick}
                        className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                        title="Import from CSV"
                    >
                        <Upload size={14} /> Bulk Upload
                    </button>
                    <button 
                        onClick={() => setIsAddingStudent(!isAddingStudent)}
                        className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 p-1.5 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                    >
                        <Plus size={14} /> Add
                    </button>
                </div>
              </div>

              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-xs text-slate-500 dark:text-slate-400">
                Upload a CSV with `Name`, `Email`, and optional `Status` columns.
                {rosterImportMessage && (
                  <span className={`block mt-1 font-medium ${rosterImportMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {rosterImportMessage.text}
                  </span>
                )}
              </div>

              {isAddingStudent && (
                 <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/50 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <input 
                            value={newStudentName}
                            onChange={(e) => setNewStudentName(e.target.value)}
                            placeholder="Student Name"
                            className="w-full text-sm p-2 rounded border border-emerald-200 dark:border-emerald-800 dark:bg-slate-800 dark:text-white"
                        />
                        <input 
                            value={newStudentEmail}
                            onChange={(e) => setNewStudentEmail(e.target.value)}
                            placeholder="Email Address"
                            className="w-full text-sm p-2 rounded border border-emerald-200 dark:border-emerald-800 dark:bg-slate-800 dark:text-white"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setIsAddingStudent(false)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">Cancel</button>
                            <button onClick={handleAddStudent} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs">Save</button>
                        </div>
                    </div>
                 </div>
              )}

              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedCourse.students.length === 0 && (
                             <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">No students enrolled.</td></tr>
                        )}
                        {selectedCourse.students.map(student => (
                            <tr 
                                key={student.id} 
                                onClick={() => setSelectedStudentId(student.id)}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800 group cursor-pointer transition-colors"
                            >
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-800 dark:text-slate-200">{student.name}</div>
                                    <div className="text-slate-400 dark:text-slate-500 text-xs">{student.email}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        student.status === 'Enrolled' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                                        student.status === 'Waitlist' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    }`}>
                                        {student.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          requestDelete({
                                            category: 'students',
                                            confirmCategoryLabel: 'students',
                                            itemName: student.name,
                                            itemType: 'Student',
                                            onConfirm: () => handleDeleteStudent(student.id),
                                          });
                                        }}
                                        className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
            </div>

            {/* Column 3: Files */}
            <div className="bg-slate-50 dark:bg-slate-950 flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4">
                <AttachmentPanel
                  title="Files"
                  attachments={selectedCourse.files}
                  emptyMessage="No files uploaded."
                  onUpload={() => void handleUploadFile()}
                  onOpen={file => void handleOpenFile(file)}
                  onDelete={file =>
                    requestDelete({
                      category: 'course-files',
                      confirmCategoryLabel: 'course files',
                      itemName: file.name,
                      itemType: 'Course File',
                      onConfirm: () => {
                        void handleDeleteFile(file);
                      },
                    })
                  }
                  uploadDisabled={!dataFilePath}
                  uploadHint={
                    dataFilePath
                      ? 'Uploaded files are copied into the same folder as your FacultyOne JSON file.'
                      : 'Choose a local JSON save file to store course attachments beside it.'
                  }
                  error={attachmentError}
                  isBusy={isAttachmentBusy}
                  busyFileId={activeAttachmentId}
                  className="h-full"
                />
              </div>
            </div>

          </div>
        </div>
        
        {deleteConfirmationModal}
      </div>
    );
  }

  // -- Master List View --

  return (
    <div className="p-8 relative">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Teaching</h2>
        <p className="text-slate-500 dark:text-slate-400">Manage your courses, rosters, and tasks.</p>
      </div>

       {/* Modal Overlay */}
      {isCreatingCourse && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Create New Course</h3>
                    <button onClick={() => setIsCreatingCourse(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleCreateCourse} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Course Code</label>
                        <input 
                            value={newCourseCode}
                            onChange={e => setNewCourseCode(e.target.value)}
                            placeholder="e.g. CS101"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Course Name</label>
                        <input 
                            value={newCourseName}
                            onChange={e => setNewCourseName(e.target.value)}
                            placeholder="e.g. Intro to Computer Science"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Semester</label>
                        <input 
                            value={newCourseSemester}
                            onChange={e => setNewCourseSemester(e.target.value)}
                            placeholder="e.g. Spring 2024"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div className="pt-2 flex justify-end gap-3">
                        <button 
                            type="button"
                            onClick={() => setIsCreatingCourse(false)}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={!newCourseCode || !newCourseName}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create Course
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => {
           const courseTaskCount = tasks.filter(t => t.courseId === course.id && t.status !== Status.DONE).length;
           
           return (
            <div 
                key={course.id} 
                onClick={() => setSelectedCourseId(course.id)}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all group"
            >
                <div className="flex justify-between items-start mb-4">
                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                        {course.code}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-sm">{course.semester}</span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{course.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">
                    Manage student roster, track teaching tasks, and organize course files.
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                            <Users size={16} /> {course.students.length}
                        </span>
                        <span className="flex items-center gap-1">
                            <CheckSquare size={16} /> {courseTaskCount}
                        </span>
                        <span className="flex items-center gap-1">
                            <FileText size={16} /> {course.files.length}
                        </span>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
                </div>
            </div>
           );
        })}
        
        {/* Add New Course Placeholder */}
        <div 
            onClick={() => setIsCreatingCourse(true)}
            className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all cursor-pointer group"
        >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:bg-white dark:group-hover:bg-slate-700">
                <Plus size={24} />
            </div>
            <span className="font-medium">Add New Course</span>
        </div>
      </div>
    </div>
  );
};
