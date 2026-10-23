import test from 'node:test';
import assert from 'node:assert/strict';
import {AccountClient} from '../frontend/src/lib/accounts/session.ts';
import {HttpError} from '../packages/api-client/src/http.ts';
import {reportReceiptUncertain} from '../frontend/src/lib/reports/api.ts';

test('lost proxy response is an uncertain report receipt with preserved status and no replay',async()=>{
 let writes=0;
 const client=new AccountClient('/api/v1',async(url)=>{
  if(url.endsWith('/auth/me'))return Response.json({id:'synthetic-user',role:'MEMBER'});
  if(url.endsWith('/auth/csrf'))return Response.json({csrfToken:'synthetic-memory-only'});
  writes++;return Response.json({code:'API_UNAVAILABLE',message:'Result unconfirmed'},{status:502});
 });
 await client.refresh();
 await assert.rejects(client.mutate('/reports',{targetType:'QUESTION',targetId:'synthetic-target',reason:'A valid synthetic reason'},'POST',true),error=>error instanceof HttpError&&error.status===502&&reportReceiptUncertain(error));
 assert.equal(writes,1);
 assert.equal(reportReceiptUncertain(new HttpError('network','Unreachable')),true);
 assert.equal(reportReceiptUncertain(new HttpError('protocol','Incomplete')),true);
 assert.equal(reportReceiptUncertain(new HttpError('http','Rejected',403,{code:'SELF_REPORT_FORBIDDEN'})),false);
 assert.equal(reportReceiptUncertain(new HttpError('http','Rejected',400,{code:'VALIDATION_ERROR'})),false);
});
