// Revue HTTP/DOM et captures réelles, sans dépendance de test ajoutée.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Buffer } from 'node:buffer';

const root = process.cwd();
const port = Number(process.env.CONTRIBUTIONS_REVIEW_PORT || 3000);
const origin = `http://localhost:${port}`;
const artifact = path.join(root, '.cache/design-system/lot-5');
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
  for (const checkedPort of [port, 9223].filter(value => value !== port || process.env.CONTRIBUTIONS_REVIEW_REUSE !== '1')) {
    try { await fetch(`http://127.0.0.1:${checkedPort}`, { signal: AbortSignal.timeout(500) }); throw Error(`Port ${checkedPort} occupé ; libérer ce port avant la revue.`); }
    catch (error) { if (error.message.includes('occupé')) throw error; }
  }
  const server = process.env.CONTRIBUTIONS_REVIEW_REUSE === '1' ? null : launch(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', String(port), '--hostname', '127.0.0.1'], path.join(root, 'frontend'));
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
    await send('Page.navigate',{url:origin+route});await delay(300);
    for(let i=0;i<150;i++){if(await evaluate("document.readyState==='complete'&&Boolean(document.querySelector('#contenu h1'))"))break;await delay(100);}
    await evaluate("(async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,8000))]);await Promise.race([Promise.all(Array.from(document.images).filter(i=>i.getClientRects().length).map(i=>i.decode())),new Promise(r=>setTimeout(r,8000))]);const p=document.querySelector('nextjs-portal');if(p)p.style.display='none'})()");await delay(400);
  }
  async function widthCheck(){assert.equal(await evaluate('document.documentElement.scrollWidth'),await evaluate('document.documentElement.clientWidth'),'Débordement de page');}
  const demo='/dev/jokkohelp-contributions';
  const views=[['/questions/poser','public-create'],[demo,'create'],[demo+'?view=edit','edit'],[demo+'?view=mine','mine'],[demo+'?view=detail','detail'],[demo+'?view=reply','reply']];
  for(const [width,height] of [[1440,1000],[768,1024],[390,844],[320,800]]){
    for(const [route,name] of views){
      await load(route,width,height);await widthCheck();
      const data=await evaluate("({fonts:Array.from(document.fonts).map(f=>({family:f.family,status:f.status})),images:Array.from(document.images).filter(i=>i.getClientRects().length).every(i=>i.naturalWidth>0),labels:Array.from(document.querySelectorAll('input,textarea,select')).every(e=>document.querySelector('label[for=\"'+e.id+'\"]'))})");
      assert.ok(data.images);assert.ok(data.labels);assert.ok(data.fonts.some(f=>f.family==='inter'&&f.status==='loaded'));assert.ok(data.fonts.some(f=>f.family==='sourceSerif'&&f.status==='loaded'));
      if(name==='public-create')assert.equal(await evaluate("document.querySelectorAll('form').length"),0);
      await capture(name+'-'+width+'.png',true);reports.push({name,width,height,...data});
    }
    console.log('Contributions examinées : '+width+'px');
  }
  await load(demo+'?state=empty');await click('.contribution-question button[type=submit]');await delay(150);
  assert.equal(await evaluate('document.activeElement.className'),'contribution-errors');assert.equal(await evaluate('document.querySelectorAll("[aria-invalid=true]").length'),3);await capture('create-validation-390.png',true);
  await load(demo);const title=await evaluate("document.querySelector('#question-title').value");await click('#question-title');await send('Input.insertText',{text:' — modifié'});
  assert.ok((await evaluate("document.querySelector('.contribution-dirty').textContent")).includes('non enregistrée'));
  await click('.contribution-question .contribution-dialog-trigger');assert.equal(await evaluate('document.querySelector("dialog").open'),true);assert.equal(await evaluate('document.activeElement.textContent'),'Annuler');for(let i=0;i<6;i++){await key('Tab',9);assert.equal(await evaluate('document.activeElement.closest("dialog")!==null'),true);}await key('Tab',9,8);assert.equal(await evaluate('document.activeElement.closest("dialog")!==null'),true);await capture('question-cancel-dialog-390.png');await key('Escape',27);assert.equal(await evaluate('document.querySelector("dialog").open'),false);assert.equal(await evaluate('document.activeElement.textContent'),'Annuler');
  await click('.contribution-question .contribution-dialog-trigger');await click('dialog button:last-child');assert.equal(await evaluate("document.querySelector('#question-title').value"),title);
  const tags=await evaluate("document.querySelectorAll('.contribution-technologies > div button').length");await click('.contribution-technologies > div button');assert.equal(await evaluate("document.querySelectorAll('.contribution-technologies > div button').length"),tags-1);assert.equal(await evaluate('document.activeElement.id'),'question-technologies');
  await evaluate("const s=document.querySelector('#question-technologies');s.value='React';s.dispatchEvent(new Event('change',{bubbles:true}))");assert.equal(await evaluate("document.querySelectorAll('.contribution-technologies > div button').length"),tags);
  await click('.contribution-question button[type=submit]');await delay(150);assert.ok((await evaluate("Array.from(document.querySelectorAll('.contribution-question .jd-message[role=status]')).map(e=>e.textContent).join(' ')")).includes('Aucune question'));
  await click('#question-title');await key('Tab',9);await key('Tab',9,8);assert.equal(await evaluate('document.activeElement.id'),'question-title');assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineWidth'),'2px');await capture('create-focus-390.png',true);
  await click('.contribution-question .contribution-dialog-trigger');if(await evaluate('document.querySelector("dialog").open'))await click('dialog button:last-child');
  for(const view of ['create','edit','reply'])for(const state of ['sending','error','success']){
    await load(demo+'?view='+view+'&state='+state);await widthCheck();await capture(view+'-'+state+'-390.png',true);
    if(state==='sending'){assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"),true);await evaluate("document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");assert.equal(await evaluate("document.querySelectorAll('.contribution-errors').length"),0);}
  }
  for(const state of ['loading','empty','error','unavailable']){await load(demo+'?view=mine&state='+state);await widthCheck();await capture('mine-'+state+'-390.png',true);}
  await load(demo+'?view=mine');const all=await evaluate("document.querySelectorAll('.contribution-mine-list > article').length");assert.equal(all,5);
  await click('.contribution-tabs a:nth-child(2)');await delay(600);assert.ok((await evaluate('location.search')).includes('filter=resolved'));assert.equal(await evaluate("document.querySelectorAll('.contribution-mine-list > article').length"),1);
  await click('.contribution-tabs a:nth-child(3)');await delay(600);assert.equal(await evaluate("document.querySelectorAll('.contribution-mine-list > article').length"),4);
  await click('.contribution-mine-list .contribution-actions a:last-child');await delay(600);assert.ok((await evaluate('location.search')).includes('view=edit'));assert.ok((await evaluate("document.querySelector('#question-title').value")).length>0);
  for(const perspective of ['visitor','member','author','suspended','administrator']){
    await load(demo+'?view=detail&perspective='+perspective);assert.equal(await evaluate("document.querySelectorAll('.contribution-solution').length"),perspective==='author'?2:0);
    assert.equal(await evaluate("document.querySelector('.contribution-reply button[type=submit]').disabled"),perspective==='visitor'||perspective==='suspended');
  }
  await load(demo+'?view=detail&perspective=author');const solutionCount=await evaluate("document.querySelectorAll('.help-answer--accepted').length");await click('.contribution-solution .jd-button');assert.equal(await evaluate('document.activeElement.textContent'),'Annuler');await key('Escape',27);assert.equal(await evaluate('document.querySelector("dialog").open'),false);
  await click('.contribution-solution .jd-button');await click('dialog[open] button:last-child');assert.equal(await evaluate("document.querySelectorAll('.help-answer--accepted').length"),solutionCount);assert.ok((await evaluate("document.querySelector('.contribution-solution [role=status]').textContent")).includes('Aucune solution'));await capture('solution-confirmation-390.png',true);
  await load(demo+'?view=reply');await click('.contribution-reply button[type=submit]');await delay(150);assert.equal(await evaluate('document.activeElement.className'),'contribution-errors');await capture('reply-validation-390.png',true);
  await click('#reply-text');await send('Input.insertText',{text:'Texte fictif <script>alert("non exécuté")</script>'});await click('#reply-code');await send('Input.insertText',{text:'const exemple = "'+'code'.repeat(200)+'";'});await click('.contribution-reply .contribution-actions button:last-child');await widthCheck();assert.equal(await evaluate("document.querySelectorAll('.contribution-reply script').length"),0);
  await click('.contribution-reply button[type=submit]');await delay(150);assert.ok((await evaluate("document.querySelector('.contribution-reply [role=status]').textContent")).includes('Aucune réponse'));await capture('reply-text-preview-390.png',true);
  await click('.contribution-reply .contribution-dialog-trigger');await click('dialog[open] button:last-child');assert.equal(await evaluate("document.querySelector('#reply-text').value"),'');
  for(const width of [1440,768,390,320]){await load(demo+'?state=long',width,width<400?844:1000);await click('.contribution-question .contribution-actions button:last-child');await widthCheck();await capture('create-long-'+width+'.png',true);}
  for(const route of ['/espace/questions','/questions/demo-react/modifier']){await load(route);assert.equal(await evaluate('document.querySelectorAll("input,textarea").length'),0);await capture(route.includes('espace')?'mine-unavailable-390.png':'edit-unavailable-390.png',true);}
  await load('/questions/demo-session-nestjs');assert.equal(await evaluate("document.querySelector('.contribution-reply button').disabled"),true);assert.equal(await evaluate("document.querySelectorAll('.contribution-solution').length"),0);
  await load('/questions/poser?state=success');assert.equal(await evaluate("document.querySelectorAll('form').length"),0);assert.equal(await evaluate("document.querySelectorAll('.contribution-question-grid > article:first-child > .jd-tone--success').length"),0);
  await evaluate("document.querySelector('.public-menu summary').focus()");await key('Enter',13);assert.equal(await evaluate('document.querySelector(".public-menu").open'),true);await key('Escape',27);assert.equal(await evaluate('document.querySelector(".public-menu").open'),false);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await load(demo);await widthCheck();await capture('create-normal-motion-390.png',true);
  await send('Emulation.setScriptExecutionDisabled',{value:true});await send('Page.navigate',{url:origin+'/questions/poser'});await delay(800);assert.equal(await evaluate("document.querySelectorAll('form').length"),0);assert.equal(await evaluate("document.querySelector('.contribution-question button').disabled"),true);await send('Emulation.setScriptExecutionDisabled',{value:false});
  assert.equal(errors.length,0);assert.equal(apiRequests.length,0);
  fs.writeFileSync(path.join(artifact,'checks.json'),JSON.stringify({browser:browser.product,serverStartedForReview:Boolean(server),views:reports,errors,apiRequests,checks:['Quatre largeurs, polices/images, labels et absence de débordement','Création/modification locales, validation, préremplissage, technologie et annulation clavier','Envoi simulé sans double soumission, aucune mutation API','Filtres personnels, liens détail/modification et perspectives fictives','Réponse textuelle sûre, solutions inchangées après confirmation locale','Consultation publique anonyme, actions désactivées, menu, mouvements réduits et sans JavaScript']},null,2)+'\n');
  console.log('Revue contributions réussie.');
}catch(error){console.error(error);process.exitCode=1;}finally{socket?.close();for(const child of processes.reverse()){try{stop(child);}catch(error){console.error('Arrêt à vérifier',child.pid,error.message);process.exitCode=1;}}console.log('Processus propres à la revue arrêtés.');}
