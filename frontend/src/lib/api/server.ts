import 'server-only';
import { createHttpClient } from '@jokkodev/api-client';
import type { paths } from '@jokkodev/api-client';
import { apiInternalOrigin } from '../config/server';
// Les futurs appels privés devront transmettre explicitement le cookie de la requête entrante.
export const serverApi = createHttpClient(`${apiInternalOrigin}/api/v1`);
export const getServerLiveness = () => serverApi<paths['/api/v1/health/live']['get']['responses'][200]['content']['application/json']>('/health/live');
