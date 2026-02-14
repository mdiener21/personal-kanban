const ALLOWED_PRIORITIES = new Set(['urgent', 'high', 'medium', 'low', 'none']);

export function normalizePriority(value) {
  const normalized = (value || '').toString().trim().toLowerCase();
  return ALLOWED_PRIORITIES.has(normalized) ? normalized : 'none';
}
