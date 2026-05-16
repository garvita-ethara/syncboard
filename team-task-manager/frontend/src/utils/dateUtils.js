export function formatStatus(value) {
  return String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function toDatetimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function toApiDatetime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function dueLabel(value) {
  if (!value) return 'No due date';
  const date = new Date(value);
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function dateLabel(value) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString([], { dateStyle: 'medium' });
}

export function isOverdue(task) {
  return task?.dueDate && task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date();
}
