import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
const script=fileURLToPath(new URL('../infra/scripts/restore.sh',import.meta.url));
const shell=process.env.RESTORE_TEST_SHELL||(process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'/bin/sh');
const available=fs.existsSync(shell);
function run(extra={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jokkodev-restore-test-'));const calls=path.join(dir,'calls').replaceAll('\\','/');
 try{
  const commands={psql:'if [ "${PSQL_FAILURE:-}" = all ]; then echo secret-fixture >&2; exit 1; fi; case "$*" in *current_database*) echo "${ACTUAL_DATABASE:-review_restore}" ;; *) if [ "${PSQL_FAILURE:-}" = objects ]; then echo secret-fixture >&2; exit 1; fi; echo "${OBJECT_COUNT:-0}" ;; esac\n',pg_restore:'echo restore >> "$CALLS"\n',sha256sum:'exit 0\n',openssl:'exit 0\n'};
  for(const [name,body] of Object.entries(commands)){const file=path.join(dir,name);fs.writeFileSync(file,'#!/bin/sh\n'+body);fs.chmodSync(file,0o755);}
  fs.writeFileSync(path.join(dir,'backup.dump.enc'),'fixture');
  const env={...process.env,PATH:dir+path.delimiter+process.env.PATH,CALLS:calls,RESTORE_DATABASE_URL:'postgresql://review@localhost/review_restore',BACKUP_KEY_FILE:path.join(dir,'key'),RESTORE_EXPECTED_DATABASE:'review_restore',RESTORE_CONFIRM_TARGET:'review_restore',PRODUCTION_DATABASE_URL:'',...extra};
  env.MOCK_BIN=process.platform==='win32'?dir.replaceAll('\\','/').replace(/^([A-Za-z]):/,(_m,drive)=>'/'+drive.toLowerCase()):dir;
  env.RESTORE_SCRIPT=script;env.BACKUP_FILE=path.join(dir,'backup.dump.enc');
  const r=spawnSync(shell,['-c','export PATH="$MOCK_BIN:$PATH"; exec /bin/sh "$RESTORE_SCRIPT" "$BACKUP_FILE"'],{env,encoding:'utf8',windowsHide:true});return{status:r.status,error:r.stderr,restored:fs.existsSync(calls)};
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
for(const [name,env] of [
 ['v?rification de destination impossible',{PSQL_FAILURE:'all'}],['v?rification de vacuit? impossible',{PSQL_FAILURE:'objects'}],['base non vide',{OBJECT_COUNT:'1'}],['base effective différente',{ACTUAL_DATABASE:'another_database'}],['confirmation différente',{RESTORE_CONFIRM_TARGET:'other'}],['nom non fourni',{RESTORE_EXPECTED_DATABASE:''}],['base système',{RESTORE_EXPECTED_DATABASE:'postgres',RESTORE_CONFIRM_TARGET:'postgres'}],['garde production littérale sur URL fictive',{PRODUCTION_DATABASE_URL:'postgresql://review@localhost/review_restore'}],
])test('restauration refuse '+name+' avant pg_restore',{skip:!available},()=>{const r=run(env);assert.notEqual(r.status,0);assert.equal(r.restored,false);assert.doesNotMatch(r.error,/secret-fixture/);});
test('une base vide dont la destination est confirmée atteint pg_restore',{skip:!available},()=>{const r=run();assert.equal(r.status,0,r.error);assert.equal(r.restored,true);});
