'use client';
import {useState} from 'react';
import {Message} from '../../ui';
import {LocalDialogAction} from './local-dialog';
/** Composant appelé uniquement par l’aperçu de développement, aucune mutation. */
export function SolutionAction({accepted}:{accepted:boolean}){
 const [feedback,setFeedback]=useState(false);
 return <div className="contribution-solution"><LocalDialogAction label={accepted?'Retirer la solution (démo)':'Accepter comme solution (démo)'} title={accepted?'Retirer cette solution ?':'Accepter cette réponse comme solution ?'} description="Confirmation de démonstration uniquement. Les réponses et leur statut ne seront pas modifiés." confirmLabel="Confirmer l’aperçu" onConfirm={()=>setFeedback(true)}/>{feedback&&<Message role="status" title="Confirmation simulée">Aucune solution acceptée ou retirée. Les données de consultation restent inchangées.</Message>}</div>;
}
