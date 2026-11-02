export function sanitizePhotoUri(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('file:') || trimmed.startsWith('content:') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return null;
}
