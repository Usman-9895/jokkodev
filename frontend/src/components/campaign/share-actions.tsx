'use client';
import {useState} from 'react';
import {Button} from '../ui/button';
const url='https://jokkodev.com/cadev';
export function CampaignShare(){
 const [message,setMessage]=useState('');
 const [manual,setManual]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(url);setMessage('Lien copié.');setManual(false);}catch{setMessage('La copie automatique est indisponible. Sélectionne le lien ci-dessous pour le copier.');setManual(true);}}
 async function share(){if(!navigator.share){await copy();return;}try{await navigator.share({title:'JokkoDev — S’entraider, puis construire ensemble',text:'Découvre JokkoHelp, JokkoProjects et des guides accessibles hors connexion.',url});setMessage('Lien transmis à l’outil de partage.');}catch(error){if(error instanceof Error&&error.name==='AbortError'){setMessage('Partage annulé.');}else{setMessage('Partage indisponible. Tu peux copier le lien.');}}}
 return <div className="campaign-share"><div className="campaign-share__buttons"><Button variant="secondary" onClick={share}>Partager la page</Button><Button variant="quiet" onClick={copy}>Copier le lien</Button></div><p role="status" className="campaign-status">{message}</p>{manual&&<label className="campaign-manual">Lien à copier<input readOnly value={url} onFocus={e=>e.currentTarget.select()}/></label>}</div>;
}
