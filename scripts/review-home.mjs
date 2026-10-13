// Revue HTTP/DOM et captures réelles, sans dépendance de test ajoutée.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { Buffer } from 'node:buffer';

const root = process.cwd();
const artifact = path.join(root, '.cache/design-system/lot-2');
const chromePath = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/chromium', '/usr/bin/google-chrome'].find(file => fs.existsSync(file));
if (!chromePath) throw Error('Chrome/Chromium manque. Définir CHROME_PATH vers un navigateur installé ; aucune installation automatique.');
fs.mkdirSync(artifact, { recursive: true });
const processes = [], reports = [], orbitReports = [];
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
  for (const port of [3000, 9223]) {
    try { await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(500) }); throw Error(`Port ${port} occupé ; libérer ce port avant la revue.`); }
    catch (error) { if (error.message.includes('occupé')) throw error; }
  }
  const server = launch(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', '3000', '--hostname', '127.0.0.1'], path.join(root, 'frontend'));
  await waitHttp('http://127.0.0.1:3000');
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
  async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.text); return result.result.value; }
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
  async function loadHome(width, height) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://127.0.0.1:3000/' });
    for (let i = 0; i < 150; i++) { if (await evaluate("document.querySelector('.brand-animation-control')?.hidden===false")) break; await delay(100); }
    await evaluate("(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(image=>image.decode()));const portal=document.querySelector('nextjs-portal');if(portal)portal.style.display='none';})()");
    await delay(600);
  }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  const browser = await send('Browser.getVersion');
  const selectedWidths = process.env.HOME_REVIEW_WIDTHS?.split(',').map(Number);
  for (const [width, height] of [[1440, 1000], [768, 1024], [390, 844], [320, 800]].filter(([width]) => !selectedWidths || selectedWidths.includes(width))) {
    await loadHome(width, height);
    await click('.brand-animation-control'); await delay(100);
    assert.equal(await evaluate("document.querySelector('.brand-illustration').dataset.userPaused"), 'true');
    await evaluate("document.getAnimations().filter(a=>a.effect.target.matches('.brand-orbit,.brand-medallion,.brand-logo-card')).forEach(a=>a.currentTime=0);window.scrollTo(0,0)");
    await delay(500); // Attendre aussi une révélation déclenchée par le scroll de la commande.
    const report = await evaluate(`(()=>{const r=el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height}};return {width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,images:Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0),fonts:Array.from(document.fonts).map(f=>({family:f.family,status:f.status})),title:r(document.querySelector('h1')),scene:r(document.querySelector('.brand-scene')),visible:Array.from(document.querySelectorAll('.home-features,.home-questions')).every(el=>getComputedStyle(el).opacity==='1'),buttons:Array.from(document.querySelectorAll('.home-actions a')).map(r)}})()`);
    assert.equal(report.width, report.scrollWidth); assert.ok(report.images && report.visible, JSON.stringify({images:report.images,visible:report.visible})); assert.ok(report.buttons.every(button => button.height >= 44));
    assert.ok(['inter', 'sourceSerif', 'jetbrainsMono'].slice(0, 2).every(f => report.fonts.some(face => face.family === f && face.status === 'loaded')));
    reports.push({ requestedWidth: width, requestedHeight: height, ...report });
    await capture(`home-${width}.png`, true);
    if (width < 768) {
      await evaluate("document.querySelector('.public-menu summary').focus()"); await key('Enter', 13); await delay(240);
      assert.equal(await evaluate("document.querySelector('.public-menu').open"), true, await evaluate("JSON.stringify({focus:document.activeElement.tagName,width:innerWidth,display:getComputedStyle(document.querySelector('.public-menu')).display,menu:document.querySelector('.public-menu').outerHTML.slice(0,250)})"));
      assert.equal(await evaluate("document.querySelector('.public-menu summary').getAttribute('aria-expanded')"), 'true');
      await key('Tab', 9); assert.equal(await evaluate("document.activeElement.getAttribute('href')"), '/questions');
      await capture(`menu-${width}.png`);
      await key('Escape', 27); await delay(240);
      assert.equal(await evaluate("document.querySelector('.public-menu').open"), false);
      assert.equal(await evaluate("document.activeElement.tagName"), 'SUMMARY');
      await key('Tab', 9); assert.equal(await evaluate("document.activeElement.getAttribute('href')"), '/questions/poser');
      await evaluate("document.querySelector('.public-menu summary').focus()"); await key('Enter', 13); await delay(240);
      await click('#navigation-mobile a');
      for (let attempt=0;attempt<100;attempt++) { if ((await evaluate('location.pathname')).startsWith('/questions')) break; await delay(100); }
      assert.ok((await evaluate('location.pathname')).startsWith('/questions'));
      assert.equal(await evaluate("document.querySelector('.public-menu').open"), false);
      await loadHome(width, height);
    }
    // Orbite réellement exécutée en temps réel ; toutes les positions doivent rester dans la scène.
    if (await evaluate("document.querySelector('.brand-illustration').dataset.userPaused==='true'")) await click('.brand-animation-control');
    await evaluate("window.scrollTo(0,0);document.getAnimations().filter(a=>a.effect.target.matches('.brand-orbit,.brand-medallion,.brand-logo-card')).forEach(a=>a.currentTime=0)");
    if (width === 390) { videoFrames.length = 0; await send('Page.startScreencast', { format: 'jpeg', quality: 72, maxWidth: 520, maxHeight: 844, everyNthFrame: 5 }); }
    const start = Date.now(); let samples = 0, maxTilt = 0;
    while (Date.now() - start < 36500) {
      const state = await evaluate(`(()=>{const scene=document.querySelector('.brand-scene').getBoundingClientRect();const orbit=new DOMMatrix(getComputedStyle(document.querySelector('.brand-orbit')).transform);const nodes=Array.from(document.querySelectorAll('.brand-medallion'));const inside=nodes.every(el=>{const r=el.getBoundingClientRect();return r.left>=scene.left-1&&r.right<=scene.right+1&&r.top>=scene.top-1&&r.bottom<=scene.bottom+1});const tilt=Math.max(...nodes.map(el=>{const m=orbit.multiply(new DOMMatrix(getComputedStyle(el).transform));return Math.abs(Math.atan2(m.b,m.a)*180/Math.PI)}));return {inside,tilt,scene:scene.toJSON(),radius:getComputedStyle(document.querySelector('.brand-scene')).getPropertyValue('--orbit-radius'),rects:nodes.map(el=>el.getBoundingClientRect().toJSON()),paused:document.querySelector('.brand-illustration').dataset.paused,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth}})()`);
      assert.ok(state.inside, `Médaillon hors scène à ${width}px : ${JSON.stringify(state)}`); assert.equal(state.paused, 'false'); assert.ok(!state.overflow); assert.ok(state.tilt < 0.1, 'Pictogramme incliné');
      maxTilt = Math.max(maxTilt, state.tilt); samples++;
      if (samples === 25) await capture(`orbit-${width}.png`);
      await delay(300);
    }
    if (width === 390) {
      await send('Page.stopScreencast');
      // Preuve animée autonome ; JPEG natifs du screencast, pas une vidéo encodée.
      const frames = videoFrames.filter((_, i) => i % 3 === 0);
      fs.writeFileSync(path.join(artifact, 'illustration-motion.html'), `<html lang="fr"><meta charset="utf-8"><title>Relecture du mouvement JokkoDev</title><style>body{font:16px sans-serif;background:#f4f7f8}img{max-height:85vh}button{min-height:44px}</style><p>Capture animée Chrome · fenêtre 390 × 844 · une orbite réelle de 36 s</p><button id="toggle">Mettre la lecture en pause</button><br><img id="frame" alt="Enregistrement de la composition animée de l’accueil"><script>const frames=${JSON.stringify(frames)};let i=0,paused=false;const image=document.getElementById('frame');document.getElementById('toggle').onclick=e=>{paused=!paused;e.target.textContent=paused?'Reprendre la lecture':'Mettre la lecture en pause'};function show(){image.src='data:image/jpeg;base64,'+frames[i].data;const next=(i+1)%frames.length;const ms=next?Math.max(30,(frames[next].timestamp-frames[i].timestamp)*1000):150;if(!paused)i=next;setTimeout(show,ms)};show();</script></html>`);
      const excerpt = videoFrames.filter(frame => frame.timestamp - videoFrames[0].timestamp < 6);
      const video = await evaluate(`(async()=>{
        if(!globalThis.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)return null;
        const frames=${JSON.stringify(excerpt)};
        const canvas=document.createElement('canvas');canvas.width=390;canvas.height=844;
        const context=canvas.getContext('2d'),stream=canvas.captureStream(12);
        const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
        if(!mime){stream.getTracks().forEach(t=>t.stop());return null}
        const recorder=new MediaRecorder(stream,{mimeType:mime}),chunks=[];
        const done=new Promise(resolve=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=()=>resolve(new Blob(chunks,{type:mime}))});
        recorder.start();
        for(let i=0;i<frames.length;i++){const image=new Image();image.src='data:image/jpeg;base64,'+frames[i].data;await image.decode();context.drawImage(image,0,0,390,844);const gap=i+1<frames.length?(frames[i+1].timestamp-frames[i].timestamp)*1000:100;await new Promise(r=>setTimeout(r,Math.max(20,gap)))}
        recorder.stop();const blob=await done;stream.getTracks().forEach(t=>t.stop());
        return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob)})
      })()`);
      if(video)fs.writeFileSync(path.join(artifact,'illustration-390.webm'),Buffer.from(video,'base64'));
    }
    orbitReports.push({ width, elapsedMs: Date.now() - start, samples, maxTilt });
    console.log(`Orbite complète et clavier contrôlés : ${width}px, ${samples} positions.`);
  }
  fs.writeFileSync(path.join(artifact,'orbit-checks.json'),JSON.stringify({browser:browser.product,views:reports,orbits:orbitReports},null,2)+'\n');
  await loadHome(390, 844);
  await click('.brand-animation-control'); await key('Tab', 9); await delay(300);
  assert.equal(await evaluate("document.querySelector('.brand-illustration').dataset.userPaused"), 'true');
  const before = await evaluate("getComputedStyle(document.querySelector('.brand-orbit')).transform"); await delay(700);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.brand-orbit')).transform"), before);
  // Fenêtre moins haute pour que la scène sorte réellement du viewport sur cette page courte.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 400, deviceScaleFactor: 1, mobile: false });
  await evaluate('window.scrollTo(0,document.documentElement.scrollHeight)'); await delay(300);
  assert.equal(await evaluate("document.querySelector('.brand-illustration').dataset.paused"), 'true');
  await evaluate('window.scrollTo(0,0)'); await delay(300);
  assert.equal(await evaluate("document.querySelector('.brand-illustration').dataset.paused"), 'true');
  await click('.brand-animation-control'); await delay(100);
  assert.equal(await evaluate("document.querySelector('.brand-illustration').dataset.paused"), 'false');
  await evaluate('window.scrollTo(0,document.documentElement.scrollHeight)'); await delay(300);
  assert.equal(await evaluate("document.querySelector('.brand-illustration').dataset.paused"), 'true');
  await evaluate('window.scrollTo(0,0)'); await delay(300);
  assert.equal(await evaluate("document.querySelector('.brand-illustration').dataset.paused"), 'false');
  // Chrome headless ne fournit pas de vraie UI d’onglets : évènement visibilité simulé, limite documentée.
  await evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))"); await delay(100);
  assert.equal(await evaluate("document.querySelector('.brand-illustration').dataset.paused"), 'true');
  await evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))"); await delay(100);
  await click('.brand-animation-control');
  await evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))"); await delay(100);
  await evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))"); await delay(100);
  assert.equal(await evaluate("document.querySelector('.brand-illustration').dataset.paused"), 'true');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }); await delay(150);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.brand-orbit')).animationName"), 'none');
  assert.equal(await evaluate("document.querySelector('.brand-animation-control').disabled"), true);
  await capture('reduced-motion-390.png', true);
  await evaluate("document.querySelector('.public-menu summary').focus()"); await key('Enter', 13); await delay(240);
  assert.equal(await evaluate("document.querySelector('.public-menu').open"), true);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }); await delay(150);
  assert.equal(await evaluate("document.querySelector('.public-menu').open"), false);
  assert.equal(await evaluate("document.activeElement.className"), 'public-brand-link');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await send('Emulation.setScriptExecutionDisabled', { value: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/' }); await delay(1200);
  assert.ok(await evaluate("document.querySelector('.home-questions').getBoundingClientRect().height>0"));
  await evaluate("document.querySelector('.public-menu summary').focus()"); await key('Enter', 13); await delay(240);
  assert.equal(await evaluate("document.querySelector('.public-menu').open"), true);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.brand-orbit')).animationPlayState"), 'paused');
  await capture('no-javascript-390.png', true);
  await send('Emulation.setScriptExecutionDisabled', { value: false });
  const routes = {};
  for (const route of ['/questions', '/questions/poser', '/projets', '/inscription', '/a-propos', '/ressources', '/contact', '/connexion']) {
    const response = await fetch('http://127.0.0.1:3000' + route); routes[route] = response.status; assert.equal(response.status, 200);
  }
  assert.equal(errors.length, 0); assert.equal(apiRequests.length, 0);
  fs.writeFileSync(path.join(artifact, 'checks.json'), JSON.stringify({ browser: browser.product, views: reports, orbits: orbitReports, routes, errors, apiRequests, checks: ['Menu natif au clavier, Échap, focus restauré, liens, fermeture au breakpoint', 'Pause persistante après focus, scroll et visibilité simulée ; reprise explicite', 'Reduced motion, page/menu sans JavaScript', 'Orbites en temps réel, confinement et contre-rotation'], video: 'illustration-motion.html : screencast JPEG autonome, pas un fichier vidéo encodé', serverLog: server.log().slice(-1500) }, null, 2) + '\n');
  console.log('Revue accueil : toutes les assertions ont réussi.');
} catch (error) { console.error(error); process.exitCode = 1; }
finally { socket?.close(); for (const child of processes.reverse()) { try { stop(child); } catch (error) { console.error('Arrêt à vérifier', child.pid, error.message); process.exitCode = 1; } } console.log('Serveur et navigateur de revue arrêtés.'); }
