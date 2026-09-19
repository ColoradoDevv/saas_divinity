const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta de nuevo.';
const TIMEOUT_ERROR_MESSAGE = 'La solicitud tardó demasiado en responder. Verifica tu conexión e intenta de nuevo.';
const SERVER_ERROR_MESSAGE = 'Ocurrió un error en el servidor. Intenta de nuevo en unos minutos; si persiste, contacta a soporte.';

interface ApiErrorShape {
  isAxiosError?: boolean;
  code?: string;
  response?: { status?: number; data?: unknown };
}

/** Duck-types instead of using axios's `isAxiosError` so plain mock error objects (as used in tests) work too. */
function looksLikeApiError(err: unknown): err is ApiErrorShape {
  return typeof err === 'object' && err !== null && ('response' in err || 'isAxiosError' in err);
}

/** A raw HTML/error-page dump (proxy error, Django debug page) is never a fit user message. */
function looksLikeMarkup(s: string): boolean {
  return /^\s*<(!doctype|html)/i.test(s) || s.length > 300;
}

/**
 * Pulls a human-readable message out of a DRF error body. Handles the shapes used across
 * this backend: a bare list (`raise ValidationError(detail=str(exc))` serializes as `["mensaje"]`),
 * `{"detail": "..."}`, and per-field serializer errors (`{"field": ["msg"]}`).
 */
function extractMessageFromData(data: unknown): string | null {
  if (typeof data === 'string' && data.trim() && !looksLikeMarkup(data)) return data;

  if (Array.isArray(data) && typeof data[0] === 'string') return data[0];

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === 'string') return obj.detail;

    const firstValue = Object.values(obj)[0];
    if (typeof firstValue === 'string') return firstValue;
    if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') return firstValue[0];
  }

  return null;
}

/**
 * Extracts a specific, user-facing message from a failed API call. Never returns a generic
 * "something went wrong" unless the backend truly gave us nothing to work with — network
 * failures, timeouts and validation/permission errors each get their own distinct message.
 *
 * `fallback` should describe the action that failed (e.g. "No se pudo guardar el plan."),
 * and is only used when neither the backend nor this function can say anything more specific.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!looksLikeApiError(err)) return fallback;

  if (!err.response) {
    return err.isAxiosError ? (err.code === 'ECONNABORTED' ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE) : fallback;
  }

  // 5xx bodies are often a proxy/Django error page rather than a deliberate DRF error —
  // never surface their raw content, even if it happens to parse as a short string.
  if (typeof err.response.status === 'number' && err.response.status >= 500) return SERVER_ERROR_MESSAGE;

  return extractMessageFromData(err.response.data) ?? fallback;
}

/**
 * Same as {@link getApiErrorMessage}, but also unpacks error bodies fetched with
 * `responseType: 'blob'` (file downloads) — axios doesn't parse those into JSON automatically,
 * so the backend's actual validation message would otherwise be lost.
 */
export async function getApiErrorMessageAsync(err: unknown, fallback: string): Promise<string> {
  if (!looksLikeApiError(err)) return fallback;

  if (!err.response) {
    return err.isAxiosError ? (err.code === 'ECONNABORTED' ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE) : fallback;
  }

  if (typeof err.response.status === 'number' && err.response.status >= 500) return SERVER_ERROR_MESSAGE;

  let data: unknown = err.response.data;
  if (data instanceof Blob) {
    if (!data.type.includes('json')) return fallback;
    try {
      data = JSON.parse(await data.text());
    } catch {
      return fallback;
    }
  }

  return extractMessageFromData(data) ?? fallback;
}
