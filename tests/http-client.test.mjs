import test from 'node:test';
import assert from 'node:assert/strict';
import { createHttpClient, HttpError } from '../packages/api-client/src/http.ts';
test('client JSON, cookies, CSRF et absence de cache partagé', async () => {
  const api = createHttpClient('/api/v1', async (url, init) => {
    assert.equal(url, '/api/v1/health/live');
    assert.equal(init.credentials, 'include');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.headers.get('X-CSRF-Token'), 'token');
    return Response.json({ status: 'ok' });
  });
  assert.deepEqual(await api('/health/live', { method: 'POST', csrfToken: 'token' }), { status: 'ok' });
});
test('réponse sans contenu et erreurs distinguées', async () => {
  assert.equal(await createHttpClient('/api/v1', async () => new Response(null, { status: 204 }))('/empty'), undefined);
  for (const [transport, kind] of [
    [async () => { throw new Error('network'); }, 'network'],
    [async () => { throw Object.assign(new Error(), { name: 'AbortError' }); }, 'aborted'],
    [async () => Response.json({ code: 'NOT_FOUND' }, { status: 404 }), 'api'],
    [async () => new Response('invalid JSON'), 'protocol']
  ]) await assert.rejects(createHttpClient('/api/v1', transport)('/test'), error => error instanceof HttpError && error.kind === kind);
});
test('refus des destinations externes et remontées de chemin', async () => {
  const api = createHttpClient('/api/v1', async () => { throw new Error('ne doit pas être appelé'); });
  for (const path of ['//evil.test', '/../admin', '/%2e%2e/admin', '/x\\y']) await assert.rejects(api(path), error => error.kind === 'protocol');
});
