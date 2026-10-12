import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';
import path from 'node:path';
const root = process.cwd();
const children = [];
function start(file, cwd, env) {
  const child = spawn(process.execPath, [file], { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  children.push(child);
  return { child, output: () => output };
}
async function waitFor(url, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error('Serveur arrêté avant le contrôle HTTP.');
    try { const response = await fetch(url); if (response.ok) return; } catch { /* démarrage en cours */ }
    await delay(500);
  }
  throw new Error(`Délai de démarrage dépassé : ${url}`);
}
try {
  for (const port of [3000, 3001]) {
    const probe = createServer();
    await new Promise((resolve, reject) => {
      probe.once('error', reject);
      probe.listen(port, '127.0.0.1', () => probe.close(resolve));
    });
  }
  const env = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/unavailable', PORT: '3001', HOST: '127.0.0.1', API_INTERNAL_ORIGIN: 'http://127.0.0.1:3001' };
  const backend = start('dist/src/main.js', path.join(root, 'backend'), env);
  await waitFor('http://127.0.0.1:3001/api/v1/health/live', backend.child);
  const frontend = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', '3000', '--hostname', '127.0.0.1'], { cwd: path.join(root, 'frontend'), env: { ...process.env, ...env }, stdio: 'ignore', windowsHide: true });
  children.push(frontend);
  await waitFor('http://127.0.0.1:3000', frontend);
  for (const [route, expected] of [['/', 'Apprendre ensemble'], ['/connexion', 'authentification'], ['/espace', 'Espace développeur'], ['/admin', 'Administration']]) {
    const response = await fetch(`http://127.0.0.1:3000${route}`);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes(expected));
    console.log(`OK page ${route}`);
  }
  assert.equal((await fetch('http://127.0.0.1:3000/inconnue')).status, 404);
  for (const port of [3001, 3000]) {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/health/live`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    assert.ok(response.headers.get('x-request-id'));
    const ready = await fetch(`http://127.0.0.1:${port}/api/v1/health/ready`);
    assert.equal(ready.status, 503);
    assert.equal((await ready.json()).code, 'SERVICE_UNAVAILABLE');
    console.log(`OK santé et readiness indisponible via ${port}`);
  }
  assert.equal((await fetch('http://127.0.0.1:3001/api/docs')).status, 404);
  const invalid = start('dist/src/main.js', path.join(root, 'backend'), { DATABASE_URL: 'secret-invalide', PORT: 'invalid' });
  const [code] = await once(invalid.child, 'exit');
  assert.notEqual(code, 0);
  assert.doesNotMatch(invalid.output(), /secret-invalide|stack|postgresql:/);
  console.log('OK Swagger absent en production et configuration invalide rejetée sans secret');
} finally {
  for (const child of children.reverse()) {
    if (child.exitCode !== null) continue;
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    await exited;
  }
  console.log('Serveurs de vérification arrêtés.');
}
