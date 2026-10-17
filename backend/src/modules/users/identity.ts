/** Règle du pseudonyme : 3 à 30 caractères ASCII, lettres, chiffres et tiret bas. */
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/;

/** Forme stockée de l'email : NFC, sans espaces de bord, en minuscules. Les contraintes de la base imposent la même forme. */
export function normalizeEmail(email: string): string {
  return email.normalize('NFC').trim().toLowerCase();
}

export function usernameKey(username: string): string {
  return username.toLowerCase();
}
