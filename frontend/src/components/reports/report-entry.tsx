import Link from 'next/link';
import {reportEntryHref} from '../../lib/reports/presentation';
import type {ReportTargetKind} from '../../lib/reports/presentation';
export function ReportEntry({kind,id,label}:{kind:ReportTargetKind;id:string;label:string}) {
  return <Link className="report-entry" href={reportEntryHref(kind,id)} aria-label={'Signaler '+label}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/></svg>Signaler</Link>;
}
