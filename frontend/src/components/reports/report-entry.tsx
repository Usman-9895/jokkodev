'use client';
import {ReportTrigger} from './live-report';
import {reportTypes} from '../../lib/reports/api';
import Link from 'next/link';
import {reportEntryHref} from '../../lib/reports/presentation';
import type {ReportTargetKind} from '../../lib/reports/presentation';
export function ReportEntry({kind,id,label,title=label,live=false,ownerId}:{kind:ReportTargetKind;id:string;label:string;title?:string;live?:boolean;ownerId?:string}) {
  if(!live)return <Link className="report-entry" href={reportEntryHref(kind,id).replace('/signalements?','/dev/signalements?')} aria-label={'Signaler '+label}>⚑ Signaler (démo)</Link>;
  return ownerId?<ReportTrigger target={{type:reportTypes[kind],id,title,ownerId}}/>:null;
}
