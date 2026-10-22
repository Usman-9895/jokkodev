'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from '../ui';
function MedallionIcon({ type }: { type: 'code' | 'users' | 'gear' | 'bulb' }) {
  if (type === 'code' || type === 'users') return <Icon name={type} />;
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" focusable="false">{type === 'bulb' ? <><path d="M8 15c-5-5-2-12 4-12s9 7 4 12l-1 3H9l-1-3Z" /><path d="M9 18h6M10 21h4M12 10v8" /></> : <><path d="m9 3 1-2h4l1 2 2 1 2-1 2 3-1 2v3l2 1-1 4-2 1-1 2v2h-4l-1-2-3-1-2 1-2-3 1-2V9L4 8l1-4 2 1 2-2Z" transform="translate(0 1) scale(.9)" /><circle cx="12" cy="12" r="3" /></>}</svg>;
}
export function BrandIllustration() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const preference = () => setReduced(media.matches);
    const visibility = () => setHidden(document.hidden);
    preference(); visibility(); setReady(true);
    media.addEventListener('change', preference);
    document.addEventListener('visibilitychange', visibility);
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { threshold: 0.1 }) : undefined;
    if (!observer) setVisible(true);
    if (ref.current) observer?.observe(ref.current);
    return () => { observer?.disconnect(); media.removeEventListener('change', preference); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const controlLabel=reduced?'Animation désactivée : mouvement réduit':userPaused?'Reprendre l’animation':'Mettre l’animation en pause';
  const paused = !ready || !visible || hidden || reduced || userPaused;
  return <div className="brand-illustration" ref={ref} data-paused={paused} data-user-paused={userPaused} data-reduced={reduced}>
    <div className="brand-scene" aria-hidden="true">
      <Image className="brand-africa" src="/illustrations/africa-natural-earth.svg" alt="" width={340} height={340} />
      <svg className="brand-network" viewBox="0 0 400 360" fill="none" aria-hidden="true"><ellipse cx="200" cy="180" rx="170" ry="135" /><ellipse cx="200" cy="180" rx="138" ry="166" transform="rotate(-30 200 180)" /><path d="M40 97 71 125 61 217 106 294 269 294 337 217 359 269 331 126 302 60 139 44 40 97M61 217 93 175 106 294M331 126 337 217 269 294" />{[[40,97],[71,125],[61,217],[106,294],[269,294],[337,217],[359,269],[331,126],[302,60],[139,44],[93,175]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r={i%3===0?6:4} className={i%2===0?'network-dot':'network-dot network-dot--dark'} />)}</svg>
      <div className="brand-logo-card"><Image src="/brand/jokkodev-original.png" width={826} height={990} alt="" priority /></div>
      <div className="brand-orbit">{(['code','users','gear','bulb'] as const).map((type,index)=><div className={`brand-position brand-position--${type}`} key={type} style={{'--angle':`${[-135,-45,135,45][index]}deg`} as CSSProperties}><div className="brand-medallion"><MedallionIcon type={type} /></div></div>)}</div>
    </div>
    <button type="button" className="brand-animation-control" hidden={!ready} disabled={reduced} aria-label={controlLabel} title={controlLabel} aria-pressed={userPaused} onClick={() => setUserPaused(value => !value)}><Icon name={!reduced&&userPaused?'play':'pause'}/></button>
  </div>;
}
