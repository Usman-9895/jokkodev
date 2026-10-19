'use client';
import {HttpError} from '@jokkodev/api-client/http';
import {useEffect} from 'react';
import type {KeyboardEvent,ReactNode} from 'react';
import Link from 'next/link';
import {useSession,SessionGate} from '../accounts/session-provider';
import {useHelpResource} from '../jokkohelp/live-resource';
import {apiFailure} from '../../lib/accounts/session';
import {FailureMessage} from '../accounts/live-account-form';
import {Button,Card,Heading,LoadingIndicator,StatusBadge} from '../ui';
export function containModalFocus(event:KeyboardEvent<HTMLDialogElement>){if(event.key!=='Tab')return;const nodes=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),textarea:not(:disabled),input:not(:disabled),a[href]')],first=nodes[0],last=nodes.at(-1);if(!first){event.preventDefault();event.currentTarget.focus();}else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
export function AdminGate({children}:{children:ReactNode}){const {user,revision}=useSession();return <SessionGate>{user?.role==='ADMIN'?<div key={user.id+':'+revision+':'+user.role}>{children}</div>:<Card><Heading as="h1">Accès non autorisé</Heading><p>Cet espace est réservé à l’administration. Aucune donnée de signalement n’est affichée.</p><Link href="/">Retour au site</Link></Card>}</SessionGate>;}
export function useAdminResource<T>(path:string,query?:Parameters<typeof useHelpResource>[1]){const {client}=useSession();const result=useHelpResource<T>(path,query,true,{keep:false,focus:false});const forbidden=result.error instanceof HttpError&&result.error.status===403;useEffect(()=>{if(forbidden)void client.refresh();},[client,forbidden]);return result;}
export function ReportStatus({status}:{status:'OPEN'|'CLOSED'}){return <StatusBadge tone={status==='OPEN'?'warning':'success'}>{status==='OPEN'?'Ouvert':'Clôturé'}</StatusBadge>;}
export function ReportLoading(){return <div className="moderation-loading" role="status"><LoadingIndicator label="Chargement des signalements…"/></div>;}
export function ReportFailure({error,retry}:{error:unknown;retry:()=>void}){const f=apiFailure(error);return <Card className="moderation-read-state"><Heading as="h2">{f.code==='REPORT_NOT_FOUND'?'Signalement introuvable':'Impossible de charger les signalements'}</Heading><FailureMessage failure={f}/><Button onClick={retry}>Réessayer la lecture</Button></Card>;}
