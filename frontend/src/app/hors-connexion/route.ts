import {offlineDocument} from '../../lib/pwa/offline-document';
export const dynamic='force-static';
export function GET(){return offlineDocument();}
