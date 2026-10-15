/** Présentation de démonstration, jamais un contrat API ou une session. */
export const applicationStates = ['pending', 'accepted', 'refused', 'withdrawn'] as const;
export type DemoApplicationStatus = typeof applicationStates[number];
export type DemoPerspective = 'eligible' | 'visitor' | 'pending' | 'member' | 'owner' | 'closed' | 'administrator' | 'expired';
export function parseApplicationFilter(value: unknown): DemoApplicationStatus | 'all' {
  return typeof value === 'string' && applicationStates.includes(value as DemoApplicationStatus) ? value as DemoApplicationStatus : 'all';
}
export function selectApplicationExamples<T extends {status: DemoApplicationStatus}>(examples: readonly T[], filter: DemoApplicationStatus | 'all') {
  return examples.filter(item => filter === 'all' || item.status === filter);
}
export function canDemonstrateDecision(perspective: DemoPerspective, status: DemoApplicationStatus, busy: boolean) {
  return perspective === 'owner' && status === 'pending' && !busy;
}
export function canDemonstrateApplication(perspective: DemoPerspective, busy: boolean) {
  return perspective === 'eligible' && !busy;
}
export function validateApplicationMessage(message: string) {
  return message.trim() ? undefined : 'Explique ce que tu souhaites apporter au projet.';
}
export const statusLabels: Record<DemoApplicationStatus, string> = {pending:'En attente', accepted:'Acceptée', refused:'Refusée', withdrawn:'Retirée'};
export function developerPreviewHref(view: string, parameters: Record<string, string> = {}) {
  const query = new URLSearchParams({view, ...parameters});
  return '/dev/espace?' + query.toString();
}
export type DemoDecisionResult = 'success' | 'error' | 'conflict' | 'expired';
export function applyDemoDecision(status: DemoApplicationStatus, decision: 'accepted' | 'refused', outcome: DemoDecisionResult): DemoApplicationStatus {
  // Un conflit ou une erreur ne peut produire un succès ni une adhésion fictive.
  return status === 'pending' && outcome === 'success' ? decision : status;
}
