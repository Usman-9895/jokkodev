'use client';
import {useEffect,useRef,useState} from 'react';
import type {HelpSchemas} from '../../lib/jokkohelp/api';
import {useSession} from '../accounts/session-provider';
import {apiFailure} from '../../lib/accounts/session';
import {Button,Message} from '../ui';

type Selection = {localKey:string;id?:string;url:string;name:string;prepared:boolean;error?:string};
export function useQuestionImages(initial:HelpSchemas['QuestionImageDto'][]=[]) {
  const {client,phase}=useSession();
  const [images,setImages]=useState<Selection[]>(()=>initial.map((image,index)=>({...image,localKey:image.id,name:'Capture '+(index+1),prepared:false}))),[processing,setProcessing]=useState(false),[notice,setNotice]=useState(''),[online,setOnline]=useState(true);
  const input=useRef<HTMLInputElement>(null),busy=useRef(false),alive=useRef(true),urls=useRef(new Set<string>());
  useEffect(()=>{alive.current=true;const update=()=>setOnline(navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{alive.current=false;window.removeEventListener('online',update);window.removeEventListener('offline',update);for(const url of urls.current)URL.revokeObjectURL(url);urls.current.clear();};},[]);
  const ids=images.flatMap(image=>image.id?[image.id]:[]);
  const changed=JSON.stringify(ids)!==JSON.stringify(initial.map(image=>image.id))||images.some(image=>!image.id);
  async function select(files:FileList|null) {
    if(!files?.length||busy.current)return;
    if(!navigator.onLine||phase!=='authenticated'){setNotice('Une capture nécessite une connexion et une session vérifiée. Le texte reste disponible hors connexion.');return;}
    if(images.length+files.length>3){setNotice('Tu peux joindre trois captures au maximum. Retire une capture avant d’en choisir une autre.');return;}
    busy.current=true;setProcessing(true);setNotice('');
    try {
      for(const file of Array.from(files)) {
        const localKey=crypto.randomUUID();
        // This check is only early feedback. The API decodes the actual bytes independently.
        if(file.size>5*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)) {setNotice('Fichier refusé : PNG, JPEG ou WebP uniquement, 5 Mo par image.');continue;}
        const url=URL.createObjectURL(file);urls.current.add(url);
        setImages(current=>[...current,{localKey,url,name:file.name,prepared:true}]);
        try {
          const body=new FormData();body.append('file',file);
          const result=await client.mutate<HelpSchemas['PreparedQuestionImageDto']>('/question-images',body,'POST',true);
          if(!result?.id||!result.url)throw Error('upload');
          if(!alive.current){void client.mutate('/question-images/'+result.id,undefined,'DELETE',true).catch(()=>{});continue;}
          URL.revokeObjectURL(url);urls.current.delete(url);
          setImages(current=>current.map(image=>image.localKey===localKey?{...image,id:result.id,url:result.url}:image));
        } catch(error) {if(alive.current)setImages(current=>current.map(image=>image.localKey===localKey?{...image,error:apiFailure(error).message||'Préparation impossible. Retire cette capture puis sélectionne-la à nouveau en ligne.'}:image));}
      }
    } finally {busy.current=false;if(alive.current)setProcessing(false);if(input.current)input.current.value='';}
  }
  function remove(localKey:string) {
    const image=images.find(image=>image.localKey===localKey);if(!image||busy.current)return;
    if(urls.current.has(image.url)){URL.revokeObjectURL(image.url);urls.current.delete(image.url);}
    setImages(current=>current.filter(image=>image.localKey!==localKey));
    if(image.id&&image.prepared)void client.mutate('/question-images/'+image.id,undefined,'DELETE',true).catch(()=>{if(alive.current)setNotice('Capture retirée de la sélection. Sa préparation privée sera supprimée par le nettoyage si son retrait immédiat a échoué.');});
    requestAnimationFrame(()=>input.current?.focus());
  }
  return {ids,changed,selected:images.length>0,ready:!processing&&images.every(image=>!!image.id&&!image.error),processing,
    field:<section id="question-images" tabIndex={-1} className="question-images" aria-labelledby="question-images-label">
      <label id="question-images-label" htmlFor="question-images-input">Joindre des captures d’écran <span>(facultatif)</span></label>
      <p id="question-images-help">3 images maximum, 5 Mo par image. PNG, JPEG ou WebP non animé.</p>
      <p>Les captures seront publiques avec la question : masque tes informations sensibles avant de les joindre. La préparation reste privée jusqu’à la publication.</p>
      <details><summary>Dimensions et traitement des images</summary><p>4096 pixels par côté et 4 millions de pixels maximum. Les captures conservent leur cadrage, sont réduites à 2048 pixels maximum et converties en JPEG sans métadonnées. Une préparation expire après huit jours.</p></details>
      <input ref={input} id="question-images-input" type="file" multiple accept="image/png,image/jpeg,image/webp" aria-describedby="question-images-help question-images-offline" disabled={processing||!online||phase!=='authenticated'||images.length>=3} onChange={event=>void select(event.target.files)}/>
      <p id="question-images-offline">Brouillons et attente : texte uniquement. Une capture nécessite une connexion ; retire-la explicitement avant de mettre la question en attente.</p>
      {!online&&<Message tone="warning" title="Hors connexion">Le texte reste modifiable. Reconnecte-toi pour joindre ou publier une capture.</Message>}
      <div className="question-images-grid">{images.map((image,index)=><figure key={image.localKey}>
        {/* eslint-disable-next-line @next/next/no-img-element -- protected API or ephemeral local blob, never the Next image cache */}
        <img src={image.url} alt={'Aperçu de la capture '+(index+1)} width={320} height={200}/>
        <figcaption><span>{image.name}</span>{image.error?<p role="alert">{image.error}</p>:<p>{image.id?(image.prepared?'Préparée, privée jusqu’à publication':'Déjà publiée'):'Préparation en cours…'}</p>}<Button variant="secondary" disabled={processing} aria-label={'Retirer la capture '+(index+1)} onClick={()=>remove(image.localKey)}>Retirer</Button></figcaption>
      </figure>)}</div>
      <p role="status">{processing?'Préparation des captures en cours…':notice}</p>
    </section>
  };
}

export function QuestionImageGallery({images}:{images:HelpSchemas['QuestionImageDto'][]}) {
  return images.length?<section className="question-images question-images-gallery" aria-label="Captures d’écran de la question"><h2>Captures d’écran</h2><p>Ouvre une capture pour la consulter en taille complète.</p><div className="question-images-grid">{images.map((image,index)=><a key={image.id} href={image.url} target="_blank" rel="noreferrer" aria-label={'Ouvrir la capture '+(index+1)+' en taille complète (nouvel onglet)'}>
    {/* eslint-disable-next-line @next/next/no-img-element -- access must be checked by the API on every read, no image optimizer */}
    <img src={image.url} alt={'Capture d’écran '+(index+1)+' jointe par l’auteur'} width={640} height={400} loading="lazy"/><span>Capture {index+1} · Agrandir</span>
  </a>)}</div></section>:null;
}
