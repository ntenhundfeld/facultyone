export enum Status {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  REVIEW = 'In Review',
  DONE = 'Done',
  BLOCKED = 'Blocked'
}

export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export enum Category {
  RESEARCH = 'Research',
  TEACHING = 'Teaching',
  ADMIN = 'Admin',
  PERSONNEL = 'Personnel',
  SERVICE = 'Service'
}

export interface ServiceRole {
  id: string;
  name: string;
  role: string;
  type: 'Department' | 'University' | 'Professional';
  description?: string;
  termEnd?: string;
  files: AttachmentFile[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  category: Category;
  assigneeId?: string; // For personnel management: if set, assigned TO them
  relatedPersonnelId?: string; // For personnel management: if set, related to them (context)
  projectId?: string; // Link to research project
  courseId?: string; // Link to teaching course
  serviceRoleId?: string; // Link to service role
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface Personnel {
  id: string;
  honorific?: 'Dr.' | 'Prof.' | 'Mr.' | 'Miss' | 'Mrs.' | 'Ms.';
  name: string;
  role: string;
  email: string;
  phone?: string;
  department: string;
  performanceNotes: string[];
  files: AttachmentFile[];
}

export interface ResearchProject {
  id: string;
  title: string;
  abstract: string;
  stage: string;
  collaborators: string[];
  notes: string[];
  files: AttachmentFile[];
}

export interface Student {
  id: string;
  name: string;
  email: string;
  status: 'Enrolled' | 'Waitlist' | 'Dropped';
  universityId?: string;
  major?: string;
  notes?: string[];
}

export interface AttachmentFile {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'xls' | 'image' | 'other';
  size: string;
  date: string;
  storedFileName?: string;
}

export type CourseFile = AttachmentFile;

export interface Course {
  id: string;
  code: string;
  name: string;
  semester: string;
  studentCount: number; // Kept for display, synced with students.length
  students: Student[];
  files: CourseFile[];
}

export interface AIChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface AppData {
  tasks: Task[];
  personnel: Personnel[];
  projects: ResearchProject[];
  researchStages: string[];
  courses: Course[];
  serviceRoles: ServiceRole[];
}
