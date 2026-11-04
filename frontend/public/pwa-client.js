/* global window, document, navigator, localStorage */
(()=>{
 const root=document.getElementById('jd-pwa-tools');
 if(!root||root.dataset.enabled!=='true'||root.dataset.mounted||!('serviceWorker' in navigator)||!window.isSecureContext)return;
 root.dataset.mounted='true';
 let install=null,waiting=null,reload=false,registration=null,ready=false;
 const key='jokkodev.pwa.install-dismissed-at';let dismissed=0;
 try{dismissed=Number(localStorage.getItem(key))||0;}catch{/* Refusal also works in memory. */}
 const button=(text,action)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',action);return b;};
 function dismiss(){dismissed=Date.now();try{localStorage.setItem(key,String(dismissed));}catch{/* Memory only. */}install=null;render();}
 function activate(){if(!waiting)return;reload=true;waiting.postMessage({type:'ACTIVATE_UPDATE'});}
 function update(){
  if(!document.querySelector('form')){activate();return;}
  const dialog=document.createElement('dialog');dialog.className='jd-pwa-dialog';dialog.setAttribute('aria-label','Actualiser JokkoDev ?');
  const text=document.createElement('p');text.textContent='Un formulaire est ouvert. Actualiser peut effacer ta saisie. Tu peux annuler et terminer avant de mettre à jour.';
  const close=()=>{dialog.close();dialog.remove();root.querySelector('button')?.focus();};
  const cancel=button('Continuer ma saisie',close);const yes=button('Actualiser maintenant',()=>{close();activate();});
  dialog.append(text,cancel,yes);dialog.addEventListener('cancel',()=>{dialog.remove();root.querySelector('button')?.focus();});document.body.append(dialog);dialog.showModal();cancel.focus();
 }
 function render(){
  root.replaceChildren();if(!ready&&!waiting&&!install)return;
  const bar=document.createElement('aside');bar.className='jd-pwa-bar';bar.setAttribute('aria-label','Application JokkoDev');
  const p=document.createElement('p');p.textContent=waiting?'Une nouvelle version est disponible. Actualise quand ta saisie est terminée.':'JokkoDev peut garder ses guides publics sur cet appareil pendant 24 heures.';bar.append(p);
  if(waiting)bar.append(button('Actualiser',update));
  else{const link=document.createElement('a');link.href='/hors-connexion';link.textContent='Lecture hors connexion';bar.append(link);}
  if(install)bar.append(button('Installer JokkoDev',async()=>{const prompt=install;install=null;render();try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='dismissed')dismiss();}catch{dismiss();}}),button('Pas maintenant',dismiss));
  root.append(bar);
 }
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  if(Date.now()-dismissed<7*24*60*60*1000||window.matchMedia('(display-mode: standalone)').matches)return;
  install=event;render();
 });
 window.addEventListener('appinstalled',()=>{install=null;render();});
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reload)window.location.reload();});
 const meta=()=>{let m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.name='theme-color';document.head.append(m);}m.content=document.documentElement.dataset.theme==='dark'?'#071C29':'#FFFFFF';};
 window.addEventListener('jokkodev:theme-change',meta);meta();
 navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(reg=>{
  registration=reg;const inspect=()=>{waiting=reg.waiting;render();};inspect();
  reg.addEventListener('updatefound',()=>{reg.installing?.addEventListener('statechange',inspect);});
  const refresh=()=>{if(navigator.onLine)reg.active?.postMessage({type:'REFRESH_PUBLIC_READING'});};
  navigator.serviceWorker.ready.then(()=>{ready=true;refresh();inspect();});
  const check=()=>{if(navigator.onLine){refresh();void registration.update().catch(()=>{});}};
  window.addEventListener('online',check);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check();});
 }).catch(()=>{/* Browsing remains available when installation or storage is refused. */});
})();
