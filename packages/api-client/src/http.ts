export class HttpError extends Error {
  readonly kind: 'network' | 'api' | 'protocol' | 'aborted';
  readonly status?: number;
  readonly details?: unknown;
  /** Server-provided delay in seconds; absent for missing/invalid Retry-After. No automatic retry. */
  readonly retryAfterSeconds?: number;
  constructor(kind: HttpError['kind'], message: string, status?: number, details?: unknown, retryAfterSeconds?: number) { super(message); this.name = 'HttpError'; this.kind = kind; this.status = status; this.details = details; this.retryAfterSeconds = retryAfterSeconds; }
}
import type { paths } from './schema';
/** Query shapes come exclusively from generated operations, never a handwritten endpoint contract. */
type Operation = { [P in keyof paths]: paths[P][keyof paths[P]] }[keyof paths];
type QueryOf<T> = T extends { parameters: { query?: infer Q } } ? NonNullable<Q> : never;
export type HttpQuery = QueryOf<Operation>;
export type HttpOptions = Omit<RequestInit, 'cache' | 'credentials'> & { csrfToken?: string; query?: HttpQuery };
function retryAfter(response: Response): number | undefined {
  const value = response.headers.get('Retry-After')?.trim();
  if (!value) return undefined;
  if (/^\d+$/.test(value)) { const seconds = Number(value); return Number.isSafeInteger(seconds) ? seconds : undefined; }
  // Only accept the standard HTTP-date form, rather than Date.parse's permissive numeric formats.
  if (!/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)) return undefined;
  const date = Date.parse(value);
  return Number.isFinite(date) && new Date(date).toUTCString() === value ? Math.max(0, Math.ceil((date - Date.now()) / 1000)) : undefined;
}
export function createHttpClient(baseUrl: string, transport: typeof fetch = fetch) {
  return async function request<T>(path: string, options: HttpOptions = {}): Promise<T | undefined> {
    let decoded: string;
    try { decoded = decodeURIComponent(path); } catch { throw new HttpError('protocol', 'Chemin API invalide.'); }
    if (!path.startsWith('/') || decoded.startsWith('//') || /[\\?#]/.test(decoded) || decoded.split('/').some(segment => segment === '..' || segment === '.')) {
      throw new HttpError('protocol', 'Chemin API invalide.');
    }
    const { csrfToken, query, ...init } = options;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) params.set(key, String(value));
    }
    const suffix = params.size ? `?${params.toString()}` : '';
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes((init.method ?? 'GET').toUpperCase())) headers.set('X-CSRF-Token', csrfToken);
    let response: Response;
    try { response = await transport(`${baseUrl}${path}${suffix}`, { ...init, headers, credentials: 'include', cache: 'no-store' }); }
    catch (error) { if (init.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw new HttpError('aborted', 'Requête annulée.'); throw new HttpError('network', 'API inaccessible.'); }
    if (response.status === 204 || response.status === 205 || init.method?.toUpperCase() === 'HEAD') {
      if (!response.ok) throw new HttpError('api', 'La requête a échoué.', response.status, undefined, retryAfter(response));
      return undefined;
    }
    let data: unknown;
    try { data = await response.json(); } catch { if (init.signal?.aborted) throw new HttpError('aborted', 'Requête annulée.'); throw new HttpError('protocol', 'Réponse JSON invalide.', response.status, undefined, retryAfter(response)); }
    if (!response.ok) throw new HttpError('api', 'La requête a échoué.', response.status, data, retryAfter(response));
    return data as T;
  };
}
