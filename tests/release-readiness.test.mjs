import test from 'node:test';
import assert from 'node:assert/strict';
import {orderedMembers} from '../frontend/src/lib/jokkoprojects/api.ts';
test('member presentation is deterministic with owner first on current page, without mutating or completing server page',()=>{const members=[{id:'a',isOwner:false},{id:'z',isOwner:true},{id:'b',isOwner:false}];assert.deepEqual(orderedMembers(members).map(m=>m.id),['z','a','b']);assert.deepEqual(members.map(m=>m.id),['a','z','b']);assert.deepEqual(orderedMembers([...members].reverse()).map(m=>m.id),['z','a','b']);assert.deepEqual(orderedMembers(members.slice(0,1)),members.slice(0,1));});
