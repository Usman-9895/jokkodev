import {lstat,readdir,realpath,unlink} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import policy from '../backend/src/modules/retention/policy-values.json' with {type:'json'};

/** Off-server copies only. The immutable UTC date in the original backup name is authoritative, never copy mtime. */
export async function retireCopies(directory,{execute=false,confirmDirectory,now=new Date()}={}){
 const absolute=path.resolve(directory),info=await lstat(absolute),resolved=await realpath(absolute);
 // Windows short names and casing are aliases, not evidence of a symlink. Inspect the path components instead.
 for(let component=absolute;component!==path.dirname(component);component=path.dirname(component))if((await lstat(component)).isSymbolicLink())throw Error('Symlink directory refused');
 const confirmed=execute&&confirmDirectory?await realpath(path.resolve(confirmDirectory)):undefined;
 if(!info.isDirectory()||info.isSymbolicLink()||path.parse(resolved).root===resolved||execute&&confirmed!==resolved)throw Error('Unconfirmed dedicated backup directory');
 const names=await readdir(resolved);if(names.length>1000||!Number.isFinite(now.getTime()))throw Error('Review required: directory or clock outside bounds');
 const result={mode:execute?'execute':'simulate',eligible:0,deleted:0,skipped:0};
 const cutoffNs=BigInt(now.getTime()-policy.offsiteBackupDays*86400000)*1000000n;
 for(const name of names){
  // Two distinct archive families; sidecars and keys are never treated as archives.
  const m=/^jokkodev-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z\.dump\.enc$/.exec(name)
   ?? /^jokkodev-files-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\d{1,9})?Z\.tar\.gz\.enc$/.exec(name);
  if(!m)continue;
  const iso=`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`,stamp=new Date(iso);
  if(!Number.isFinite(stamp.getTime())||stamp.toISOString().slice(0,19)!==iso.slice(0,19)){result.skipped++;continue;}
  // Preserve sub-millisecond precision from date +%N: never retire a young copy early.
  const stampNs=BigInt(stamp.getTime())*1000000n+BigInt((m[7]??'').padEnd(9,'0'));
  if(stampNs>cutoffNs)continue;
  const entries=[];
  for(const file of [name,name+'.sha256']){try{const stat=await lstat(path.join(resolved,file));if(!stat.isFile()||stat.isSymbolicLink())throw Error('Unexpected managed entry');entries.push(file);}catch(e){if(e.code!=='ENOENT')throw e;}}
  result.eligible++;if(execute){for(const file of entries)await unlink(path.join(resolved,file));result.deleted++;}
 }return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const {values}=parseArgs({options:{directory:{type:'string'},'confirm-directory':{type:'string'},execute:{type:'boolean',default:false}}});
 if(!values.directory)throw Error('Explicit directory required');
 retireCopies(values.directory,{execute:values.execute,confirmDirectory:values['confirm-directory']}).then(r=>console.log(JSON.stringify(r))).catch(()=>{console.error('Rotation refusée ou incomplète : vérifier le répertoire dédié sans exposer ses fichiers.');process.exitCode=1;});
}
