import test from 'node:test';
import assert from 'node:assert/strict';
import { createHttpClient, HttpError } from '../packages/api-client/src/http.ts';

test('list query encodes values independently from the safe path and preserves empty/zero', async () => {
  let calls = 0;
  const api = createHttpClient('/api/v1', async (url, init) => {
    calls++;
    const parsed = new URL(url, 'https://example.test');
    assert.equal(parsed.pathname, '/api/v1/questions');
    assert.deepEqual(Object.fromEntries(parsed.searchParams), { q: 'sécurité %_ &/?#', technology: 'Node.js', status: 'open', page: '0', pageSize: '4' });
    assert.equal('query' in init, false);
    return Response.json({ data: [] });
  });
  await api('/questions', { query: { q: 'sécurité %_ &/?#', technology: 'Node.js', status: 'open', page: 0, pageSize: 4 } });
  assert.equal(calls, 1); // page=0 is serialized, then rejected by the server's contract, never silently omitted.
  await createHttpClient('/api/v1', async url => {
    assert.equal(url, '/api/v1/projects?q='); return Response.json({});
  })('/projects', { query: { q: '', technology: undefined } });
});

test('encoded separators, malformed encoding and inline query cannot bypass path validation', async () => {
  let calls = 0;
  const api = createHttpClient('/api/v1', async () => { calls++; return Response.json({}); });
  for (const path of ['/questions?q=x', '/%2f%2fevil.test', '/x%2f..%2fadmin', '/bad%', '/x%5cy']) {
    await assert.rejects(api(path), error => error instanceof HttpError && error.kind === 'protocol');
  }
  assert.equal(calls, 0);
});

for (const [header, expected] of [['120', 120], ['0', 0], [undefined, undefined], ['invalid', undefined], ['-1', undefined], ['1.5', undefined]]) {
  test(`429 preserves errors and only valid Retry-After (${header})`, async () => {
    let calls = 0;
    const details = { code: 'RATE_LIMITED', fieldErrors: { email: ['example'] }, requestId: 'request-fixture' };
    const api = createHttpClient('/api/v1', async () => {
      calls++; return Response.json(details, { status: 429, headers: header === undefined ? {} : { 'Retry-After': header, 'Set-Cookie': 'private=fixture' } });
    });
    await assert.rejects(api('/auth/login', { method: 'POST' }), error => {
      assert.equal(error.status, 429); assert.deepEqual(error.details, details);
      assert.equal(error.retryAfterSeconds, expected); assert.equal(error.headers, undefined); return true;
    });
    assert.equal(calls, 1);
  });
}
test('HTTP-date Retry-After is supported without inventing a missing delay', async () => {
  const future = new Date(Date.now() + 120_000).toUTCString();
  await assert.rejects(createHttpClient('/api/v1', async () => Response.json({}, { status: 429, headers: { 'Retry-After': future } }))('/test'), error => error.retryAfterSeconds >= 119 && error.retryAfterSeconds <= 120);
});
