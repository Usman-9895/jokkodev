// Revue HTTP/DOM et captures réelles, sans dépendance de test ajoutée.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Buffer } from 'node:buffer';

const root = process.cwd();
const port = Number(process.env.ACCOUNTS_REVIEW_PORT || 3000);
const origin = `http://localhost:${port}`;
const artifact = path.join(root, '.cache/design-system/lot-4');
const chromePath = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(file => fs.existsSync(file));
if (!chromePath) throw Error('Chrome/Chromium manque. Définir CHROME_PATH vers un navigateur installé ; aucune installation automatique.');
fs.mkdirSync(artifact, { recursive: true });
const processes = [], reports = [];
function launch(executable, args, cwd = root) {
  const child = spawn(executable, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let log = '';
  child.stdout.on('data', value => log += value);
  child.stderr.on('data', value => log += value);
  processes.push(child);
  return { child, log: () => log };
}
function stop(child) {
  if (child.exitCode === null && child.signalCode === null) {
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    else child.kill('SIGTERM');
  }
}
async function waitHttp(url) {
  for (let i = 0; i < 120; i++) {
    try { const result = await fetch(url, { signal: AbortSignal.timeout(1500) }); if (result.ok) return; } catch { /* Attendre le démarrage. */ }
    await delay(500);
  }
  throw Error('Démarrage indisponible : ' + url);
}
let socket;
try {
  // Ne pas utiliser ni arrêter un serveur qui appartient à l’utilisateur.
  for (const checkedPort of [port, 9223].filter(value => value !== port || process.env.ACCOUNTS_REVIEW_REUSE !== '1')) {
    try { await fetch(`http://127.0.0.1:${checkedPort}`, { signal: AbortSignal.timeout(500) }); throw Error(`Port ${checkedPort} occupé ; libérer ce port avant la revue.`); }
    catch (error) { if (error.message.includes('occupé')) throw error; }
  }
  const server = process.env.ACCOUNTS_REVIEW_REUSE === '1' ? null : launch(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', String(port), '--hostname', '127.0.0.1'], path.join(root, 'frontend'));
  await waitHttp(origin);
  launch(chromePath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=9223', `--user-data-dir=${path.join(artifact, 'browser-profile')}`, 'about:blank']);
  await waitHttp('http://127.0.0.1:9223/json/version');
  const tabs = await (await fetch('http://127.0.0.1:9223/json/list')).json();
  socket = new globalThis.WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map(), errors = [], apiRequests = [], videoFrames = [];
  socket.addEventListener('message', event => {
    const result = JSON.parse(event.data);
    if (result.id) { const task = pending.get(result.id); if (task) { pending.delete(result.id); if (result.error) task.reject(Error(JSON.stringify(result.error))); else task.resolve(result.result); } }
    else if (result.method === 'Runtime.exceptionThrown') errors.push(result.params.exceptionDetails.text);
    else if (result.method === 'Network.requestWillBeSent' && result.params.request.url.includes('/api/v1')) apiRequests.push(result.params.request.url);
    else if (result.method === 'Page.screencastFrame') { videoFrames.push({ data: result.params.data, timestamp: result.params.metadata.timestamp }); send('Page.screencastFrameAck', { sessionId: result.params.sessionId }).catch(() => {}); }
  });
  function send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); }); }
  async function evaluate(expression) { let result; for(let attempt=0;attempt<10;attempt++){try{result=await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 15000 });break;}catch(error){if(!/navigated|context.*destroyed/i.test(error.message)||attempt===9)throw error;await delay(100);}} if (result.exceptionDetails) throw Error(result.exceptionDetails.text); return result.result.value; }
  async function key(key, virtual, modifiers = 0) { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code: key, windowsVirtualKeyCode: virtual, modifiers, ...(type === 'keyDown' && key === 'Enter' ? { text: '\r' } : {}) }); }
  async function click(selector) {
    const point = await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
  }
  async function capture(filename, full = false) {
    await delay(200);
    const metrics = await send('Page.getLayoutMetrics');
    const size = metrics.cssContentSize;
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, ...(full ? { clip: { x: 0, y: 0, width: size.width, height: size.height, scale: 1 } } : {}) });
    fs.writeFileSync(path.join(artifact, filename), Buffer.from(result.data, 'base64'));
  }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const browser=await send('Browser.getVersion');
  async function load(route,width=390,height=844){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:origin+route});await delay(300);
    for(let i=0;i<150;i++){if(await evaluate("document.readyState==='complete'&&Boolean(document.querySelector('#contenu h1'))"))break;await delay(100);}
    await evaluate("(async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,8000))]);await Promise.race([Promise.all(Array.from(document.images).filter(i=>i.getClientRects().length).map(i=>i.decode())),new Promise(r=>setTimeout(r,8000))]);const p=document.querySelector('nextjs-portal');if(p)p.style.display='none'})()");await delay(400);
  }
  async function widthCheck(){assert.equal(await evaluate('document.documentElement.scrollWidth'),await evaluate('document.documentElement.clientWidth'),'Débordement de page');}
  async function routeWait(path){for(let i=0;i<100;i++){if((await evaluate('location.pathname'))===path)return;await delay(100);}throw Error('Navigation non terminée : '+path);}
  const views=[['/connexion','login'],['/inscription','register'],['/mot-de-passe-oublie','forgot'],['/nouveau-mot-de-passe','reset'],['/verification-email','verify'],['/dev/comptes?view=profile','profile'],['/dev/comptes?view=edit','edit']];
  for(const [width,height] of [[1440,1000],[768,1024],[390,844],[320,800]]){
    for(const [route,name] of views){
      await load(route,width,height);await widthCheck();
      const data=await evaluate("({fonts:Array.from(document.fonts).map(f=>({family:f.family,status:f.status})),images:Array.from(document.images).filter(i=>i.getClientRects().length).every(i=>i.naturalWidth>0),headerCount:document.querySelectorAll('.public-header').length})");
      assert.ok(data.images);assert.ok(data.fonts.some(f=>f.family==='inter'&&f.status==='loaded'));assert.ok(data.fonts.some(f=>f.family==='sourceSerif'&&f.status==='loaded'));assert.equal(data.headerCount,1);
      if(!route.startsWith('/dev'))assert.equal(await evaluate("Array.from(document.querySelectorAll('.account-card button')).filter(b=>!b.disabled&&!b.classList.contains('account-password-toggle')).length"),0);
      await capture(name+'-'+width+'.png',true);reports.push({name,width,height,...data});
    }
    console.log('Comptes et profils contrôlés : '+width+'px');
  }
  await load('/connexion',390,844);await click('#account-password');await send('Input.insertText',{text:'Phrase de démonstration uniquement'});
  assert.equal(await evaluate("document.querySelector('#account-password').autocomplete"),'current-password');
  await click('.account-password-toggle');assert.equal(await evaluate("document.querySelector('#account-password').type"),'text');assert.equal(await evaluate("document.querySelector('.account-password-toggle').getAttribute('aria-pressed')"),'true');
  await click('.account-password-toggle');assert.equal(await evaluate("document.querySelector('#account-password').type"),'password');
  await evaluate("document.querySelector('#account-email').focus()");await key('Tab',9);await key('Tab',9,8);assert.equal(await evaluate('document.activeElement.id'),'account-email');assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineWidth'),'2px');
  await evaluate("document.querySelector('#account-password').value=''");await capture('login-focus-390.png');
  await click('.account-secondary a');await routeWait('/inscription');assert.equal(await evaluate("document.querySelector('#account-password').autocomplete"),'new-password');
  await load('/dev/comptes?view=register');
  await click('.account-card button[type=submit]');await delay(150);assert.equal(await evaluate('document.activeElement.className'),'account-error-summary');assert.equal(await evaluate('document.querySelectorAll("[aria-invalid=true]").length'),4);await capture('register-validation-390.png',true);
  await click('#account-pseudonym');await send('Input.insertText',{text:'demo_local'});await click('#account-email');await send('Input.insertText',{text:'demo@example.com'});await click('#account-password');await send('Input.insertText',{text:'fictif'});await click('#account-confirmation');await send('Input.insertText',{text:'différent'});await click('.account-card button[type=submit]');await delay(150);assert.equal(await evaluate("document.querySelector('#account-confirmation').getAttribute('aria-invalid')"),'true');assert.equal(await evaluate("document.querySelector('#account-password').value"),'fictif');
  await evaluate("document.querySelector('#account-confirmation').value='fictif'");await click('.account-card button[type=submit]');await delay(150);assert.ok((await evaluate("document.querySelector('.account-card [role=status]').textContent")).includes('aucun compte'));assert.equal(await evaluate('location.pathname'),'/dev/comptes');
  for(const [view,state] of [['register','sending'],['verify','sending'],['login','error'],['forgot','success'],['reset','success'],['reset','missing'],['reset','invalid'],['reset','expired'],['reset','used'],['verify','success'],['verify','pending'],['verify','expired'],['login','session-expired'],['login','limited']]){
    await load('/dev/comptes?view='+view+'&state='+state);await widthCheck();await capture(view+'-'+state+'-390.png',true);
    if(state==='sending')assert.equal(await evaluate("document.querySelector('.account-card button[aria-busy=true]').disabled"),true);
  }
  await load('/dev/comptes?view=edit',390,844);await click('#profile-pseudonym');await send('Input.insertText',{text:'_modifié'});
  assert.ok((await evaluate("document.querySelector('.profile-dirty').textContent")).includes('non enregistrées'));
  await click('.profile-actions button[type=button]');await delay(100);assert.equal(await evaluate('document.querySelector("dialog").open'),true);assert.equal(await evaluate('document.activeElement.textContent'),'Continuer la modification');await key('Escape',27);assert.equal(await evaluate('document.querySelector("dialog").open'),false);assert.equal(await evaluate('document.activeElement.textContent'),'Annuler');
  await click('.profile-actions button[type=button]');await click('dialog button:last-child');assert.equal(await evaluate("document.querySelector('#profile-pseudonym').value"),'awa_demo');

  await click('.profile-skills button');assert.equal(await evaluate("document.querySelectorAll('.profile-skills button').length"),3);await evaluate("const choice=document.querySelector('#profile-skill');choice.value='React';choice.dispatchEvent(new Event('change',{bubbles:true}))");await delay(100);assert.equal(await evaluate("document.querySelectorAll('.profile-skills button').length"),4);
  await click('.profile-links > button');assert.equal(await evaluate("document.querySelectorAll('.profile-links input').length"),2);await click('.profile-links > div:last-of-type button');assert.equal(await evaluate("document.querySelectorAll('.profile-links input').length"),1);
  // Écrire via événement utilisateur afin de mettre à jour le champ React contrôlé.
  await click('#profile-link-0');await key('a',65,2);await send('Input.insertText',{text:'javascript:alert(1)'});await click('.profile-actions button[type=submit]');await delay(150);assert.equal(await evaluate("document.querySelector('#profile-link-0').getAttribute('aria-invalid')"),'true');await capture('edit-validation-390.png',true);
  await click('#profile-link-0');await key('a',65,2);await send('Input.insertText',{text:'https://example.com/demo'});await click('.profile-actions button[type=submit]');await delay(150);assert.ok((await evaluate("document.querySelector('.profile-editor [role=status]:last-child').textContent")).includes('non enregistré'));
  // Quitter le formulaire de démonstration sans laisser de données de saisie dans les captures.
  await click('.profile-actions button[type=button]');if(await evaluate('document.querySelector("dialog").open'))await click('dialog button:last-child');
  for(const state of ['missing','long','not-found']){await load('/dev/comptes?view=profile&state='+state,320,800);await widthCheck();await capture('profile-'+state+'-320.png',true);assert.equal(await evaluate("document.querySelectorAll('a[href^=javascript]').length"),0);}
  for(const state of ['loading','error']){await load('/dev/comptes?view=profile&state='+state);await capture('profile-'+state+'-390.png',true);await widthCheck();}
  await load('/dev/comptes?view=profile&tab=answers');assert.ok((await evaluate("document.querySelector('.profile-empty').textContent")).includes('Aucune contribution'));await capture('profile-answers-390.png',true);
  for(const route of ['/profils/inconnu','/espace/profil']){await load(route);assert.equal(await evaluate("document.querySelectorAll('input').length"),0);await capture(route.includes('espace')?'own-profile-unavailable-390.png':'public-profile-unavailable-390.png',true);}
  await load('/nouveau-mot-de-passe?token=fictif&state=success');assert.equal(await evaluate("document.querySelector('.account-result')!==null"),false);assert.ok((await evaluate("document.querySelector('.account-link-status').textContent")).includes('Aucun paramètre'));
  await load('/connexion');await evaluate("document.querySelector('.public-menu summary').focus()");await key('Enter',13);assert.equal(await evaluate('document.querySelector(".public-menu").open'),true);await key('Escape',27);assert.equal(await evaluate('document.querySelector(".public-menu").open'),false);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await load('/connexion');await widthCheck();await capture('login-normal-motion-390.png',true);
  await send('Emulation.setScriptExecutionDisabled',{value:true});await send('Page.navigate',{url:origin+'/connexion'});await delay(800);assert.equal(await evaluate("document.querySelectorAll('.account-card form').length"),0);await send('Emulation.setScriptExecutionDisabled',{value:false});
  assert.equal(errors.length,0);assert.equal(apiRequests.length,0);
  fs.writeFileSync(path.join(artifact,'checks.json'),JSON.stringify({browser:browser.product,serverStartedForReview:Boolean(server),views:reports,errors,apiRequests,checks:['Formulaires publics sans mutation ni GET de mots de passe','Labels, visibilité du mot de passe et autocomplétion','Validation locale, confirmation et attente sans double soumission','Liens invalides/expirés/utilisés et résultats explicitement simulés','Profil long/absent, liens HTTP(S), annulation et dialogue clavier','Navigation publique, paramètres non interprétés, réduction des mouvements et sans JavaScript']},null,2)+'\n');
  console.log('Revue comptes et profils réussie.');
}catch(error){console.error(error);process.exitCode=1;}finally{socket?.close();for(const child of processes.reverse()){try{stop(child);}catch(error){console.error('Arrêt à vérifier',child.pid,error.message);process.exitCode=1;}}console.log('Processus propres à la revue arrêtés.');}
