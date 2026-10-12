export class HttpError extends Error {
  readonly kind: 'network' | 'api' | 'protocol' | 'aborted';
  readonly status?: number;
  readonly details?: unknown;
  constructor(kind: HttpError['kind'], message: string, status?: number, details?: unknown) { super(message); this.name = 'HttpError'; this.kind = kind; this.status = status; this.details = details; }
}
export type HttpOptions = Omit<RequestInit, 'cache' | 'credentials'> & { csrfToken?: string };
export function createHttpClient(baseUrl: string, transport: typeof fetch = fetch) {
  return async function request<T>(path: string, options: HttpOptions = {}): Promise<T | undefined> {
    if (!path.startsWith('/') || path.startsWith('//') || /[\\?#]/.test(path) || path.split('/').some(segment => decodeURIComponent(segment) === '..')) {
      throw new HttpError('protocol', 'Chemin API invalide.');
    }
    const { csrfToken, ...init } = options;
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes((init.method ?? 'GET').toUpperCase())) headers.set('X-CSRF-Token', csrfToken);
    let response: Response;
    try { response = await transport(`${baseUrl}${path}`, { ...init, headers, credentials: 'include', cache: 'no-store' }); }
    catch (error) { if (init.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw new HttpError('aborted', 'Requête annulée.'); throw new HttpError('network', 'API inaccessible.'); }
    if (response.status === 204 || response.status === 205 || init.method?.toUpperCase() === 'HEAD') {
      if (!response.ok) throw new HttpError('api', 'La requête a échoué.', response.status);
      return undefined;
    }
    let data: unknown;
    try { data = await response.json(); } catch { if (init.signal?.aborted) throw new HttpError('aborted', 'Requête annulée.'); throw new HttpError('protocol', 'Réponse JSON invalide.', response.status); }
    if (!response.ok) throw new HttpError('api', 'La requête a échoué.', response.status, data);
    return data as T;
  };
}
