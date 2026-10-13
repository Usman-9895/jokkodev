'use client';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
/** Visible par défaut, même avant hydratation ou si JavaScript échoue. */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { element.classList.add('jd-reveal-once'); observer.disconnect(); }
    }, { threshold: 0.08 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}
