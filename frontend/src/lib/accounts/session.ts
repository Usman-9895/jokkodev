import { createHttpClient, HttpError } from '@jokkodev/api-client/http';
import type { components } from '@jokkodev/api-client';
import type { HttpQuery } from '@jokkodev/api-client/http';
type Schemas = components['schemas'];
export type CurrentUser = Schemas['CurrentUserDto'];
export type OwnProfile = Schemas['OwnProfileDto'];
export type PublicProfile = Schemas['PublicProfileDto'];
export type Technology = Schemas['TechnologyDto'];
export type ProfileUpdate = Schemas['UpdateProfileDto'];
export type SessionState = { phase: 'loading' | 'guest' | 'authenticated' | 'unavailable'; user: CurrentUser | null; revision: number; draftOwnerId:string|null; identityEpoch:number };
export type ApiFailure = { message: string; code?: string; fields: Record<string,string>; retryAfterSeconds?: number };
export function apiFailure(error: unknown): ApiFailure {
  if (!(error instanceof HttpError)) return { message: 'Impossible de terminer la demande. Réessaie explicitement.', fields: {} };
  const details = error.details && typeof error.details === 'object' ? error.details as Partial<Schemas['ApiErrorDto']> : {};
  const fields: Record<string,string> = {};
  for (const [name, messages] of Object.entries(details.fieldErrors ?? {})) if (Array.isArray(messages)) fields[name] = messages.join(' ');
  const messages: Record<string,string> = {
    INVALID_CREDENTIALS: 'Adresse email ou mot de passe incorrect.', ACCOUNT_SUSPENDED: 'Ce compte est suspendu.',
    CSRF_TOKEN_INVALID: 'Le jeton de sécurité est absent ou a expiré. Vérifie ta saisie puis envoie à nouveau le formulaire.',
    CSRF_ORIGIN_REJECTED: 'Cette origine n’est pas autorisée. Vérifie l’adresse du site.',
    TOKEN_INVALID: 'Ce lien est invalide, expiré ou déjà utilisé.', EMAIL_TAKEN: 'Cette adresse email est déjà utilisée.',
    USERNAME_TAKEN: 'Ce pseudonyme est déjà utilisé.', UNAUTHORIZED: 'Ta session a expiré. Reconnecte-toi.', RATE_LIMITED: 'Trop de tentatives. Patiente avant de réessayer.',
  };
  return { message: messages[details.code ?? ''] ?? (error.kind === 'network' ? 'Le serveur est inaccessible. Ta saisie est conservée.' : details.message ?? 'La demande n’a pas abouti.'), code: details.code, fields, retryAfterSeconds: error.retryAfterSeconds };
}
/** One instance per mounted provider, never a server singleton. No token/password persistence or private response cache. */
export class AccountClient {
  private csrfToken?: string;
  private csrfPending?: Promise<string>;
  private csrfVersion = 0;
  private refreshing?: Promise<void>;
  private initialState: SessionState = { phase: 'loading', user: null, revision: 0, draftOwnerId:null, identityEpoch:0 };
  private state: SessionState = this.initialState;
  private listeners = new Set<() => void>();
  private request: ReturnType<typeof createHttpClient>;
  constructor(base = '/api/v1', transport: typeof fetch = fetch) { this.request = createHttpClient(base, transport); }
  snapshot = () => this.state;
  // Hydrating a newly mounted header/gate must use the same anonymous snapshot as server HTML.
  serverSnapshot = () => this.initialState;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  onSessionChange?:()=>void;
  private publish(phase: SessionState['phase'], user: CurrentUser | null, invalidate = false, offlineDraft=false) {
    // Only an already-open editor may keep its owner capability during a network outage.
    // Public/private readers still lose user and revision as before. This is never persisted.
    const draftOwnerId=phase==='authenticated'?user?.id??null:offlineDraft?this.state.draftOwnerId:null;
    this.state = { phase, user, revision: this.state.revision + (invalidate ? 1 : 0),draftOwnerId,
      identityEpoch:this.state.identityEpoch+(draftOwnerId!==this.state.draftOwnerId?1:0) }; this.listeners.forEach(listener => listener());
  }
  async reverify(){
    const pending=this.refreshing;this.forgetCsrf();this.publish('loading',null,true);
    if(pending)await pending;
    await this.refresh();
  }
  private forgetCsrf() { this.csrfVersion++; this.csrfToken = undefined; this.csrfPending = undefined; }
  async csrf(): Promise<string> {
    if (this.csrfToken) return this.csrfToken;
    if (this.csrfPending) return this.csrfPending;
    const version = this.csrfVersion;
    const pending = this.request<Schemas['CsrfTokenDto']>('/auth/csrf').then(result => {
      if (!result?.csrfToken) throw new HttpError('protocol', 'Jeton CSRF absent.');
      if (version === this.csrfVersion) this.csrfToken = result.csrfToken;
      return result.csrfToken;
    }).finally(() => { if (version === this.csrfVersion) this.csrfPending = undefined; });
    this.csrfPending = pending; return pending;
  }
  refresh(): Promise<void> {
    if (this.refreshing) return this.refreshing;
    const revision = this.state.revision;
    this.refreshing = this.request<CurrentUser>('/auth/me').then(user => {
      if (revision === this.state.revision) this.publish(user ? 'authenticated' : 'guest', user ?? null, this.state.user?.id !== user?.id || this.state.user?.role !== user?.role);
    }).catch(error => {
      if (revision !== this.state.revision) return;
      this.forgetCsrf();
      const phase = error instanceof HttpError && [401,403].includes(error.status ?? 0) ? 'guest' : 'unavailable';
      // A repeated anonymous check must not invalidate otherwise unchanged public content during a click/focus.
      const hadOwner=!!this.state.draftOwnerId;
      const offline=error instanceof HttpError&&(error.kind==='network'||(error.status??0)>=500);
      this.publish(phase, null, this.state.phase !== phase || this.state.user !== null,offline);
      if(hadOwner&&!offline)this.onSessionChange?.();
    }).finally(() => { this.refreshing = undefined; });
    return this.refreshing;
  }
  async read<T>(path: string, signal?: AbortSignal, privateData = false, query?: HttpQuery): Promise<T> {
    const revision = this.state.revision;
    try {
      const value = await this.request<T>(path, { signal, query });
      if (privateData && (revision !== this.state.revision || this.state.phase !== 'authenticated')) throw new HttpError('aborted', 'Lecture privée périmée.');
      if (value === undefined) throw new HttpError('protocol', 'Réponse attendue absente.');
      return value;
    } catch (error) { if (privateData) this.expire(error); throw error; }
  }
  private expire(error: unknown) {
    if (error instanceof HttpError && (error.status === 401 || error.status === 403 && apiFailure(error).code === 'ACCOUNT_SUSPENDED')) {
      this.forgetCsrf(); this.publish('guest', null, true);this.onSessionChange?.();
    }
  }
  async mutate<T>(path: string, body?: unknown, method = 'POST', privateData = false, signal?:AbortSignal): Promise<T | undefined> {
    const revision = this.state.revision;
    try { const multipart=typeof FormData!=='undefined'&&body instanceof FormData;const csrfToken=await this.csrf();
      if(privateData&&(revision!==this.state.revision||this.state.phase!=='authenticated'))throw new HttpError('aborted','Identité modifiée avant l’envoi.');
      const value = await this.request<T>(path, { method, signal, csrfToken, headers: multipart?undefined:{ 'Content-Type': 'application/json' }, body: multipart?body:body === undefined ? undefined : JSON.stringify(body) });
      if (privateData && (revision !== this.state.revision || this.state.phase !== 'authenticated')) throw new HttpError('aborted', 'Résultat privé périmé.');
      return value; }
    catch (error) {
      if (apiFailure(error).code === 'CSRF_TOKEN_INVALID') { this.forgetCsrf(); await this.csrf().catch(() => undefined); }
      if (privateData) this.expire(error);
      throw error; // Never replay a mutation, including CSRF errors.
    }
  }
  async authenticate(kind: 'login' | 'register', input: Schemas['LoginDto'] | Schemas['RegisterDto']) {
    const result = await this.mutate<Schemas['AuthResultDto']>('/auth/' + kind, input);
    if (!result?.user || !result.csrfToken) throw new HttpError('protocol', 'Réponse de connexion incomplète.');
    this.forgetCsrf(); this.csrfToken = result.csrfToken; this.publish('authenticated', result.user, true);this.onSessionChange?.();
    return result.user;
  }
  async finishGoogle(kind:'register'|'link',input:Schemas['GoogleRegisterDto']|Schemas['GoogleLinkDto']){
    return this.finishExternal('google',kind,input);
  }
  async finishExternal(provider:'google'|'github',kind:'register'|'link',input:Schemas['GoogleRegisterDto']|Schemas['GoogleLinkDto']){
    const result=await this.mutate<Schemas['AuthResultDto']>('/auth/'+provider+'/'+kind,input,'POST',kind==='link');
    if(!result?.user||!result.csrfToken)throw new HttpError('protocol','Réponse de connexion incomplète.');
    this.forgetCsrf();this.csrfToken=result.csrfToken;this.publish('authenticated',result.user,true);this.onSessionChange?.();
    return result.user;
  }
  async logout() {
    this.publish('loading', null, true); // Hide and unmount private views before waiting for the network.
    this.onSessionChange?.();
    try { await this.mutate('/auth/logout'); this.forgetCsrf(); this.publish('guest', null);this.onSessionChange?.(); await this.csrf(); }
    catch (error) { this.publish('unavailable', null, true); throw error; }
  }
  async reset(input: Schemas['ResetPasswordDto']) {
    await this.mutate('/auth/reset-password', input);
    this.forgetCsrf(); this.publish('guest', null, true);this.onSessionChange?.(); await this.csrf().catch(() => undefined);
  }
}
