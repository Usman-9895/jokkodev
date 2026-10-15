import {clearTimeout} from 'node:timers';
// Revue HTTP/DOM et captures réelles, sans dépendance de test ajoutée.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Buffer } from 'node:buffer';

const root = process.cwd();
const port = Number(process.env.REPORTS_REVIEW_PORT || 3000);
const origin = `http://localhost:${port}`;
const debugPort=Number(process.env.REPORTS_REVIEW_DEBUG_PORT||9228);
const artifact = path.join(root, '.cache/design-system/lot-8');
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
  for (const checkedPort of [port, debugPort].filter(value => value !== port || process.env.REPORTS_REVIEW_REUSE !== '1')) {
    try { await fetch(`http://127.0.0.1:${checkedPort}`, { signal: AbortSignal.timeout(500) }); throw Error(`Port ${checkedPort} occupé ; libérer ce port avant la revue.`); }
    catch (error) { if (error.message.includes('occupé')) throw error; }
  }
  const server = process.env.REPORTS_REVIEW_REUSE === '1' ? null : launch(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', String(port), '--hostname', '127.0.0.1'], path.join(root, 'frontend'));
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
  const report='/dev/signalements',admin='/dev/moderation',detail=admin+'?view=detail&id=demo-report-answer';
  for(const [width,height] of [[1440,1000],[768,1024],[390,844],[320,800]]) {
    for(const [route,name] of [[report,'report'],[admin,'list'],[detail,'detail']]) {
      await load(route,width,height);if(name==='report'){await click('.demo-report-trigger');await until('Boolean(document.querySelector("dialog[open]"))');}
      await widthCheck();const fonts=await evaluate('Array.from(document.fonts).filter(f=>f.status==="loaded").map(f=>f.family)');assert.ok(fonts.includes('inter')&&fonts.includes('sourceSerif'));assert.ok(await evaluate('Array.from(document.images).filter(i=>i.getClientRects().length).every(i=>i.naturalWidth>0)'));await capture(name+'-'+width+'.png',name!=='report');reports.push({name,width,height,fonts});
    }
    console.log('Signalements contrôlés : '+width+'px');
  }
  await load(report);await click('.demo-report-trigger');assert.equal(await evaluate('document.activeElement.textContent'),'Annuler');await key('Tab',9);await key('Tab',9);assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'Fermer le signalement');await key('Tab',9,8);assert.ok(await evaluate('document.activeElement.textContent.includes("Envoyer le signalement")'));await key('Escape',27);assert.equal(await evaluate('document.activeElement.className.includes("demo-report-trigger")'),true);
  await click('.demo-report-trigger');await click('dialog form button[type=submit]');await until('Boolean(document.querySelector("#report-reason-error"))');assert.ok(await evaluate('document.activeElement.className.includes("contribution-errors")'));await capture('report-validation-390.png',false);await click('#report-reason');await send('Input.insertText',{text:'Signalement de démonstration, sans contenu sensible.'});await click('dialog form button[type=submit]');assert.ok(await evaluate('document.querySelector("#report-reason").disabled'));await evaluate('document.querySelector("dialog form").requestSubmit()');await until('document.querySelector("dialog").textContent.includes("Signalement reçu — simulation")');await capture('report-confirmation-390.png',false);await key('Escape',27);
  for(const state of ['already','unavailable','expired','sending','error','success']){await load(report+'?state='+state);await click('.demo-report-trigger');await widthCheck();if(['already','unavailable','expired','success'].includes(state))assert.equal(await evaluate('document.querySelectorAll("#report-reason").length'),0);if(state==='sending')assert.ok(await evaluate('document.querySelector("#report-reason").disabled'));await capture('report-'+state+'-390.png',false);}
  await load(report+'?state=error');await click('.demo-report-trigger');await click('#report-reason');await send('Input.insertText',{text:'Texte conservé après une erreur simulée.'});await click('dialog form button[type=submit]');await delay(600);assert.equal(await evaluate('document.querySelector("#report-reason").value'),'Texte conservé après une erreur simulée.');assert.ok(!await evaluate('document.querySelector("dialog").textContent.includes("Signalement reçu")'));
  await load(report+'?perspective=visitor');await click('.demo-report-trigger');assert.equal(await evaluate('document.querySelectorAll("#report-reason").length'),0);await capture('report-visitor-390.png',false);
  for(const [type,target] of [['answer','demo-session-answer-2'],['project','demo-associations']]){await load(report+'?type='+type+'&target='+target);await click('.demo-report-trigger');await widthCheck();await capture('report-'+type+'-390.png',false);}
  await load(admin+'?state=paginated&page=2');assert.equal(await evaluate('document.querySelectorAll(".moderation-table tbody tr").length'),4);await click('.moderation-table tbody tr:first-child a');await until('location.search.includes("view=detail")');await click('.help-breadcrumb>a');await until('location.search.includes("page=2")&&Boolean(document.querySelector(".moderation-table"))');await capture('list-page2-390.png',true);await evaluate('document.querySelector("#report-status").value="closed";document.querySelector("#report-status").dispatchEvent(new Event("change",{bubbles:true}))');await until('location.search.includes("status=closed")&&!location.search.includes("page=2")');assert.equal(await evaluate('document.querySelectorAll(".moderation-table tbody tr").length'),2);
  await load(admin+'?page=999');await until('!location.search.includes("999")');assert.equal(await evaluate('document.querySelectorAll(".moderation-table tbody tr").length'),4);
  await load(detail);await click('.moderation-decision .contribution-dialog-trigger');await until('Boolean(document.querySelector("#decision-action-error"))');assert.equal(await evaluate('document.querySelectorAll("dialog[open]").length'),0);await capture('decision-validation-390.png',true);
  async function choose(action){await click('input[value="'+action+'"]');await click('#decision-reason');await send('Input.insertText',{text:'Motif de décision fictive explicite.'});await click('.moderation-decision .contribution-dialog-trigger');await until('Boolean(document.querySelector("dialog[open]"))');}
  await choose('hide');assert.equal(await evaluate('document.activeElement.textContent'),'Annuler');await key('Tab',9,8);assert.equal(await evaluate('document.activeElement.textContent'),'Confirmer la simulation');await key('Tab',9);assert.equal(await evaluate('document.activeElement.textContent'),'Annuler');await capture('decision-dialog-390.png',false);await key('Escape',27);assert.ok(await evaluate('document.activeElement.className.includes("contribution-dialog-trigger")'));await click('.moderation-decision .contribution-dialog-trigger');await click('dialog[open] button:last-child');assert.ok(await evaluate('document.querySelector(".decision-fields").disabled'));await until('document.querySelector(".moderation-report-context").textContent.includes("Masquage simulé")');assert.ok(await evaluate('document.querySelector(".moderation-heading").textContent.includes("Ouvert")'));assert.equal(await evaluate('document.querySelectorAll(".moderation-history li").length'),1);await capture('decision-hidden-open-390.png',true);
  await load(detail);await choose('suspend');await click('dialog[open] button:last-child');await until('document.querySelector(".moderation-report-context").textContent.includes("Suspension simulée")');assert.ok(!await evaluate('document.querySelector(".moderation-report-context").textContent.includes("Masquage simulé")'));assert.ok(await evaluate('document.querySelector(".moderation-heading").textContent.includes("Ouvert")'));await capture('decision-suspended-open-390.png',true);
  await load(detail);await choose('close');await click('dialog[open] button:last-child');await until('document.querySelector(".moderation-detail-grid").textContent.includes("lecture seule")');assert.equal(await evaluate('document.querySelectorAll(".moderation-decision").length'),0);await capture('decision-closed-390.png',true);await click('.help-breadcrumb>a');await until('Boolean(document.querySelector(".moderation-table"))');assert.ok(await evaluate('document.querySelector(".moderation-tabs").textContent.includes("Clôturés (2)")'));
  for(const outcome of ['error','conflict','expired','denied']){await load(detail+'&outcome='+outcome);await choose('hide');await click('dialog[open] button:last-child');await delay(650);assert.ok(!await evaluate('document.querySelector("#contenu").textContent.includes("Simulation locale affichée")'));if(outcome==='expired'||outcome==='denied')assert.equal(await evaluate('document.querySelectorAll(".moderation-report-context").length'),0);if(outcome==='error')assert.equal(await evaluate('document.querySelector("#decision-reason").value'),'Motif de décision fictive explicite.');if(outcome==='conflict')assert.equal(await evaluate('document.querySelectorAll(".moderation-decision").length'),0);await capture('decision-'+outcome+'-390.png',true);}
  for(const state of ['loading','empty','no-results','error']){await load(admin+'?state='+state+'&status=closed');await widthCheck();assert.equal(await evaluate('document.querySelectorAll(".moderation-table tbody tr").length'),0);assert.equal(await evaluate('document.querySelector("#report-status").value'),'closed');if(state==='empty')assert.ok(await evaluate('document.querySelector(".moderation-tabs").textContent.includes("Tous (0)")'));await capture('list-'+state+'-390.png',true);}
  for(const role of ['developer','visitor','expired','invalide']){await load(detail+'&role='+role);assert.equal(await evaluate('document.querySelectorAll(".moderation-report-context,.moderation-table").length'),0);await capture('admin-'+role+'-390.png',true);}
  await load(admin+'?view=detail&id=inconnu');await capture('detail-not-found-390.png',true);await load(admin+'?view=detail&id=demo-report-closed');assert.equal(await evaluate('document.querySelectorAll(".moderation-decision").length'),0);await capture('detail-closed-history-390.png',true);
  for(const [width,height] of [[1440,1000],[768,1024],[390,844],[320,800]]){await load(detail+'&state=long',width,height);await widthCheck();assert.equal(await evaluate('document.querySelectorAll(".moderation-report-context img").length'),0);assert.equal(await evaluate('window.__reportUnsafe===true'),false);assert.ok(await evaluate('document.querySelector(".moderation-report-context .help-content p").textContent.includes("<img")'));assert.ok(await evaluate('document.querySelector(".help-code pre").scrollWidth>document.querySelector(".help-code pre").clientWidth'));await evaluate('document.querySelector(".moderation-report-context").scrollIntoView()');await capture('detail-long-'+width+'.png',false);await evaluate('document.querySelector(".help-code pre").scrollIntoView()');await capture('detail-code-'+width+'.png',false);}
  for(const [width,height] of [[1440,1000],[768,1024],[390,844],[320,800]])for(const [route,name] of [['/questions/demo-session-nestjs','public-question'],['/projets/demo-associations','public-project']]){await load(route,width,height);await widthCheck();await capture(name+'-'+width+'.png',true);}
  await load('/questions/demo-session-nestjs');assert.equal(await evaluate('document.querySelectorAll(".report-entry").length'),3);await click('.help-answer .report-entry');await until('location.pathname==="/signalements"');assert.ok(await evaluate('document.querySelector("#contenu").textContent.includes("Signalement indisponible")'));assert.equal(await evaluate('document.querySelectorAll("textarea").length'),0);await capture('public-unavailable-390.png',true);
  await load('/projets/demo-associations');await click('.report-entry');await until('location.pathname==="/signalements"');assert.ok(await evaluate('location.search.includes("type=project")'));
  for(const route of ['/questions?q=session','/projets?status=open','/dev/espace','/connexion','/dev/jokkohelp-contributions?view=mine']){await load(route);await widthCheck();reports.push({nonRegression:route});}
  await load(report);await click('.public-menu summary');await key('Escape',27);assert.equal(await evaluate('document.querySelector(".public-menu").open'),false);await evaluate('document.querySelector(".demo-report-trigger").focus()');await key('Tab',9);assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineWidth'),'2px');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await load(report);await click('.demo-report-trigger');await widthCheck();await capture('report-normal-motion-390.png',false);
  assert.equal(errors.length,0);assert.equal(apiRequests.length,0);fs.writeFileSync(path.join(artifact,'checks.json'),JSON.stringify({browser:browser.product,serverStartedForReview:Boolean(server),views:reports,errors,apiRequests,checks:['Trois interfaces aux quatre largeurs avec polices et images chargées','Formulaire modal : validation, focus, envoi, erreur, confirmation et variantes','Filtres, pagination, retour, critères invalides, états et permissions','Décisions indépendantes, confirmations, envoi bloqué, conflit, expiration, historique','Contenus longs et sûrs, liens publics honnêtes, clavier/menu, mouvements, non-régression ciblée']},null,2)+'\n');console.log('Revue signalements et modération réussie.');
}catch(error){console.error(error);process.exitCode=1;}finally{if(socket?.readyState===1){socket.send(JSON.stringify({id:2147483647,method:'Browser.close'}));await delay(300);}socket?.close();for(const child of processes.reverse()){try{stop(child);}catch(error){console.error('Arrêt à vérifier',child.pid,error.message);process.exitCode=1;}}console.log('Processus propres à la revue arrêtés.');}
