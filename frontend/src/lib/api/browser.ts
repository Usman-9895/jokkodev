'use client';
import { createHttpClient } from '@jokkodev/api-client';
import type { paths } from '@jokkodev/api-client';
export const api = createHttpClient('/api/v1');
export const getLiveness = (signal?: AbortSignal) => api<paths['/api/v1/health/live']['get']['responses'][200]['content']['application/json']>('/health/live', { signal });
