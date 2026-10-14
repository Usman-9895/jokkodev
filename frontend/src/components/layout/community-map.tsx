import Image from 'next/image';
/** Carte Natural Earth et réseau décoratif déjà utilisés par JokkoHelp. */
export function CommunityMap(){return <div className="help-map" aria-hidden="true"><Image src="/illustrations/africa-natural-earth.svg" width={340} height={340} alt=""/><svg viewBox="0 0 340 340" fill="none"><path d="M60 70 140 92 211 69 247 145 161 229 208 291M60 70 247 145M140 92 161 229 208 291"/>{[[60,70],[140,92],[211,69],[247,145],[161,229],[208,291]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="6"/>)}</svg><p>Des développeurs,<br/>une Afrique plus forte</p></div>;}
