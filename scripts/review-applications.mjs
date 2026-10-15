import {clearTimeout} from 'node:timers';
// Revue HTTP/DOM et captures réelles, sans dépendance de test ajoutée.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Buffer } from 'node:buffer';

const root = process.cwd();
const port = Number(process.env.APPLICATIONS_REVIEW_PORT || 3000);
const origin = `http://localhost:${port}`;
const debugPort=Number(process.env.APPLICATIONS_REVIEW_DEBUG_PORT||9227);
const artifact = path.join(root, '.cache/design-system/lot-7');
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
    if (process.platform === 'win32') {try{execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });}catch(error){try{process.kill(child.pid,0);}catch(gone){if(gone.code==='ESRCH')return;}throw error;}}
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
  for (const checkedPort of [port, debugPort].filter(value => value !== port || process.env.APPLICATIONS_REVIEW_REUSE !== '1')) {
    try { await fetch(`http://127.0.0.1:${checkedPort}`, { signal: AbortSignal.timeout(500) }); throw Error(`Port ${checkedPort} occupé ; libérer ce port avant la revue.`); }
    catch (error) { if (error.message.includes('occupé')) throw error; }
  }
  const server = process.env.APPLICATIONS_REVIEW_REUSE === '1' ? null : launch(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', String(port), '--hostname', '127.0.0.1'], path.join(root, 'frontend'));
  await waitHttp(origin);
  launch(chromePath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port='+debugPort, `--user-data-dir=${path.join(artifact, 'browser-profile-'+process.pid)}`, 'about:blank']);
  await waitHttp(`http://127.0.0.1:${debugPort}/json/version`);
  const tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  socket = new globalThis.WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map(), errors = [], apiRequests = [], videoFrames = [];
  socket.addEventListener('message', event => {
    const result = JSON.parse(event.data);
    if (result.id) { const task = pending.get(result.id); if (task) { pending.delete(result.id); if (result.error) task.reject(Error(JSON.stringify(result.error))); else task.resolve(result.result); } }
    else if(result.method==='Page.javascriptDialogOpening'){console.log('Dialogue natif de revue : '+result.params.type);send('Page.handleJavaScriptDialog',{accept:result.params.type==='beforeunload'}).catch(()=>{});}
    else if (result.method === 'Runtime.exceptionThrown') errors.push(result.params.exceptionDetails.text);
    else if (result.method === 'Network.requestWillBeSent' && result.params.request.url.includes('/api/v1')) apiRequests.push(result.params.request.url);
    else if (result.method === 'Page.screencastFrame') { videoFrames.push({ data: result.params.data, timestamp: result.params.metadata.timestamp }); send('Page.screencastFrameAck', { sessionId: result.params.sessionId }).catch(() => {}); }
  });
  function send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++sequence; const timer=setTimeout(()=>{pending.delete(id);reject(Error('Commande navigateur trop longue : '+method));},30000); pending.set(id, {resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}}); socket.send(JSON.stringify({ id, method, params })); }); }
  async function evaluate(expression) { let result; for(let attempt=0;attempt<10;attempt++){try{result=await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 15000 });break;}catch(error){if(!/navigated|context.*destroyed/i.test(error.message)||attempt===9)throw error;await delay(100);}} if (result.exceptionDetails) throw Error(result.exceptionDetails.text); return result.result.value; }
  async function key(key, virtual, modifiers = 0) { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code: key, windowsVirtualKeyCode: virtual, modifiers, ...(type === 'keyDown' && key === 'Enter' ? { text: '\r' } : {}) }); }
  async function click(selector) {
    const point = await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
  }
  async function capture(filename, full = false) {
    if(full)await evaluate("window.scrollTo(0,0)");
    if(filename.includes('-long-'))await evaluate('document.querySelector(".received-application,.sent-application")?.scrollIntoView({block:"start"})');
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
    fs.writeFileSync(path.join(artifact,'progress.json'),JSON.stringify({route,width,height}));
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    const previousDocument=await evaluate('performance.timeOrigin');
    await send('Runtime.evaluate',{expression:'setTimeout(()=>location.assign('+JSON.stringify(origin+route)+'),0)'});await delay(300);
    for(let i=0;i<150;i++){if(await evaluate("performance.timeOrigin!=="+previousDocument+"&&document.readyState==='complete'&&Boolean(document.querySelector('#contenu h1'))"))break;await delay(100);}
    await evaluate("(async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,8000))]);await Promise.race([Promise.all(Array.from(document.images).filter(i=>i.getClientRects().length).map(i=>i.decode())),new Promise(r=>setTimeout(r,8000))]);const p=document.querySelector('nextjs-portal');if(p)p.style.display='none'})()");await delay(400);
  }
  async function widthCheck(){assert.equal(await evaluate('document.documentElement.scrollWidth'),await evaluate('document.documentElement.clientWidth'),'Débordement de page');}
  async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(100);}throw Error('Transition non terminée : '+expression);}
  const demo='/dev/espace';
  const views=[['dashboard','dashboard'],['sent','sent'],['received','received'],['apply','apply'],['questions','questions'],['projects','projects']];
  for(const [width,height] of [[1440,1000],[768,1024],[390,844],[320,800]]){
    for(const [view,name] of views){await load(demo+'?view='+view,width,height);await widthCheck();const fonts=await evaluate('Array.from(document.fonts).filter(f=>f.status==="loaded").map(f=>f.family)');assert.ok(fonts.includes('inter')&&fonts.includes('sourceSerif'));assert.equal(await evaluate('document.querySelectorAll(".developer-navigation").length'),1);await capture(name+'-'+width+'.png',true);reports.push({view,width,height,fonts});}
    console.log('Espace contrôlé : '+width+'px');
  }
  await load(demo+'?view=sent');await click('#application-filter');await evaluate('document.querySelector("#application-filter").value="refused"');await click('.application-filter button');await until('location.search.includes("filter=refused")&&document.querySelectorAll(".sent-application").length===1');assert.ok(await evaluate('document.querySelector(".sent-application").textContent.includes("Refusée")'));await capture('sent-filter-390.png',true);
  await click('.developer-navigation a[href*="view=projects"]');await until('Boolean(document.querySelector(".personal-project-list"))');await click('.contribution-tabs a[href*="tab=joined"]');await until('location.search.includes("tab=joined")&&document.querySelectorAll(".personal-project").length===1');
  await load(demo+'?view=apply');await click('.application-form button[type=submit]');await delay(150);assert.equal(await evaluate('document.querySelector("#application-message").getAttribute("aria-invalid")'),'true');assert.equal(await evaluate('document.activeElement.className'),'contribution-errors');await capture('apply-validation-390.png',true);await click('#application-message');await send('Input.insertText',{text:'Je peux contribuer avec des tests accessibles.'});await click('.application-form button[type=submit]');await until('document.querySelector(".application-form").textContent.includes("Aucune candidature envoyée")');
  for(const perspective of ['visitor','pending','member','owner','closed','administrator','expired']){await load(demo+'?view=apply&perspective='+perspective);assert.equal(await evaluate('document.querySelectorAll("#application-message").length'),0);await widthCheck();await capture('apply-'+perspective+'-390.png',true);}
  await load(demo+'?view=apply&state=sending');assert.ok(await evaluate('document.querySelector("#application-message").disabled'));assert.ok(await evaluate('document.querySelector(".application-form button").disabled'));await capture('apply-sending-390.png',true);
  for(const state of ['error','success']){await load(demo+'?view=apply&state='+state);await capture('apply-'+state+'-390.png',true);}
  await load(demo+'?view=received');await click('.received-application .contribution-dialog-trigger');await until('Boolean(document.querySelector("dialog[open]"))');assert.equal(await evaluate('document.activeElement.textContent'),'Annuler');await key('Tab',9,8);assert.ok(await evaluate('document.activeElement.textContent.includes("Accepter (démo)")'));await key('Tab',9);assert.equal(await evaluate('document.activeElement.textContent'),'Annuler');await capture('decision-dialog-390.png',false);await key('Escape',27);assert.equal(await evaluate('document.activeElement.textContent'),'Accepter');
  await click('.received-application .contribution-dialog-trigger');await click('dialog[open] button:last-child');await until('Boolean(document.querySelector(".decision-actions:disabled"))');assert.equal(await evaluate('document.querySelectorAll(".decision-actions:disabled").length'),2);await capture('decision-sending-390.png',true);await until('document.querySelectorAll(".received-application").length===1');assert.ok(await evaluate('document.activeElement.textContent.includes("Décision fictive")'));assert.ok(await evaluate('document.querySelector(".contribution-tabs").textContent.includes("Acceptée (1)")'));await capture('decision-success-390.png',true);
  await click('.contribution-tabs a[href*="filter=accepted"]');await until('location.search.includes("filter=accepted")');assert.equal(await evaluate('document.querySelectorAll(".decision-actions").length'),0);assert.ok(await evaluate('document.querySelector(".received-application").textContent.includes("déjà traitée")'));
  await load(demo+'?view=received');await click('.received-application .decision-actions>button:nth-of-type(2)');await click('dialog[open] button:last-child');await until('document.querySelectorAll(".received-application").length===1');assert.ok(await evaluate('document.querySelector(".contribution-tabs").textContent.includes("Refusée (1)")'));
  for(const outcome of ['error','conflict','expired']){await load(demo+'?view=received&outcome='+outcome);await click('.received-application .contribution-dialog-trigger');await click('dialog[open] button:last-child');await delay(700);assert.ok(await evaluate('!document.querySelector(".developer-content").textContent.includes("Décision fictive affichée")'));assert.equal(await evaluate('document.querySelectorAll(".received-application").length'),outcome==='expired'?0:2);await capture('decision-'+outcome+'-390.png',true);}
  for(const perspective of ['visitor','member','administrator','expired']){await load(demo+'?view=received&perspective='+perspective);assert.equal(await evaluate('document.querySelectorAll(".received-application").length'),0);await capture('received-'+perspective+'-390.png',true);}
  for(const view of ['dashboard','sent','received'])for(const state of (view==='dashboard'?['loading','empty','error','expired']:['loading','empty','error','expired','no-results'])){await load(demo+'?view='+view+'&state='+state);await widthCheck();assert.equal(await evaluate('document.querySelectorAll(".received-application,.sent-application,.dashboard-stat").length'),0);await capture(view+'-'+state+'-390.png',true);}
  for(const width of [1440,768,390,320]){await load(demo+'?view=received',width,width===1440?1000:844);await evaluate('document.querySelectorAll(".received-message>p,.received-heading h2").forEach(e=>e.textContent="ContenuLongSansEspaces".repeat(20))');await widthCheck();await capture('received-long-'+width+'.png',false);await load(demo+'?view=sent',width,844);await evaluate('document.querySelectorAll(".sent-application h2,.sent-application p").forEach(e=>e.textContent="TexteLongSansEspaces".repeat(20))');await widthCheck();await capture('sent-long-'+width+'.png',false);}
  await load(demo);await click('.public-menu summary');await key('Escape',27);assert.equal(await evaluate('document.querySelector(".public-menu").open'),false);await evaluate('document.querySelector(".developer-navigation a").focus()');await key('Tab',9);assert.ok(await evaluate('document.activeElement.closest(".developer-navigation")!==null'));assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineWidth'),'2px');await capture('navigation-focus-390.png',true);
  for(const route of ['/espace','/espace/candidatures','/espace/projets/demo-associations/demandes','/projets/demo-associations','/questions/demo-session-nestjs','/connexion','/dev/comptes?view=profile','/dev/jokkohelp-contributions?view=mine','/dev/jokkoprojects?view=mine']){await load(route);await widthCheck();reports.push({nonRegression:route});}
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await load(demo);await widthCheck();await capture('dashboard-normal-motion-390.png',true);
  assert.equal(errors.length,0);assert.equal(apiRequests.length,0);
  fs.writeFileSync(path.join(artifact,'checks.json'),JSON.stringify({browser:browser.product,serverStartedForReview:Boolean(server),views:reports,errors,apiRequests,checks:['Quatre largeurs, polices chargées, navigation unique et réutilisation Mes questions/Mes projets','Filtres, validation locale et variantes candidature','Dialogues, Tab/Shift+Tab/Échap, focus, décisions et doubles soumissions bloquées','Conflit, erreur, expiration, permissions, états, contenu long','Navigation clavier, menu, mouvements et non-régression ciblée']},null,2)+'\n');console.log('Revue espace et candidatures réussie.');
}catch(error){console.error(error);process.exitCode=1;}finally{if(socket?.readyState===1){socket.send(JSON.stringify({id:2147483647,method:'Browser.close'}));await delay(300);}socket?.close();for(const child of processes.reverse()){try{stop(child);}catch(error){console.error('Arrêt à vérifier',child.pid,error.message);process.exitCode=1;}}console.log('Processus propres à la revue arrêtés.');}
