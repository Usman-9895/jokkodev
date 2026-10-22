'use client';
import Image from 'next/image';
import {useState} from 'react';
export function Avatar(props: { name: string; photoUrl?:string|null; preview?:boolean; size?: 'sm' | 'md' | 'lg'; decorative?: boolean }) { return <AvatarImage key={props.photoUrl??'initials'} {...props}/>; }
function AvatarImage({ name, photoUrl, preview=false, size = 'md', decorative = false }: { name: string; photoUrl?:string|null; preview?:boolean; size?: 'sm' | 'md' | 'lg'; decorative?: boolean }) {
  const [failed,setFailed]=useState(false);
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const initials = (words.length > 1 ? [words[0], words.at(-1)!] : words).map(word => Array.from(word)[0]).join('').toLocaleUpperCase('fr') || '?';
  const safe=photoUrl&&(/^\/api\/v1\/users\/photos\/jd-[a-f0-9]{32}\.jpg$/.test(photoUrl)||preview&&photoUrl.startsWith('blob:'));
  return <span className={`jd-avatar jd-avatar--${size}`} style={{overflow:'hidden',flexShrink:0}} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : `Avatar de ${name || 'profil inconnu'}`} aria-hidden={decorative || undefined}>{safe&&!failed?<Image src={photoUrl} alt="" width={96} height={96} unoptimized style={{width:'100%',height:'100%',objectFit:'cover'}} onError={()=>setFailed(true)}/>:initials}</span>;
}
