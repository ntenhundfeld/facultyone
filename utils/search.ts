import { AppData, Task } from '../types';
import { formatDateLabel } from './date';

export type SearchScope = 'all' | 'tasks' | 'research' | 'teaching' | 'personnel' | 'service';

export interface SearchCallbacks {
  onTaskClick?: (task: Task) => void;
  onOpenProject?: (projectId: string) => void;
  onOpenCourse?: (courseId: string) => void;
  onOpenPersonnel?: (personnelId: string) => void;
  onOpenServiceRole?: (serviceRoleId: string) => void;
}

export interface SearchResult {
  id: string;
  scope: Exclude<SearchScope, 'all'>;
  title: string;
  subtitle: string;
  extra?: string;
  onClick?: () => void;
}

export const scopeOptions: SearchScope[] = ['all', 'tasks', 'research', 'teaching', 'personnel', 'service'];

const matches = (query: string, ...parts: Array<string | undefined>) =>
  parts.some(part => part?.toLowerCase().includes(query));

export const buildSearchResults = (
  appData: AppData,
  query: string,
  scope: SearchScope,
  callbacks: SearchCallbacks = {},
): SearchResult[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const { tasks, projects, courses, personnel, serviceRoles } = appData;
  const output: SearchResult[] = [];

  if (scope === 'all' || scope === 'tasks') {
    tasks.forEach(task => {
      const relatedProject = task.projectId ? projects.find(item => item.id === task.projectId)?.title : undefined;
      const relatedCourse = task.courseId ? courses.find(item => item.id === task.courseId)?.code : undefined;
      const relatedPerson =
        task.relatedPersonnelId || task.assigneeId
          ? personnel.find(item => item.id === task.relatedPersonnelId || item.id === task.assigneeId)?.name
          : undefined;
      const relatedService = task.serviceRoleId ? serviceRoles.find(item => item.id === task.serviceRoleId)?.name : undefined;

      if (matches(normalizedQuery, task.title, task.description, task.status, task.priority, relatedProject, relatedCourse, relatedPerson, relatedService)) {
        output.push({
          id: `task-${task.id}`,
          scope: 'tasks',
          title: task.title,
          subtitle: `${task.category} · ${task.status}`,
          extra: task.dueDate ? `Due ${formatDateLabel(task.dueDate)}` : 'No due date',
          onClick: () => callbacks.onTaskClick?.(task),
        });
      }
    });
  }

  if (scope === 'all' || scope === 'research') {
    projects.forEach(project => {
      if (matches(normalizedQuery, project.title, project.abstract, project.stage, ...project.notes, ...project.collaborators)) {
        output.push({
          id: `research-${project.id}`,
          scope: 'research',
          title: project.title,
          subtitle: `${project.id} · ${project.stage}`,
          extra: project.abstract,
          onClick: () => callbacks.onOpenProject?.(project.id),
        });
      }
    });
  }

  if (scope === 'all' || scope === 'teaching') {
    courses.forEach(course => {
      if (matches(normalizedQuery, course.code, course.name, course.semester, ...course.students.map(student => `${student.name} ${student.email}`), ...course.files.map(file => file.name))) {
        output.push({
          id: `teaching-${course.id}`,
          scope: 'teaching',
          title: `${course.code} · ${course.name}`,
          subtitle: `${course.semester} · ${course.students.length} students`,
          extra: course.files.length ? `${course.files.length} files` : 'No uploaded files',
          onClick: () => callbacks.onOpenCourse?.(course.id),
        });
      }
    });
  }

  if (scope === 'all' || scope === 'personnel') {
    personnel.forEach(person => {
      if (matches(normalizedQuery, person.honorific, person.name, person.role, person.department, person.email, person.phone, ...person.performanceNotes)) {
        output.push({
          id: `personnel-${person.id}`,
          scope: 'personnel',
          title: `${person.honorific ? `${person.honorific} ` : ''}${person.name}`.trim(),
          subtitle: `${person.role} · ${person.department}`,
          extra: person.phone ? `${person.email} · ${person.phone}` : person.email,
          onClick: () => callbacks.onOpenPersonnel?.(person.id),
        });
      }
    });
  }

  if (scope === 'all' || scope === 'service') {
    serviceRoles.forEach(role => {
      if (matches(normalizedQuery, role.name, role.role, role.type, role.description, role.termEnd)) {
        output.push({
          id: `service-${role.id}`,
          scope: 'service',
          title: role.name,
          subtitle: `${role.role} · ${role.type}`,
          extra: role.termEnd ? `Term ends ${formatDateLabel(role.termEnd)}` : 'No term end set',
          onClick: () => callbacks.onOpenServiceRole?.(role.id),
        });
      }
    });
  }

  return output;
};
