const BACKEND_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api$/, '');

/**
 * Converts a possibly-relative media path (e.g. "/media/logos/org_1.png")
 * to a full URL pointing at the Django backend.
 * Absolute URLs and data URLs are returned unchanged.
 */
export function resolveMediaUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return `${BACKEND_ORIGIN}${url}`;
}
