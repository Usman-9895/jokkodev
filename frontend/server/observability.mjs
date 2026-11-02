import {performance} from 'node:perf_hooks';
import {randomUUID} from 'node:crypto';

export function isRequestId(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Generate locally, never accept a visitor ID; correlate an API reply using its validated backend ID. */
export function observeWebRequest(request, response, log = record => console.log(JSON.stringify(record))) {
  const localId = randomUUID();
  const start = performance.now();
  response.setHeader('X-Request-Id', localId);
  response.once('finish', () => {
    const replyId = response.getHeader('X-Request-Id');
    log({event:'web_request',requestId:isRequestId(replyId)?replyId:localId,method:request.method,status:response.statusCode,durationMs:Math.round(performance.now()-start)});
  });
}
