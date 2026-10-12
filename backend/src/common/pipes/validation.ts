import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
export function strictValidation(): ValidationPipe {
  return new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, forbidUnknownValues: true, transformOptions: { enableImplicitConversion: false }, validationError: { target: false, value: false }, exceptionFactory(errors: ValidationError[]) {
    const fieldErrors: Record<string, string[]> = {};
    const visit = (items: ValidationError[], prefix = '') => { for (const item of items) { const key = prefix ? `${prefix}.${item.property}` : item.property; if (item.constraints) fieldErrors[key] = Object.keys(item.constraints).map(() => 'Valeur invalide.'); visit(item.children ?? [], key); } };
    visit(errors);
    return new BadRequestException({ code: 'VALIDATION_ERROR', fieldErrors });
  } });
}
