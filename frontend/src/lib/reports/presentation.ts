/** Types de présentation fictifs, sans contrat API ou permission serveur. */
export type ReportTargetKind = 'question' | 'answer' | 'project';
export type DemoReportStatus = 'open' | 'closed';
export type DemoModerationAction = 'close' | 'hide' | 'suspend';
export type DemoModerationRole = 'administrator' | 'developer' | 'visitor' | 'expired';
export type DemoModerationOutcome = 'success' | 'error' | 'conflict' | 'expired' | 'denied';
export type ReportCriteria = {status: 'all' | DemoReportStatus; page: number};
export type ReportSearch = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
export function parseReportCriteria(search: ReportSearch): ReportCriteria {
  const status = one(search.status), raw = one(search.page) ?? '1', number = Number(raw);
  return {status: status === 'open' || status === 'closed' ? status : 'all', page: /^\d+$/.test(raw) && Number.isSafeInteger(number) && number > 0 ? number : 1};
}
export function selectReportExamples<T extends {status: DemoReportStatus}>(examples: readonly T[], criteria: ReportCriteria) {
  const filtered = examples.filter(item => criteria.status === 'all' || item.status === criteria.status);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 4)), page = Math.min(criteria.page, totalPages);
  return {data: filtered.slice((page - 1) * 4, page * 4), meta: {page, totalPages, total: filtered.length, sourceEmpty: examples.length === 0}};
}
export function moderationHref(criteria: ReportCriteria, context: Record<string, string> = {}) {
  const params = new URLSearchParams(context);
  if (criteria.status !== 'all') params.set('status', criteria.status);
  if (criteria.page > 1) params.set('page', String(criteria.page));
  return '/dev/moderation' + (params.size ? '?' + params.toString() : '');
}
export function reportEntryHref(kind: ReportTargetKind, id: string) {
  return '/signalements?' + new URLSearchParams({type: kind, target: id});
}
export function validateReportReason(reason: string) {
  return reason.trim() ? undefined : 'Explique le motif du signalement.';
}
export function validateModerationDecision(action: string, reason: string) {
  const errors: Record<string, string> = {};
  if (!['close', 'hide', 'suspend'].includes(action)) errors.action = 'Choisis une décision.';
  if (!reason.trim()) errors.reason = 'Indique le motif de la décision.';
  return errors;
}
export function canDemonstrateModeration(role: DemoModerationRole, status: DemoReportStatus, busy: boolean) {
  return role === 'administrator' && status === 'open' && !busy;
}
export type DemoEffects = {status: DemoReportStatus; contentHidden: boolean; accountSuspended: boolean};
export function simulateModerationEffect(effects: DemoEffects, action: DemoModerationAction, outcome: DemoModerationOutcome): DemoEffects {
  if (outcome !== 'success' || effects.status !== 'open') return {...effects};
  return {...effects, ...(action === 'close' ? {status: 'closed' as const} : action === 'hide' ? {contentHidden: true} : {accountSuspended: true})};
}
export const targetLabels: Record<ReportTargetKind, string> = {question: 'Question', answer: 'Réponse', project: 'Projet'};
export const actionLabels: Record<DemoModerationAction, string> = {close: 'Clôturer sans action', hide: 'Masquer le contenu', suspend: 'Suspendre le compte auteur'};
