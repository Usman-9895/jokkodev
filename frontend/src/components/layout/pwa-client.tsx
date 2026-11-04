'use client';
import {useEffect} from 'react';
export function PwaClient(){
 useEffect(()=>{
  if(process.env.NODE_ENV!=='production')return;
  const script=document.createElement('script');script.src='/pwa-client.js';script.async=true;document.head.append(script);
  return()=>{script.remove();};
 },[]);
 return <div id="jd-pwa-tools" data-enabled={process.env.NODE_ENV==='production'}/>;
}
