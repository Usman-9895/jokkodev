import {createHash} from 'node:crypto';
import {ApiException} from '../../common/http/api-exception';
import type {CreateQuestionDto} from './questions.dto';
export const PUBLICATION_RETRY_MS=7*24*60*60*1000;
export const PUBLICATION_RECEIPT_MS=8*24*60*60*1000;
export const PUBLICATION_FUTURE_MS=5*60*1000;
export const PUBLICATION_KEY_PATTERN=/^jdq1\.([0-9]{13})\.[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function publicationTime(key:string,now=Date.now()){
 const match=PUBLICATION_KEY_PATTERN.exec(key),at=Number(match?.[1]);
 if(!match||!Number.isSafeInteger(at)||at>now+PUBLICATION_FUTURE_MS)throw new ApiException(400,'INVALID_PUBLICATION_KEY','Clé d’envoi invalide ou horloge trop avancée.');
 if(now>=at+PUBLICATION_RETRY_MS)throw new ApiException(410,'PUBLICATION_REQUEST_EXPIRED','La période de reprise a expiré. Vérifie tes publications avant de recommencer.');
 return at;
}
export function publicationHash(input:CreateQuestionDto){
 // Fixed field order; raw validated values, including array order and null/omitted distinction.
 const {title,context,expected,actual,attempts,technologyIds,code,codeLanguage,imageIds}=input;
 // Undefined is omitted, preserving all text-only receipts created by older API releases.
 return createHash('sha256').update(JSON.stringify({title,context,expected,actual,attempts,technologyIds,code,codeLanguage,imageIds})).digest('hex');
}
