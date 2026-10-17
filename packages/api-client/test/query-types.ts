import type { HttpQuery } from '../src/http';
// Compile-time regressions: query shapes must stay generated and typed.
const questions: HttpQuery = { q: 'sécurité', technology: 'nestjs', status: 'open', page: 1, pageSize: 4 };
const ownProjects: HttpQuery = { role: 'OWNER', page: 2 };
const catalogue: HttpQuery = { q: '', limit: 50 };
// @ts-expect-error unknown parameters are not a dictionary escape hatch
const unknown: HttpQuery = { arbitrary: 'value' };
// @ts-expect-error search remains a string
const wrongSearch: HttpQuery = { q: false };
// @ts-expect-error page remains numeric
const wrongPage: HttpQuery = { page: '2' };
// @ts-expect-error legacy resolved boolean is not a declared parameter
const legacy: HttpQuery = { resolved: false };
// @ts-expect-error statuses must exist in a generated list operation
const wrongStatus: HttpQuery = { status: 'invented' };
void [questions, ownProjects, catalogue, unknown, wrongSearch, wrongPage, legacy, wrongStatus];
