import { registerDecorator, type ValidationOptions } from 'class-validator';

export const MAX_URL_LENGTH = 2048;

/** URL HTTPS absolue, sans identifiants ni espaces, avec un nom d'hôte qualifié. */
export function isPublicHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH || /\s/.test(value) || [...value].some(char => char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && url.hostname.includes('.') && !url.hostname.endsWith('.');
  } catch { return false; }
}

export function IsPublicHttpsUrl(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => registerDecorator({ name: 'isUrl', target: target.constructor, propertyName: propertyName as string, options, validator: { validate: isPublicHttpsUrl } });
}

/** Texte contenant au moins un caractère visible (les espaces seuls ne suffisent pas). */
export function HasText(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => registerDecorator({ name: 'isNotEmpty', target: target.constructor, propertyName: propertyName as string, options, validator: { validate: (value: unknown) => typeof value === 'string' && /\S/.test(value) } });
}
