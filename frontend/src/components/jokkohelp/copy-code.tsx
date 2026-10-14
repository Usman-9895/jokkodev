'use client';
import {useEffect,useState} from 'react';
import {Button} from '../ui';
export function CopyCode({text,language}:{text:string;language:string}){
  const [feedback,setFeedback]=useState('');
  const [available,setAvailable]=useState(false);
  useEffect(()=>setAvailable(Boolean(navigator.clipboard?.writeText)),[]);
  return <span className="help-copy"><Button variant="quiet" disabled={!available} aria-label={`Copier l’extrait ${language}`} onClick={async()=>{try{await navigator.clipboard.writeText(text);setFeedback('Code copié.');}catch{setFeedback('Copie indisponible. Sélectionne le code.');}}}>{feedback==='Code copié.'?'Copié':'Copier'}</Button><span className="help-copy-feedback" role="status">{feedback}</span></span>;
}
