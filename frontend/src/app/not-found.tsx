import Link from 'next/link';
import {Brand} from '../components/layout/brand';
import {PublicFooter} from '../components/layout/public-footer';
import {NotFoundContent} from '../components/not-found-content';
export const metadata={title:'Page introuvable | JokkoDev',robots:{index:false,follow:true}};
export default function NotFound(){return <div className="public-site"><header className="jd-not-found__header"><Link href="/" aria-label="JokkoDev — accueil"><Brand decorative/></Link></header><main id="contenu" tabIndex={-1}><NotFoundContent/></main><PublicFooter/></div>;}
