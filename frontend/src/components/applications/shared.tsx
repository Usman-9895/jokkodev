import Link from 'next/link';
import {Card,Heading,LoadingIndicator,Message,Skeleton,StatusBadge} from '../ui';
import {developerPreviewHref,statusLabels} from '../../lib/applications/presentation';
import type {DemoApplicationStatus} from '../../lib/applications/presentation';
export function ApplicationBadge({status}:{status:DemoApplicationStatus}) { return <StatusBadge tone={status==='accepted'?'success':status==='refused'?'error':status==='pending'?'warning':'info'}>{statusLabels[status]}</StatusBadge>; }
export function DeveloperReadState({state,view,parameters={}}:{state:string;view:string;parameters?:Record<string,string>}) {
  if(state==='loading')return <div className="developer-state"><LoadingIndicator label="Chargement des exemples…"/>{[0,1,2].map(i=><Card key={i}><Skeleton style={{height:24,width:'60%'}}/><Skeleton/></Card>)}</div>;
  const title=state==='expired'?'Ta session a expiré':state==='denied'?'Accès réservé au responsable':state==='error'?'Impossible de charger cet espace':state==='no-results'?'Aucune candidature ne correspond':'Aucune activité pour le moment';
  return <Card className="developer-state"><Heading as="h2">{title}</Heading><Message tone={state==='error'?'error':'info'} title="État de démonstration">{state==='expired'?'Aucune donnée personnelle affichée. Aucun contrat de session réel disponible.':state==='denied'?'Un membre ordinaire ou un administrateur ne reçoit pas automatiquement accès aux demandes privées.':'Cet état est injecté localement, sans lecture backend.'}</Message>{state==='expired'?<Link className="jd-button jd-button--primary" href="/connexion">Aller à la connexion</Link>:state==='denied'?<Link className="jd-button jd-button--secondary" href="/projets">Explorer les projets publics</Link>:<Link className="jd-button jd-button--secondary" href={developerPreviewHref(view,parameters)}>Réessayer l’aperçu</Link>}</Card>;
}
