// Revue HTTP/DOM et captures réelles, sans dépendance de test ajoutée.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Buffer } from 'node:buffer';

const root = process.cwd();
const port = Number(process.env.JOKKOHELP_REVIEW_PORT || 3000);
const origin = `http://localhost:${port}`;
const artifact = path.join(root, '.cache/design-system/lot-3');
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
  for (const checkedPort of [port, 9223].filter(value => value !== port || process.env.JOKKOHELP_REVIEW_REUSE !== '1')) {
    try { await fetch(`http://127.0.0.1:${checkedPort}`, { signal: AbortSignal.timeout(500) }); throw Error(`Port ${checkedPort} occupé ; libérer ce port avant la revue.`); }
    catch (error) { if (error.message.includes('occupé')) throw error; }
  }
  const server = process.env.JOKKOHELP_REVIEW_REUSE === '1' ? null : launch(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', String(port), '--hostname', '127.0.0.1'], path.join(root, 'frontend'));
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
    await evaluate("(async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,8000))]);await Promise.race([Promise.all(Array.from(document.images).map(i=>i.decode())),new Promise(r=>setTimeout(r,8000))]);const p=document.querySelector('nextjs-portal');if(p)p.style.display='none'})()");await delay(400);
  }
  async function widthCheck(){assert.equal(await evaluate('document.documentElement.scrollWidth'),await evaluate('document.documentElement.clientWidth'),'Débordement de page');}
  async function routeWait(path){for(let i=0;i<100;i++){if((await evaluate('location.pathname'))===path)return;await delay(100);}throw Error('Navigation non terminée : '+path);}
  for(const [width,height] of [[1440,1000],[768,1024],[390,844],[320,800]]){
    for(const [route,name] of [['/questions','list'],['/questions/demo-session-nestjs','detail']]){
      await load(route,width,height);await widthCheck();
      const data=await evaluate("({title:document.querySelector('h1').textContent,fonts:Array.from(document.fonts).map(f=>({family:f.family,status:f.status})),images:Array.from(document.images).every(i=>i.naturalWidth>0),code:Array.from(document.querySelectorAll('.help-code pre')).map(e=>({width:e.clientWidth,scroll:e.scrollWidth,font:getComputedStyle(e).fontFamily}))})");
      assert.ok(data.images);assert.ok(data.fonts.some(f=>f.family==='inter'&&f.status==='loaded'));assert.ok(data.fonts.some(f=>f.family==='sourceSerif'&&f.status==='loaded'));
      if(name==='detail'){assert.ok(data.fonts.some(f=>f.family==='jetbrainsMono'&&f.status==='loaded'));assert.equal(await evaluate("document.querySelectorAll('.help-answer--accepted').length"),1);assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).some(b=>/Accepter|Publier|Retirer/.test(b.textContent))"),false);}
      reports.push({name,width,height,...data});await capture(name+'-'+width+'.png',true);
    }
    console.log('Liste et détail contrôlés : '+width+'px');
  }
  await load('/questions?page=2');
  await click('#question-search');await send('Input.insertText',{text:'securiser'});
  await evaluate("document.querySelector('#question-technology').value='NestJS';document.querySelector('#question-status').value='resolved'");
  await click('.help-filters button');await delay(500);
  assert.equal(await evaluate("new URL(location.href).searchParams.has('page')"),false);
  assert.equal(await evaluate("new URL(location.href).searchParams.get('technology')"),'NestJS');
  assert.equal(await evaluate("new URL(location.href).searchParams.get('status')"),'resolved');
  assert.equal(await evaluate("document.querySelectorAll('.help-question').length"),1);
  await capture('combined-search-390.png',true);
  const saved=await evaluate('location.search');await click('.help-question h2 a');await routeWait('/questions/demo-session-nestjs');
  assert.equal(await evaluate('location.search'),saved);await click('.help-breadcrumb a');await routeWait('/questions');assert.equal(await evaluate('location.search'),saved);
  await click('.help-reset');for(let i=0;i<100;i++){if(await evaluate("location.search===''&&document.querySelector('#question-search')?.value===''&&document.querySelectorAll('.help-question').length===3"))break;await delay(100);}assert.equal(await evaluate('location.search'),'');assert.equal(await evaluate("document.querySelector('#question-search').value"),'');
  await click('.help-pagination a[aria-label="Page 2"]');for(let i=0;i<100;i++){if(await evaluate("new URL(location.href).searchParams.get('page')==='2'&&Boolean(document.querySelector('h2 a[href*=demo-jwt]'))"))break;await delay(100);}assert.equal(await evaluate("new URL(location.href).searchParams.get('page')"),'2');
  assert.ok(await evaluate("document.querySelector('h2 a[href*=demo-jwt]')!==null"));
  await load('/questions?q=quantiquesansresultat');assert.ok((await evaluate("document.querySelector('.help-read-state').textContent")).includes('Aucune question ne correspond'));await capture('no-results-390.png',true);
  await load('/questions?q=x&technology=inconnue&status=admin&page=-7');assert.equal(await evaluate("document.querySelector('#question-technology').value"),'');assert.equal(await evaluate("document.querySelector('#question-status').value"),'all');
  await load('/questions?page=999');for(let i=0;i<100;i++){if(await evaluate("Number(new URL(location.href).searchParams.get('page'))===3"))break;await delay(100);}assert.equal(await evaluate("new URL(location.href).searchParams.get('page')"),'3');
  await load('/questions/demo-postgresql-cloud');assert.ok((await evaluate("document.querySelector('.help-no-answers').textContent")).includes('pas encore de réponse'));await capture('no-answers-390.png',true);
  await load('/questions/demo-session-nestjs');await send('Page.bringToFront');await send('Emulation.setFocusEmulationEnabled',{enabled:true});await send('Browser.grantPermissions',{origin:origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});for(let i=0;i<50;i++){if(await evaluate("document.querySelector('.help-copy button').disabled===false"))break;await delay(100);}await click('.help-code .help-copy button');for(let i=0;i<50;i++){if(await evaluate("document.querySelector('.help-copy-feedback').textContent.length>0"))break;await delay(100);}assert.equal(await evaluate("document.querySelector('.help-copy-feedback').textContent"),'Code copié.');assert.equal((await evaluate('navigator.clipboard.readText()')).replaceAll('\r\n','\n'),await evaluate("document.querySelector('.help-code code').textContent"));
  await load('/questions/inexistante');assert.ok((await evaluate('document.querySelector("h1").textContent')).includes('introuvable'));await capture('not-found-390.png',true);
  for(const [state,name] of [['empty','empty'],['loading','loading'],['detail-loading','detail-loading'],['error','error'],['detail-error','detail-error']]){
    await load('/dev/jokkohelp?state='+state);await capture(name+'-390.png',true);await widthCheck();
    if(state==='error'){await click('.help-read-state button');await delay(300);assert.equal(await evaluate('document.querySelectorAll(".help-question").length'),3);}
  }
  for(const state of ['empty','loading','error']){await load('/dev/jokkohelp?state='+state,1440,1000);await capture(state+'-1440.png',true);await widthCheck();}
  await load('/questions/inexistante',1440,1000);await capture('not-found-1440.png',true);
  await load('/dev/jokkohelp?state=long',320,800);await widthCheck();assert.equal(await evaluate('document.querySelectorAll("img[src=x]").length'),0);assert.ok(await evaluate("document.querySelector('.help-code pre').scrollWidth>document.querySelector('.help-code pre').clientWidth"));await capture('long-content-320.png',true);
  await load('/questions',390,844);await evaluate("document.querySelector('#question-search').focus()");
  await key('Tab',9);await key('Tab',9,8);assert.equal(await evaluate('document.activeElement.id'),'question-search');
  assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineWidth'),'2px');await capture('search-focus-390.png');
  const fields=await evaluate("Array.from(document.querySelectorAll('.help-filters input,.help-filters select')).map(e=>({id:e.id,label:document.querySelector('label[for='+e.id+']')?.textContent}))");assert.ok(fields.every(f=>f.label));
  await evaluate("document.querySelector('.public-menu summary').focus()");await key('Enter',13);await delay(220);assert.equal(await evaluate('document.querySelector(".public-menu").open'),true);await key('Escape',27);assert.equal(await evaluate('document.querySelector(".public-menu").open'),false);assert.equal(await evaluate('document.activeElement.tagName'),'SUMMARY');
  await send('Emulation.setDeviceMetricsOverride',{width:720,height:500,deviceScaleFactor:2,mobile:false});await widthCheck();await capture('reflow-200.png',true);
  await load('/');await click('.home-question h3 a');await routeWait('/questions/demo-jwt');assert.ok((await evaluate('document.querySelector("h1").textContent')).includes('JWT'));
  await load('/questions?q=React');await send('Emulation.setScriptExecutionDisabled',{value:true});await send('Page.navigate',{url:origin+'/questions?q=React'});await delay(800);assert.ok((await evaluate('document.querySelector(".help-list-heading p").textContent')).includes('2 questions'));await send('Emulation.setScriptExecutionDisabled',{value:false});
  assert.equal(errors.length,0);assert.equal(apiRequests.length,0);
  fs.writeFileSync(path.join(artifact,'checks.json'),JSON.stringify({browser:browser.product,views:reports,serverStartedForReview:Boolean(server),errors,apiRequests,checks:['Recherche, filtres combinés, reset et page réinitialisée','Pagination, paramètres invalides, détail/retour et lien accueil','États injectés de développement et réessai local','Clavier, focus, labels, menu, code long sûr, reduced motion et sans JavaScript']},null,2)+'\n');
  console.log('Revue JokkoHelp réussie.');
}catch(error){console.error(error);process.exitCode=1;}finally{socket?.close();for(const child of processes.reverse()){try{stop(child);}catch(error){console.error('Arrêt à vérifier',child.pid,error.message);process.exitCode=1;}}console.log('Serveur et navigateur de revue arrêtés.');}
