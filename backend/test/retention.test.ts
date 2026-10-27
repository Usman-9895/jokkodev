import assert from 'node:assert/strict';
import {test} from 'node:test';
import {days,months,sessionEnd,tokenEnd,inactivityDue} from '../src/modules/retention/policy';
test('retention: UTC calendar months clamp month ends without approximating months as days',()=>{
 assert.equal(months(new Date('2024-01-31T12:34:56.789Z'),1).toISOString(),'2024-02-29T12:34:56.789Z');
 assert.equal(months(new Date('2024-02-29T00:00:00Z'),24).toISOString(),'2026-02-28T00:00:00.000Z');
 assert.equal(months(new Date('2026-08-31T00:00:00Z'),6).toISOString(),'2027-02-28T00:00:00.000Z');
 assert.equal(inactivityDue(new Date('2024-10-26T12:00:00Z')).toISOString(),'2026-10-26T12:00:00.000Z');
 assert.equal(days(new Date('2026-03-29T00:00:00Z'),1).toISOString(),'2026-03-30T00:00:00.000Z');
});
test('retention: effective session/token end is the earliest applicable end',()=>{
 const expiresAt=new Date('2026-10-20Z'),lastSeenAt=new Date('2026-10-10Z'),revokedAt=new Date('2026-10-09Z');
 assert.equal(sessionEnd({expiresAt,lastSeenAt,revokedAt}).toISOString(),revokedAt.toISOString());
 assert.equal(sessionEnd({expiresAt,lastSeenAt,revokedAt:null}).toISOString(),days(lastSeenAt,1).toISOString());
 assert.equal(tokenEnd({expiresAt,consumedAt:revokedAt}).toISOString(),revokedAt.toISOString());
});
