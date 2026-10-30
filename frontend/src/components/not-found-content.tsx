import Link from 'next/link';
import {Icon} from './ui';
export function NotFoundContent(){return <section className="jd-not-found" aria-labelledby="not-found-title">
 <div className="jd-not-found__art" aria-hidden="true"><span>4</span><span className="jd-not-found__zero"><Icon name="code"/></span><span>4</span><i/><i/></div>
 <p className="jd-not-found__eyebrow">UN LIEN ÉGARÉ, LA COMMUNAUTÉ TOUT PRÈS.</p>
 <h1 id="not-found-title">Cette page reste à trouver.</h1>
 <p className="jd-not-found__description">Ce lien est peut-être incorrect, ou le contenu n’est plus disponible. Retrouvons le bon chemin.</p>
 <div className="jd-not-found__actions"><Link className="jd-button jd-button--primary" href="/">Retour à l’accueil <Icon name="arrow-right"/></Link><Link className="jd-button jd-button--secondary" href="/questions">Explorer les questions</Link></div>
 <div className="jd-not-found__destinations"><Link href="/projets"><Icon name="users"/><span>Une idée à construire ?<strong>Découvrir les projets →</strong></span></Link><Link href="/contact"><Icon name="info"/><span>Un lien à nous signaler ?<strong>Contacter l’équipe →</strong></span></Link></div>
 </section>;}
