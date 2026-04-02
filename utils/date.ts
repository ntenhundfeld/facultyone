const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const parseDateString = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateLabel = (value?: string | null) => {
  const parsed = parseDateString(value);
  if (!parsed) {
    return 'No due date';
  }

  return parsed.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: parsed.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
};

export const daysBetween = (from: Date, to: Date) => {
  const delta = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(delta / MS_PER_DAY);
};

export const isOverdueDate = (value?: string | null, reference = new Date()) => {
  const parsed = parseDateString(value);
  return parsed ? parsed.getTime() < startOfDay(reference).getTime() : false;
};

export const isTodayDate = (value?: string | null, reference = new Date()) => {
  const parsed = parseDateString(value);
  return parsed ? startOfDay(parsed).getTime() === startOfDay(reference).getTime() : false;
};

export const isWithinDays = (value: string | undefined, days: number, reference = new Date()) => {
  const parsed = parseDateString(value);
  if (!parsed) {
    return false;
  }

  const diff = daysBetween(reference, parsed);
  return diff >= 0 && diff <= days;
};

export const relativeDateLabel = (value?: string | null, reference = new Date()) => {
  const parsed = parseDateString(value);
  if (!parsed) {
    return 'No due date';
  }

  const diff = daysBetween(reference, parsed);

  if (diff === 0) {
    return 'Today';
  }

  if (diff === 1) {
    return 'Tomorrow';
  }

  if (diff < 0) {
    return `${Math.abs(diff)}d overdue`;
  }

  return `In ${diff}d`;
};
