'use client';
import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';

/** Progressive enhancement: content remains readable without JS or when motion is reduced. */
function observeReveals(elements:HTMLElement[]){
 const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 if(motion.matches||!('IntersectionObserver' in window))return()=>{};
 const reveal=(element:HTMLElement,instant=false)=>{
  element.classList.remove('jd-reveal-pending');
  if(!instant)element.classList.add('jd-reveal-once');
  observer.unobserve(element);
 };
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting)reveal(entry.target as HTMLElement);
 },{threshold:0.06,rootMargin:'0px 0px -16px 0px'});
 for(const element of elements){
  // Already visible blocks stay visible; only below-the-fold content is prepared for its entrance.
  if(element.getBoundingClientRect().top>=window.innerHeight)element.classList.add('jd-reveal-pending');
  observer.observe(element);
 }
 const focus=(event:FocusEvent)=>{for(const element of elements)if(element.contains(event.target as Node))reveal(element,true);};
 const reduce=()=>{if(motion.matches){observer.disconnect();for(const element of elements)element.classList.remove('jd-reveal-pending','jd-reveal-once');}};
 document.addEventListener('focusin',focus);motion.addEventListener('change',reduce);
 return()=>{observer.disconnect();document.removeEventListener('focusin',focus);motion.removeEventListener('change',reduce);for(const element of elements)element.classList.remove('jd-reveal-pending');};
}

export function Reveal({children,className=''}:{children:ReactNode;className?:string}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>ref.current?observeReveals([ref.current]):undefined,[]);
 return <div ref={ref} className={className}>{children}</div>;
}

/** Observe marked native sections/cards without wrappers that would change the page grids. */
export function ScrollReveals(){
 const pathname=usePathname();
 useEffect(()=>observeReveals(Array.from(document.querySelectorAll<HTMLElement>('#contenu [data-reveal]'))),[pathname]);
 return null;
}
