/** Décision 007, validée le 26 octobre 2026. Aucune durée fournie par une requête cliente. */
import values from './policy-values.json';
import {SESSION_IDLE_MS} from '../auth/auth.constants';
export const RETENTION = Object.freeze(values);
export const ERASED_MESSAGE = 'Message effacé après le délai de conservation.';
export function days(date:Date,n:number):Date { return new Date(date.getTime()+n*86_400_000); }
/** Mois calendaires UTC, fin de mois rabattue au dernier jour existant. */
export function months(date:Date,n:number):Date {
 const result=new Date(date);const day=result.getUTCDate();result.setUTCDate(1);result.setUTCMonth(result.getUTCMonth()+n);
 const last=new Date(Date.UTC(result.getUTCFullYear(),result.getUTCMonth()+1,0)).getUTCDate();result.setUTCDate(Math.min(day,last));return result;
}
export function inactivityDue(basis:Date):Date{return months(basis,RETENTION.inactiveMonths);}
export function sessionEnd(s:{expiresAt:Date;lastSeenAt:Date;revokedAt:Date|null}):Date{return new Date(Math.min(s.expiresAt.getTime(),s.lastSeenAt.getTime()+SESSION_IDLE_MS,s.revokedAt?.getTime()??Infinity));}
export function tokenEnd(t:{expiresAt:Date;consumedAt:Date|null}):Date{return new Date(Math.min(t.expiresAt.getTime(),t.consumedAt?.getTime()??Infinity));}
