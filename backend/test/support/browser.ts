/* eslint-disable @typescript-eslint/no-explicit-any -- corps JSON dynamiques, vérifiés par les assertions des tests */
import { APP_ORIGIN } from './app';

export interface ApiResponse<T = any> { status: number; body: T; headers: Headers }

let nextClient = 0;

/** Navigateur minimal : conserve les cookies, envoie Origin et le jeton CSRF comme le ferait le frontend.
 * Chaque instance a sa propre IP cliente, transmise par le relais de confiance 127.0.0.1 (TRUST_PROXY). */
export class Browser {
  readonly cookies = new Map<string, string>();
  readonly ip = `10.0.${Math.floor(++nextClient / 250)}.${nextClient % 250 + 1}`;
  csrfToken?: string;

  constructor(private readonly api: string, private readonly origin: string | null = APP_ORIGIN) {}

  async csrf(): Promise<string> {
    const response = await this.request<{ csrfToken: string }>('GET', '/auth/csrf');
    this.csrfToken = response.body.csrfToken;
    return this.csrfToken;
  }

  get<T = any>(path: string) { return this.request<T>('GET', path); }
  post<T = any>(path: string, body?: unknown) { return this.mutate<T>('POST', path, body); }
  put<T = any>(path: string, body?: unknown) { return this.mutate<T>('PUT', path, body); }
  patch<T = any>(path: string, body?: unknown) { return this.mutate<T>('PATCH', path, body); }
  delete<T = any>(path: string) { return this.mutate<T>('DELETE', path); }

  async mutate<T = any>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<ApiResponse<T>> {
    if (!this.csrfToken) await this.csrf();
    const response = await this.request<T & { csrfToken?: string }>(method, path, body, { 'X-CSRF-Token': this.csrfToken ?? '', ...headers });
    if (typeof response.body?.csrfToken === 'string') this.csrfToken = response.body.csrfToken;
    return response;
  }

  async request<T = any>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<ApiResponse<T>> {
    const all: Record<string, string> = { 'X-Forwarded-For': this.ip, ...headers };
    if (this.origin) all.Origin = this.origin;
    if (this.cookies.size) all.Cookie = [...this.cookies].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ');
    if (body !== undefined) all['Content-Type'] = 'application/json';
    const response = await fetch(`${this.api}${path}`, { method, headers: all, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair, ...attributes] = cookie.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index).trim();
      const value = decodeURIComponent(pair.slice(index + 1).trim());
      const expired = attributes.some(a => /^\s*expires=Thu, 01 Jan 1970/i.test(a)) || value === '';
      if (expired) this.cookies.delete(name); else this.cookies.set(name, value);
    }
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : undefined, headers: response.headers } as ApiResponse<T>;
  }
}
