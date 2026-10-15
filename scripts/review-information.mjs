import {clearTimeout} from 'node:timers';
// Revue HTTP/DOM et captures réelles, sans dépendance de test ajoutée.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Buffer } from 'node:buffer';

const root = process.cwd();
const port = Number(process.env.INFORMATION_REVIEW_PORT || 3000);
const origin = `http://localhost:${port}`;
const debugPort=Number(process.env.INFORMATION_REVIEW_DEBUG_PORT||9228);
const artifact = path.join(root, '.cache/design-system/lot-9');
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
  for (const checkedPort of [port, debugPort].filter(value => value !== port || process.env.INFORMATION_REVIEW_REUSE !== '1')) {
    try { await fetch(`http://127.0.0.1:${checkedPort}`, { signal: AbortSignal.timeout(500) }); throw Error(`Port ${checkedPort} occupé ; libérer ce port avant la revue.`); }
    catch (error) { if (error.message.includes('occupé')) throw error; }
  }
  if(process.env.INFORMATION_REVIEW_REUSE !== '1') launch(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', String(port), '--hostname', '127.0.0.1'], path.join(root, 'frontend'));
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
    await until(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
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
  const views=[['/regles','rules'],['/contact','contact'],['/dev/informations','privacy-draft'],['/confidentialite','privacy-public']];
  for(const [width,height] of [[1440,1000],[768,1024],[390,844],[320,800]]) {
    for(const [route,name] of views){await load(route,width,height);await widthCheck();assert.equal(await evaluate('document.querySelectorAll("h1").length'),1);assert.equal(await evaluate('document.querySelectorAll("main").length'),1);assert.ok(await evaluate('Array.from(document.fonts).some(f=>f.status==="loaded"&&f.family==="sourceSerif")'));assert.ok(await evaluate('document.title.includes("JokkoDev")'));assert.ok(await evaluate('!Array.from(document.querySelectorAll("header a,footer a")).some(a=>a.getAttribute("href").startsWith("/dev/"))'));await capture(name+'-'+width+'.png',true);reports.push({route,width,height,overflow:false,headings:await evaluate('Array.from(document.querySelectorAll("h1,h2")).map(x=>({level:x.tagName,text:x.textContent}))')});}
  }
  await load('/contact');assert.equal(await evaluate('document.querySelectorAll("form,a[href^=mailto],a[href^=tel]").length'),0);assert.ok(await evaluate('document.querySelector(".contact-cards button").disabled'));await click('a[href="/regles#signalement"]');await until('location.pathname==="/regles"&&location.hash==="#signalement"');await click('.information-actions a[href="/contact"]');await until('location.pathname==="/contact"');
  await load('/regles');await evaluate('document.activeElement.blur()');await key('Tab',9);assert.equal(await evaluate('document.activeElement.className'),'jd-skip-link');await key('Enter',13);await until('document.activeElement.id==="contenu"');assert.ok(await evaluate('getComputedStyle(document.activeElement).outlineStyle!=="none"'));await capture('rules-skip-focus-390.png');
  await load('/contact');await click('.public-menu summary');assert.ok(await evaluate('document.querySelector(".public-menu").open'));await key('Escape',27);assert.ok(await evaluate('!document.querySelector(".public-menu").open&&document.activeElement.matches("summary")'));await capture('contact-menu-focus-390.png');
  for(const [route,selector] of [['/questions?q=session&status=resolved','a[href*="/questions/demo-"]'],['/projets?q=outil&status=open','a[href*="/projets/demo-"]']]){
    await load(route);const target=await evaluate(`document.querySelector(${JSON.stringify(selector)})?.getAttribute('href')`);assert.ok(target,'Lien vers détail '+route);await click(selector);await until('location.pathname.includes("demo-")');await widthCheck();const returnSelector=route.startsWith('/questions')?'.help-breadcrumb a':'.help-breadcrumb a';await click(returnSelector);await until('!location.pathname.includes("demo-")');assert.equal(await evaluate('location.pathname+location.search'),route);reports.push({journey:route,returnPreserved:true});
  }
  for(const width of [1440,768,390,320])for(const route of ['/','/questions','/projets','/connexion','/dev/espace','/dev/moderation']){await load(route,width,width>390?1000:844);await widthCheck();assert.ok(await evaluate('Boolean(document.querySelector("#contenu"))'));if(width===320)await capture('regression-'+(route.slice(1).replaceAll('/','-')||'home')+'-320.png',true);}
  await load('/',1440,1000);for(const href of ['/questions','/projets']){await click('.public-nav a[href="'+href+'"],.home-actions a[href="'+href+'"]');await until('location.pathname==='+JSON.stringify(href));await load('/',1440,1000);}
  for(const route of ['/connexion','/inscription','/mot-de-passe-oublie','/nouveau-mot-de-passe','/verification-email']){await load(route);assert.equal(await evaluate('document.querySelectorAll("main").length'),1);assert.ok(await evaluate('document.querySelector("h1").textContent.length>0'));const links=await evaluate('Array.from(document.querySelectorAll("a")).map(a=>a.getAttribute("href")).filter(x=>x?.startsWith("/"))');for(const link of links){const r=await fetch(origin+link);assert.ok(r.status<400,link);}}
  await load('/dev/espace');for(const label of ['Mes questions','Mes projets','Mes candidatures','Demandes reçues']){const href=await evaluate(`Array.from(document.querySelectorAll('.developer-navigation a')).find(a=>a.textContent.includes(${JSON.stringify(label)})).getAttribute('href')`);await load(href);assert.ok(await evaluate('document.querySelector(".developer-navigation a[aria-current=page]").textContent.includes('+JSON.stringify(label)+')'));await widthCheck();}await load('/dev/espace');await click('.developer-navigation a[href*="comptes"]');await until('location.pathname==="/dev/comptes"');await widthCheck();
  for(const route of ['/questions/demo-session-nestjs','/projets/demo-associations']){await load(route);const target=await evaluate('document.querySelector(".report-entry").getAttribute("href")');await load(target);assert.ok(await evaluate('document.body.textContent.includes("indisponible")'));assert.equal(await evaluate('document.querySelectorAll("form").length'),0);}
  await load('/',390);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await until('!document.querySelector(".brand-animation-control").disabled');await click('.brand-animation-control');assert.equal(await evaluate('document.querySelector(".brand-illustration").dataset.paused'),'true');await capture('home-pause-390.png');await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});assert.equal(await evaluate('getComputedStyle(document.querySelector(".brand-orbit")).animationName'),'none');
  // Tentative de véritable raccourci de zoom navigateur ; aucune émulation CSS présentée comme zoom.
  await load('/regles',1440,1000);await send('Emulation.clearDeviceMetricsOverride');const before=await evaluate('({ratio:devicePixelRatio,width:innerWidth})');await key('+',187,2);await key('+',187,2);await key('+',187,2);await key('+',187,2);await delay(500);const after=await evaluate('({ratio:devicePixelRatio,width:innerWidth})');const zoom={before,after,real200Percent:Math.abs(after.ratio/before.ratio-2)<.05};await key('0',48,2);reports.push({browserZoomAttempt:zoom});
  const links=new Set();for(const route of ['/','/regles','/confidentialite','/contact','/dev/espace','/dev/moderation']){await load(route);for(const href of await evaluate('Array.from(document.querySelectorAll("header a,footer a,.developer-navigation a,.admin-sidebar a")).map(a=>a.getAttribute("href")).filter(h=>h&&h.startsWith("/"))'))links.add(href);}for(const href of links){const r=await fetch(origin+href);assert.ok(r.status<400,href+' HTTP '+r.status);}reports.push({checkedSharedLinks:[...links]});
  assert.deepEqual(errors,[]);assert.deepEqual(apiRequests,[]);fs.writeFileSync(path.join(artifact,'checks.json'),JSON.stringify({browser:browser.product,views:reports,errors,apiRequests},null,2));console.log('Revue information et parcours terminée : '+reports.length+' relevés ; '+JSON.stringify(zoom));
} finally {if(socket)socket.close();for(const child of processes.reverse())stop(child);}
