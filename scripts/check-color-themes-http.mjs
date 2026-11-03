import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Explicit loopback target only: this command must never probe the public site.
const port=Number(process.env.THEME_PREVIEW_PORT||3470);
assert.ok(Number.isInteger(port)&&port>0&&port<=65535);
const origin='http://127.0.0.1:'+port;
const expected=readFileSync(new URL('../frontend/public/theme-init.js',import.meta.url),'utf8');
const first=await fetch(origin+'/ressources');
assert.equal(first.status,200);
assert.equal(first.headers.get('x-nextjs-cache'),'HIT');
const html=await first.text();
assert.match(html, /<meta name="color-scheme" content="light"/);
const header=html.slice(html.indexOf('<header'),html.indexOf('</header>'));
assert.ok(header.indexOf('class="public-account"')>=0);
assert.ok(header.indexOf('class="theme-selector"')>header.indexOf('class="public-account"'),
 'Theme selector must follow account actions, including guest sign-up');
assert.match(header, /<button[^>]*class="theme-selector"[^>]*data-mode="light"/);
assert.ok(header.includes('aria-label="Mode clair : activer le mode sombre"'));
assert.ok(!header.includes('value="system"'));
const script=html.indexOf('src="/theme-init.js"');
assert.ok(script>=0&&script<html.indexOf('<body'),'External initialization must precede body content');
assert.ok(!/<script[^>]*src="\/theme-init\.js"[^>]*(?:async|defer)/.test(html));
const enforced=first.headers.get('content-security-policy');
assert.equal(enforced,"base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'");
assert.ok(!enforced.includes('unsafe-inline'));
assert.ok(first.headers.get('content-security-policy-report-only').includes("script-src 'self'"));
assert.ok(first.headers.get('content-security-policy-report-only').includes('report-uri /security/csp-report'));
const second=await fetch(origin+'/ressources',{headers:{Cookie:'jokkodev.theme=dark','X-Request-Id':'untrusted-theme-test'}});
assert.equal(second.status,200);
assert.equal(second.headers.get('x-nextjs-cache'),'HIT');
assert.equal(await second.text(),html,'Cached HTML must not vary with a fictitious theme cookie');
assert.notEqual(second.headers.get('x-request-id'),first.headers.get('x-request-id'));
assert.notEqual(second.headers.get('x-request-id'),'untrusted-theme-test');
assert.ok(!/cookie/i.test(second.headers.get('vary')||''));
const asset=await fetch(origin+'/theme-init.js');
assert.equal(asset.status,200);
assert.equal(await asset.text(),expected);
for(const route of ['/','/connexion','/inscription','/espace','/admin/signalements','/regles','/confidentialite','/contact']){
 const response=await fetch(origin+route);assert.equal(response.status,200,route);
 assert.ok((await response.text()).includes('/theme-init.js'),route+' must share theme initialization');
}
for(const preview of ['comptes','design-system','espace','informations','jokkohelp','jokkohelp-contributions','jokkoprojects','moderation','signalements']){
 assert.equal((await fetch(origin+'/dev/'+preview)).status,404);
}
assert.equal((await fetch(origin+'/theme-missing-page')).status,404);
console.log(JSON.stringify({origin,staticPage:'/ressources',cache:'HIT',sameHtmlDespiteThemeCookie:true,
 freshRequestIds:true,earlyExternalScript:true,assetMatchesSource:true,securityPolicies:'unchanged',
 publicAndProtectedShells:8,privatePreviews404:9,notFound404:true,
 browserHydrationAndVisualInspection:'not verified by this HTTP-only script'},null,2));
