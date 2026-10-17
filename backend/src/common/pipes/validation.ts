import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

// Messages génériques par type de contrainte : ils guident la correction sans jamais refléter la valeur saisie.
const messages: Record<string, string> = {
  whitelistValidation: 'Champ non autorisé.', isDefined: 'Champ obligatoire.', isNotEmpty: 'Champ obligatoire.',
  isString: 'Texte attendu.', isInt: 'Nombre entier attendu.', isBoolean: 'Booléen attendu.', isArray: 'Liste attendue.', isUUID: 'Identifiant invalide.',
  isEmail: 'Adresse email invalide.', isIn: 'Valeur non autorisée.', isEnum: 'Valeur non autorisée.', matches: 'Format invalide.', isUrl: 'Adresse HTTPS invalide.',
  minLength: 'Texte trop court.', maxLength: 'Texte trop long.', min: 'Valeur trop petite.', max: 'Valeur trop grande.',
  arrayMinSize: 'Pas assez d’éléments.', arrayMaxSize: 'Trop d’éléments.', arrayUnique: 'Éléments en double.', isISO31661Alpha2: 'Code pays invalide.'
};

export function strictValidation(): ValidationPipe {
  return new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, forbidUnknownValues: true, transformOptions: { enableImplicitConversion: false }, validationError: { target: false, value: false }, exceptionFactory(errors: ValidationError[]) {
    const fieldErrors: Record<string, string[]> = {};
    const visit = (items: ValidationError[], prefix = '') => { for (const item of items) { const key = prefix ? `${prefix}.${item.property}` : item.property; if (item.constraints) fieldErrors[key] = [...new Set(Object.keys(item.constraints).map(name => messages[name] ?? 'Valeur invalide.'))]; visit(item.children ?? [], key); } };
    visit(errors);
    return new BadRequestException({ code: 'VALIDATION_ERROR', fieldErrors });
  } });
}
