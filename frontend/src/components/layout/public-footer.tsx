import Link from 'next/link';
import {Container} from './container';
import {Brand} from './brand';

const groups=[
 {title:'Découvrir',links:[{href:'/a-propos',label:'À propos'},{href:'/ressources',label:'Ressources'},{href:'/contact',label:'Contact'}]},
 {title:'Notre communauté',links:[{href:'/regles',label:'Règles communautaires'},{href:'/confidentialite',label:'Confidentialité'}]},
];
export function PublicFooter(){
 return <footer className="public-footer"><Container className="footer-layout">
  <div className="footer-brand"><Link href="/" aria-label="JokkoDev — accueil"><Brand decorative/></Link><p>Une initiative de <strong>DevTeranga</strong>, au Sénégal.</p><p>Connectons les talents, partageons les solutions.</p></div>
  <nav className="footer-directory" aria-label="Informations">{groups.map(group=><div className="footer-group" key={group.title}><h2>{group.title}</h2><ul>{group.links.map(link=><li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul></div>)}</nav>
  <p className="footer-note">JokkoDev · DevTeranga · CADEV 2026</p>
 </Container></footer>;
}
