import {Buffer} from 'node:buffer';
const MAX_BYTES = 16 * 1024;
const MAX_REQUESTS = 60;
const directives = new Set(['default-src','script-src','script-src-elem','script-src-attr','style-src','style-src-elem','style-src-attr','img-src','font-src','connect-src','object-src','base-uri','form-action','frame-ancestors','media-src','worker-src','manifest-src']);

/** Local, bounded CSP observation. Never log URLs, query strings, samples, source files or report bodies. */
export function createCspReporter({log=record=>console.log(JSON.stringify(record)),now=()=>Date.now()}={}) {
  let windowStart=now(),requests=0;
  return async (request,response) => {
    response.setHeader('Cache-Control','no-store');
    response.setHeader('X-Content-Type-Options','nosniff');
    function finish(status) { response.statusCode=status;response.end();request.resume(); }
    if(request.method!=='POST'){response.setHeader('Allow','POST');finish(405);return;}
    if(now()-windowStart>=60_000){windowStart=now();requests=0;}
    if(++requests>MAX_REQUESTS){response.setHeader('Retry-After','60');finish(429);return;}
    const type=String(request.headers['content-type']??'').split(';')[0].trim().toLowerCase();
    if(!['application/csp-report','application/reports+json'].includes(type)){finish(415);return;}
    if(Number(request.headers['content-length']??0)>MAX_BYTES){finish(413);return;}
    let bytes=0;const chunks=[];
    try {
      for await(const chunk of request){bytes+=chunk.length;if(bytes>MAX_BYTES){finish(413);return;}chunks.push(chunk);}
      const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const reports=type==='application/reports+json'?(Array.isArray(parsed)?parsed.filter(r=>r?.type==='csp-violation').map(r=>r.body):[]):[parsed?.['csp-report']];
      const counts={};
      for(const report of reports.slice(0,10)) {
        if(!report||typeof report!=='object')continue;
        const raw=report['effective-directive']??report.effectiveDirective;
        const directive=directives.has(raw)?raw:'other';
        counts[directive]=(counts[directive]??0)+1;
      }
      if(Object.keys(counts).length)log({event:'csp_observation',directives:counts});
      finish(204);
    } catch { if(!response.writableEnded)finish(400); }
  };
}
