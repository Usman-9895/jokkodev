import assert from 'node:assert/strict';import {test} from 'node:test';
import {mkdtemp,writeFile,readdir,rm} from 'node:fs/promises';import{tmpdir}from'node:os';import path from'node:path';
import{retireCopies}from'../scripts/retention-backup-copies.mjs';
test('off-server retention uses original backup UTC timestamp, preserves keys and simulates without writes',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'jd-retention-copies-'));try{
 const expired='jokkodev-20260926T120000Z.dump.enc',young='jokkodev-20260926T120001Z.dump.enc';
 for(const f of [expired,expired+'.sha256',young,'backup.key','unrelated.txt'])await writeFile(path.join(dir,f),'throwaway fixture');
 const now=new Date('2026-10-26T12:00:00Z'),before=await readdir(dir);assert.equal((await retireCopies(dir,{now})).eligible,1);assert.deepEqual(await readdir(dir),before);
 await assert.rejects(retireCopies(dir,{execute:true,confirmDirectory:path.dirname(dir),now}));
 assert.equal((await retireCopies(dir,{execute:true,confirmDirectory:dir,now})).deleted,1);assert.deepEqual((await readdir(dir)).sort(),['backup.key',young,'unrelated.txt'].sort());assert.equal((await retireCopies(dir,{execute:true,confirmDirectory:dir,now})).deleted,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('off-server retention covers database and files archives, including nanosecond boundaries',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'jd-retention-formats-'));
 try{
  const expiredDb='jokkodev-20260926T120000Z.dump.enc';
  const expiredFiles='jokkodev-files-20260926T120000000000000Z.tar.gz.enc';
  const expiredSeconds='jokkodev-files-20260925T120000Z.tar.gz.enc';
  const fractionYoung='jokkodev-files-20260926T120000000000001Z.tar.gz.enc';
  const youngDb='jokkodev-20260926T120001Z.dump.enc';
  const files=[expiredDb,expiredFiles,expiredSeconds,fractionYoung,youngDb];
  for(const name of files){await writeFile(path.join(dir,name),'fixture');await writeFile(path.join(dir,name+'.sha256'),'fixture digest');}
  await writeFile(path.join(dir,'backup.key'),'fixture key');
  const now=new Date('2026-10-26T12:00:00Z'),before=(await readdir(dir)).sort();
  assert.equal((await retireCopies(dir,{now})).eligible,3);
  assert.deepEqual((await readdir(dir)).sort(),before);
  assert.equal((await retireCopies(dir,{now,execute:true,confirmDirectory:dir})).deleted,3);
  assert.deepEqual((await readdir(dir)).sort(),['backup.key',fractionYoung,fractionYoung+'.sha256',youngDb,youngDb+'.sha256'].sort());
  assert.equal((await retireCopies(dir,{now,execute:true,confirmDirectory:dir})).deleted,0);
  assert.equal((await retireCopies(dir,{now:new Date(now.getTime()+1)})).eligible,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('off-server retention preserves invalid dates, unrelated formats and all keys',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'jd-retention-invalid-'));
 try{
  const names=['jokkodev-20260230T120000Z.dump.enc','jokkodev-files-20260230T120000123Z.tar.gz.enc','jokkodev-files-20260901T250000Z.tar.gz.enc','jokkodev-files-20260901T1200001234567890Z.tar.gz.enc','jokkodev-20260901T120000Z.tar.gz.enc','jokkodev-files-20260901T120000Z.dump.enc','backup.key','another.key','unrelated.txt'];
  for(const name of names)await writeFile(path.join(dir,name),'fixture retained');
  const result=await retireCopies(dir,{now:new Date('2026-10-26T12:00:00Z'),execute:true,confirmDirectory:dir});
  assert.equal(result.deleted,0);assert.ok(result.skipped>=3);
  assert.deepEqual((await readdir(dir)).sort(),names.sort());
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('off-server retention refuses a managed symlink without deleting its target',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'jd-retention-links-'));
 try{
  const {symlink,readFile}=await import('node:fs/promises');
  const target=path.join(dir,'fixture.key'),link=path.join(dir,'jokkodev-files-20260901T120000000000000Z.tar.gz.enc');
  await writeFile(target,'fixture target must survive');
  try{await symlink(target,link,'file');}catch(error){if(error.code==='EPERM'||error.code==='EACCES'){t.skip('Symlink creation unavailable on this Windows account');return;}throw error;}
  await assert.rejects(retireCopies(dir,{now:new Date('2026-10-26T12:00:00Z'),execute:true,confirmDirectory:dir}),/Unexpected managed entry/);
  assert.equal(await readFile(target,'utf8'),'fixture target must survive');
 }finally{await rm(dir,{recursive:true,force:true});}
});
