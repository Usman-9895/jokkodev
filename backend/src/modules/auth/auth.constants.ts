export const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 24 * 60 * 60 * 1000;
/** Délai minimal entre deux mises à jour de lastSeenAt, pour éviter une écriture par requête. */
export const SESSION_TOUCH_MS = 5 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export interface CookieNames { session: string; csrf: string; preSession: string }

/** Le préfixe __Host- impose Secure, Path=/ et l'absence de Domain ; il n'est utilisable qu'en HTTPS. */
export function cookieNames(secure: boolean): CookieNames {
  const prefix = secure ? '__Host-' : '';
  return { session: `${prefix}jokkodev_session`, csrf: `${prefix}jokkodev_csrf`, preSession: `${prefix}jokkodev_pre` };
}
