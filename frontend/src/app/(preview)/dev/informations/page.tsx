import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {PublicHeader} from '../../../../components/layout/public-header';
import {PublicFooter} from '../../../../components/layout/public-footer';
import {PrivacyWorkingPage} from '../../../../components/information/pages';
export const metadata:Metadata={title:'Confidentialité — version de travail | JokkoDev',robots:{index:false,follow:false}};
export default function Preview(){if(process.env.NODE_ENV!=='development')notFound();return <div className="public-site"><PublicHeader/><main id="contenu" tabIndex={-1}><PrivacyWorkingPage/></main><PublicFooter/></div>;}
