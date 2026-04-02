import { Priority, Status, Task } from '../types';

export interface CreateTaskInput {
  title: string;
  priority: Priority;
  status?: Status;
  dueDate?: string;
  description?: string;
  assigneeId?: string;
  relatedPersonnelId?: string;
  projectId?: string;
  courseId?: string;
  serviceRoleId?: string;
  category: Task['category'];
}

const timestamp = () => new Date().toISOString();

export const createTask = (input: CreateTaskInput): Task => {
  const now = timestamp();

  return {
    id: Date.now().toString(),
    title: input.title,
    description: input.description,
    priority: input.priority,
    status: input.status ?? Status.TODO,
    category: input.category,
    dueDate: input.dueDate || undefined,
    assigneeId: input.assigneeId,
    relatedPersonnelId: input.relatedPersonnelId,
    projectId: input.projectId,
    courseId: input.courseId,
    serviceRoleId: input.serviceRoleId,
    createdAt: now,
    updatedAt: now,
    completedAt: input.status === Status.DONE ? now : undefined,
  };
};

export const withTaskStatus = (task: Task, status: Status): Task => {
  const now = timestamp();
  return {
    ...task,
    status,
    updatedAt: now,
    completedAt: status === Status.DONE ? task.completedAt ?? now : undefined,
  };
};

export const toggleTaskDone = (task: Task): Task =>
  withTaskStatus(task, task.status === Status.DONE ? Status.TODO : Status.DONE);

export const withTaskPriority = (task: Task, priority: Priority): Task => ({
  ...task,
  priority,
  updatedAt: timestamp(),
});

export const normalizeTask = (task: Task): Task => {
  const createdAt = task.createdAt ?? task.updatedAt ?? task.completedAt ?? timestamp();

  return {
    ...task,
    createdAt,
    updatedAt: task.updatedAt ?? (task.completedAt ? task.completedAt : createdAt),
  };
};
