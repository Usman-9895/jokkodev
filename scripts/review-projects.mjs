// Revue HTTP/DOM et captures réelles, sans dépendance de test ajoutée.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Buffer } from 'node:buffer';

const root = process.cwd();
const port = Number(process.env.PROJECTS_REVIEW_PORT || 3000);
const origin = `http://localhost:${port}`;
const artifact = path.join(root, '.cache/design-system/lot-6');
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
  for (const checkedPort of [port, 9223].filter(value => value !== port || process.env.PROJECTS_REVIEW_REUSE !== '1')) {
    try { await fetch(`http://127.0.0.1:${checkedPort}`, { signal: AbortSignal.timeout(500) }); throw Error(`Port ${checkedPort} occupé ; libérer ce port avant la revue.`); }
    catch (error) { if (error.message.includes('occupé')) throw error; }
  }
  const server = process.env.PROJECTS_REVIEW_REUSE === '1' ? null : launch(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', String(port), '--hostname', '127.0.0.1'], path.join(root, 'frontend'));
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
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, ...(full ? { clip: { x: 0, y: 0, width: size.width, height: size.height, scale: 1 } } : {}) });
    fs.writeFileSync(path.join(artifact, filename), Buffer.from(result.data, 'base64'));
  }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const browser=await send('Browser.getVersion');
  async function load(route,width=390,height=844){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    const previousDocument=await evaluate('performance.timeOrigin');
    await send('Page.navigate',{url:origin+route});await delay(300);
    for(let i=0;i<150;i++){if(await evaluate("performance.timeOrigin!=="+previousDocument+"&&document.readyState==='complete'&&Boolean(document.querySelector('#contenu h1'))"))break;await delay(100);}
    await evaluate("(async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,8000))]);await Promise.race([Promise.all(Array.from(document.images).filter(i=>i.getClientRects().length).map(i=>i.decode())),new Promise(r=>setTimeout(r,8000))]);const p=document.querySelector('nextjs-portal');if(p)p.style.display='none'})()");await delay(400);
  }
  async function widthCheck(){assert.equal(await evaluate('document.documentElement.scrollWidth'),await evaluate('document.documentElement.clientWidth'),'Débordement de page');}
  async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(100);}throw Error('Transition non terminée : '+expression);}
  const demo='/dev/jokkoprojects';
  const views=[['/projets','list'],['/projets/demo-associations','detail'],[demo,'create'],[demo+'?view=edit','edit'],[demo+'?view=mine','mine']];
  for(const [width,height] of [[1440,1000],[768,1024],[390,844],[320,800]]){
   for(const [route,name] of views){
    await load(route,width,height);await widthCheck();
    const data=await evaluate("({fonts:Array.from(document.fonts).map(f=>({family:f.family,status:f.status})),images:Array.from(document.images).filter(i=>i.getClientRects().length).every(i=>i.naturalWidth>0),labels:Array.from(document.querySelectorAll('input:not([type=radio]),textarea,select')).every(e=>document.querySelector('label[for=\"'+e.id+'\"]'))})");
    assert.ok(data.images);assert.ok(data.labels);assert.ok(data.fonts.some(f=>f.family==='inter'&&f.status==='loaded'));assert.ok(data.fonts.some(f=>f.family==='sourceSerif'&&f.status==='loaded'));
    await capture(name+'-'+width+'.png',true);reports.push({name,width,height,...data});
   }
   console.log('Projets contrôlés : '+width+'px');
  }
  await load('/projets?page=2');await click('#project-search');await send('Input.insertText',{text:'associations'});
  await evaluate("const s=document.querySelector('#project-technology');s.value='React';s.dispatchEvent(new Event('change',{bubbles:true}));const r=document.querySelector('#project-status');r.value='open';r.dispatchEvent(new Event('change',{bubbles:true}))");
  await click('.projects-filters button[type=submit]');await until('document.querySelectorAll(".project-card").length===1&&location.search.includes("q=associations")');
  assert.equal(await evaluate('document.querySelectorAll(".project-card").length'),1);assert.ok(!(await evaluate('location.search')).includes('page='));assert.equal(await evaluate('document.querySelector("#project-search").value'),'associations');
  const listUrl=await evaluate('location.pathname+location.search');await click('.project-card h2 a');await until('location.pathname==="/projets/demo-associations"');assert.equal(await evaluate('location.pathname'),'/projets/demo-associations');
  assert.equal(await evaluate("document.querySelector('.help-breadcrumb a').getAttribute('href')"),listUrl);await click('.help-breadcrumb a');await until('location.pathname==="/projets"&&document.querySelectorAll(".project-card").length===1');assert.equal(await evaluate('location.pathname+location.search'),listUrl);await capture('list-filtered-390.png',true);
  await click('.help-reset');await until('location.search===""&&document.querySelectorAll(".project-card").length===4');assert.equal(await evaluate('location.search'),'');assert.equal(await evaluate('document.querySelectorAll(".project-card").length'),4);
  await click('.help-pagination a[aria-label="Page 2"]');await until('location.search.includes("page=2")');assert.ok((await evaluate('location.search')).includes('page=2'));assert.equal(await evaluate('document.querySelectorAll(".project-card").length'),4);
  await load('/projets?page=999');assert.equal(await evaluate('location.search'),'?page=3');assert.equal(await evaluate('document.querySelectorAll(".project-card").length'),1);
  await load('/projets?page=-1&status=admin&technology=unknown');assert.equal(await evaluate('document.querySelectorAll(".project-card").length'),4);
  await load('/projets?q=aucunresultat');assert.ok((await evaluate('document.querySelector(".project-read-state h2").textContent')).includes('Aucun projet ne correspond'));await capture('list-no-results-390.png',true);
  await load('/projets?status=closed');assert.ok((await evaluate('document.querySelectorAll(".project-card").length'))>0);await click('.project-card h2 a');await until('document.querySelector(".project-contribution-panel")!==null');assert.ok((await evaluate('document.querySelector(".project-contribution-panel h2").textContent')).includes('fermé'));assert.equal(await evaluate('document.querySelectorAll(".project-contribution-panel button").length'),0);await capture('detail-closed-390.png',true);
  await load('/projets/inconnu');assert.ok((await evaluate('document.querySelector("h1").textContent')).includes('introuvable'));await capture('detail-not-found-390.png',true);
  for(const state of ['loading','empty','error']){await load(demo+'?view=list&state='+state+'&q=React');await widthCheck();await capture('list-'+state+'-390.png',true);if(state==='error'){assert.equal(await evaluate('document.querySelector("#project-search").value'),'React');await click('.help-read-state button');await delay(600);assert.ok((await evaluate('location.search')).includes('q=React'));}}
  await load(demo+'?state=empty');await click('.project-form-page button[type=submit]');await delay(150);assert.equal(await evaluate('document.activeElement.className'),'contribution-errors');assert.equal(await evaluate('document.querySelectorAll("[aria-invalid=true]").length'),3);await capture('form-validation-390.png',true);
  await load(demo);const title=await evaluate('document.querySelector("#project-title").value');await click('#project-title');await send('Input.insertText',{text:' — modifié'});
  await click('.project-form-page .contribution-dialog-trigger');assert.equal(await evaluate('document.activeElement.textContent'),'Annuler');
  for(let i=0;i<6;i++){await key('Tab',9);assert.equal(await evaluate('document.activeElement.closest("dialog")!==null'),true);}await key('Tab',9,8);assert.equal(await evaluate('document.activeElement.closest("dialog")!==null'),true);await capture('form-cancel-dialog-390.png');await key('Escape',27);assert.equal(await evaluate('document.activeElement.textContent'),'Annuler');
  await click('.project-form-page .contribution-dialog-trigger');await click('dialog[open] button:last-child');assert.equal(await evaluate('document.querySelector("#project-title").value'),title);
  const skills=await evaluate('document.querySelectorAll(".project-skills > div button").length');await click('.project-skills > div button');assert.equal(await evaluate('document.querySelectorAll(".project-skills > div button").length'),skills-1);assert.equal(await evaluate('document.activeElement.id'),'project-technologies');
  await evaluate("const s=document.querySelector('#project-technologies');s.value='React';s.dispatchEvent(new Event('change',{bubbles:true}))");assert.equal(await evaluate('document.querySelectorAll(".project-skills > div button").length'),skills);
  await click('.project-recruitment label:nth-of-type(2)');assert.equal(await evaluate('document.querySelector("input[value=closed]").checked'),true);
  await click('.project-form-page button[type=submit]');await delay(150);assert.ok((await evaluate('Array.from(document.querySelectorAll(".project-form-page .jd-message[role=status]")).map(e=>e.textContent).join(" ")')).includes('Aucun projet'));
  await evaluate('document.querySelector("#project-title").focus()');await key('Tab',9);await key('Tab',9,8);assert.equal(await evaluate('document.activeElement.id'),'project-title');assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineWidth'),'2px');await capture('form-focus-390.png');
  await click('.project-form-page .contribution-dialog-trigger');await click('dialog[open] button:last-child');
  for(const view of ['create','edit'])for(const state of ['sending','error','success']){await load(demo+'?view='+view+'&state='+state);await widthCheck();await capture(view+'-'+state+'-390.png',true);if(state==='sending'){assert.equal(await evaluate('document.querySelector("button[type=submit]").disabled'),true);await evaluate('document.querySelector("form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))');assert.equal(await evaluate('document.querySelectorAll(".contribution-errors").length'),0);}}
  await load(demo+'?view=mine');assert.equal(await evaluate('document.querySelectorAll(".personal-project").length'),3);assert.equal(await evaluate('document.querySelectorAll(".project-edit-link").length'),2);
  await click('.contribution-tabs a:nth-child(2)');await until('document.querySelectorAll(".personal-project").length===2');assert.equal(await evaluate('document.querySelectorAll(".personal-project").length'),2);assert.ok((await evaluate('location.search')).includes('tab=created'));
  await click('.contribution-tabs a:nth-child(3)');await until('document.querySelectorAll(".personal-project").length===1');assert.equal(await evaluate('document.querySelectorAll(".personal-project").length'),1);assert.equal(await evaluate('document.querySelectorAll(".project-edit-link").length'),0);
  for(const perspective of ['visitor','member','administrator','suspended']){await load(demo+'?view=mine&perspective='+perspective);assert.equal(await evaluate('document.querySelectorAll(".project-edit-link").length'),0);await load(demo+'?view=edit&perspective='+perspective);assert.equal(await evaluate('document.querySelectorAll("form").length'),0);}
  for(const state of ['loading','empty','error','unavailable']){await load(demo+'?view=mine&state='+state);await widthCheck();await capture('mine-'+state+'-390.png',true);if(state==='empty')assert.equal(await evaluate('document.querySelector(".contribution-tabs a").textContent'),'Tous (0)');if(state==='loading')assert.equal(await evaluate('document.querySelector(".contribution-tabs a").textContent'),'Tous');}
  for(const state of ['missing','not-found','unavailable']){await load(demo+'?view=detail&state='+state,320,800);await widthCheck();await capture('detail-'+state+'-320.png',true);}
  for(const width of [1440,768,390,320]){await load(demo+'?view=detail&state=long',width,width<400?844:1000);await widthCheck();await capture('detail-long-'+width+'.png',true);await load(demo+'?state=long',width,width<400?844:1000);await widthCheck();await capture('form-long-'+width+'.png',true);}
  for(const route of ['/projets/proposer','/projets/demo-associations/modifier','/espace/projets']){await load(route);assert.equal(await evaluate('document.querySelectorAll("input,textarea").length'),0);await capture(route.includes('modifier')?'edit-unavailable-390.png':route.includes('espace')?'mine-unavailable-390.png':'create-unavailable-390.png',true);}
  await load('/projets/demo-associations?state=success&perspective=owner');assert.equal(await evaluate('document.querySelectorAll(".project-contribution-panel form").length'),0);assert.equal(await evaluate('document.querySelector(".project-contribution-panel button").disabled'),true);assert.equal(await evaluate('Array.from(document.querySelectorAll(".project-contribution-panel a")).filter(a=>a.getAttribute("href").startsWith("/dev")).length'),0);
  await load('/projets');await evaluate('document.querySelector("#project-search").focus()');await key('Tab',9);await key('Tab',9,8);assert.equal(await evaluate('document.activeElement.id'),'project-search');assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineWidth'),'2px');await capture('search-focus-390.png');
  await evaluate('document.querySelector(".public-menu summary").focus()');await key('Enter',13);assert.equal(await evaluate('document.querySelector(".public-menu").open'),true);await key('Escape',27);assert.equal(await evaluate('document.querySelector(".public-menu").open'),false);
  await load('/');await click('.home-feature:last-child a');await until('location.pathname==="/projets"');assert.equal(await evaluate('location.pathname'),'/projets');

  // Contrôles ciblés des lots précédents, complémentaires à la revue JokkoHelp complète.
  await load('/connexion');assert.equal(await evaluate('document.querySelector("#account-password").autocomplete'),'current-password');await click('.account-password-toggle');assert.equal(await evaluate('document.querySelector("#account-password").type'),'text');
  await load('/dev/comptes?view=profile');assert.equal(await evaluate('document.querySelector("h1").textContent'),'awa_demo');
  await load('/dev/jokkohelp-contributions?state=empty');await click('.contribution-question button[type=submit]');await delay(150);assert.equal(await evaluate('document.querySelectorAll("[aria-invalid=true]").length'),3);
  await load('/dev/jokkoprojects');assert.deepEqual(await evaluate('Array.from(new FormData(document.querySelector("form")).keys())'),['recruitment']);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await load('/projets');await widthCheck();await capture('list-normal-motion-390.png',true);
  await send('Emulation.setScriptExecutionDisabled',{value:true});await send('Page.navigate',{url:origin+'/projets?q=association'});await delay(800);assert.equal(await evaluate('document.querySelectorAll(".project-card").length'),1);await send('Emulation.setScriptExecutionDisabled',{value:false});
  assert.equal(errors.length,0);assert.equal(apiRequests.length,0);
  fs.writeFileSync(path.join(artifact,'checks.json'),JSON.stringify({browser:browser.product,serverStartedForReview:Boolean(server),views:reports,errors,apiRequests,checks:['Quatre largeurs et polices/images chargées','Recherche globale, filtres, reset de page, pagination et retour conservé','Création/modification locales, validation, annulation, focus et envoi injecté','Catégories personnelles et permissions fictives sans droits administrateur automatiques','États, contenu long, routes publiques honnêtes, clavier/menu et liens accueil','Mouvements réduits et consultation sans JavaScript']},null,2)+'\n');console.log('Revue projets réussie.');
}catch(error){console.error(error);process.exitCode=1;}finally{socket?.close();for(const child of processes.reverse()){try{stop(child);}catch(error){console.error('Arrêt à vérifier',child.pid,error.message);process.exitCode=1;}}console.log('Processus propres à la revue arrêtés.');}
