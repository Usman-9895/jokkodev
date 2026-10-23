import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
const root = process.cwd();
// Opt-in dedicated database, never inherit the team's DATABASE_URL. No migration/account creation.
const smokeDatabase = process.env.SMOKE_DATABASE_URL;
if (smokeDatabase) {
  const target = new URL(smokeDatabase);
  assert.equal(decodeURIComponent(target.pathname.slice(1)), process.env.SMOKE_CONFIRM_DATABASE, 'Confirmer la base dédiée du smoke');
}

const frontendPort=Number(process.env.SMOKE_FRONTEND_PORT||3000);
const backendPort=Number(process.env.SMOKE_BACKEND_PORT||3001);
for(const port of [frontendPort,backendPort])assert.ok(Number.isInteger(port)&&port>0&&port<=65535,'Port smoke invalide');
assert.notEqual(frontendPort,backendPort);
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
  for (const port of [frontendPort, backendPort]) {
    const probe = createServer();
    await new Promise((resolve, reject) => {
      probe.once('error', reject);
      probe.listen(port, '127.0.0.1', () => probe.close(resolve));
    });
  }
  // Configuration de production valide ; aucun email envoyé. Base dédiée uniquement sur opt-in.
  const env = { NODE_ENV:'production',DATABASE_URL:smokeDatabase ?? 'postgresql://test:test@127.0.0.1:1/unavailable',PORT:String(backendPort),HOST:'127.0.0.1',TRUST_PROXY:'127.0.0.1',API_INTERNAL_ORIGIN:`http://127.0.0.1:${backendPort}`,APP_ORIGIN:'https://smoke.example.test',CORS_ORIGINS:'https://smoke.example.test',SESSION_COOKIE_SECURE:'true',CSRF_SECRET:randomBytes(32).toString('hex'),MAIL_TRANSPORT:'smtp',MAIL_FROM:'smoke@example.test',SMTP_HOST:'127.0.0.1',SMTP_PORT:'1',SMTP_USER:'',SMTP_PASSWORD:'' };
  const backend = start('dist/src/main.js', path.join(root, 'backend'), env);
  await waitFor(`http://127.0.0.1:${backendPort}/api/v1/health/live`, backend.child);
  const frontend = spawn(process.execPath, ['server.mjs', '--port', String(frontendPort), '--hostname', '127.0.0.1'], { cwd: path.join(root, 'frontend'), env: { ...process.env, ...env }, stdio: 'ignore', windowsHide: true });
  children.push(frontend);
  await waitFor(`http://127.0.0.1:${frontendPort}`, frontend);
  for (const [route, expected] of [['/', 'Accueil'], ['/connexion', 'Connexion'], ['/espace', 'Tableau de bord'], ['/admin', 'Administration']]) {
    const response = await fetch(`http://127.0.0.1:${frontendPort}${route}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(expected));
    if (route === '/espace') {
      assert.ok(html.includes('Vérification de la session'), 'Le rendu initial privé doit attendre la session');
      assert.ok(!html.includes('class="jd-card dashboard-stat"'), 'Aucun compteur privé dans le HTML anonyme');
    }
    console.log(`OK page ${route}`);
  }
  assert.equal((await fetch(`http://127.0.0.1:${frontendPort}/inconnue`)).status, 404);
  for (const preview of ['comptes', 'design-system', 'espace', 'informations', 'jokkohelp', 'jokkohelp-contributions', 'jokkoprojects', 'moderation', 'signalements']) {
    assert.equal((await fetch(`http://127.0.0.1:${frontendPort}/dev/${preview}?state=success`)).status, 404, `Aperçu privé indisponible en production : ${preview}`);
  }
  console.log('OK neuf aperçus indisponibles en production');
  for (const port of [backendPort, frontendPort]) {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/health/live`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    assert.ok(response.headers.get('x-request-id'));
    const ready = await fetch(`http://127.0.0.1:${port}/api/v1/health/ready`);
    assert.equal(ready.status, smokeDatabase ? 200 : 503);
    if (!smokeDatabase) assert.equal((await ready.json()).code, 'SERVICE_UNAVAILABLE');
    console.log(`OK santé et readiness ${smokeDatabase ? 'disponible' : 'indisponible'} via ${port}`);
    const origin = env.APP_ORIGIN;
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/auth/me`)).status, 401);
    const csrf = await fetch(`http://127.0.0.1:${port}/api/v1/auth/csrf`, { headers: { Origin: origin } });
    assert.equal(csrf.status, 200);
    const token = (await csrf.json()).csrfToken;
    assert.equal(typeof token, 'string');
    const cookies = csrf.headers.getSetCookie();
    assert.ok(cookies.length >= 2);
    for (const cookie of cookies) {
      assert.match(cookie, /; Secure/i);
      assert.match(cookie, /; HttpOnly/i);
      assert.match(cookie, /; SameSite=Lax/i);
    }
    const login = `http://127.0.0.1:${port}/api/v1/auth/login`;
    const denied = await fetch(login, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).code, 'CSRF_TOKEN_INVALID');
    const headers = { Origin: origin, 'Content-Type': 'application/json', 'X-CSRF-Token': token, Cookie: cookies.map(c => c.split(';')[0]).join('; ') };
    assert.equal((await fetch(login, { method: 'POST', headers, body: '{}' })).status, 400);
    if (smokeDatabase) {
      let limited;
      const email = `smoke-missing-${randomBytes(12).toString('hex')}@example.test`;
      for (let i = 0; i < 30; i++) {
        limited = await fetch(login, { method: 'POST', headers, body: JSON.stringify({ email, password: 'smoke password deliberately absent' }) });
        if (limited.status === 429) break;
        assert.equal(limited.status, 401);
      }
      assert.equal(limited.status, 429);
      assert.equal((await limited.json()).code, 'RATE_LIMITED');
      assert.match(limited.headers.get('Retry-After') ?? '', /^\d+$/);
      assert.ok(limited.headers.get('Access-Control-Expose-Headers')?.toLowerCase().includes('retry-after'));
      assert.equal(limited.headers.get('Access-Control-Allow-Origin'), origin);
    }
    console.log(`OK session absente, cookies protégés, CSRF et ${smokeDatabase ? '429/CORS' : 'validation'} via ${port}`);
  }
  assert.equal((await fetch(`http://127.0.0.1:${backendPort}/api/docs`)).status, 404);
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
