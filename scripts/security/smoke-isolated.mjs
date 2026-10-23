// Dedicated copy: never replace .next under the running audit frontend.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
const root=process.cwd(),dir=path.resolve('.cache/verification'),runtime=dir+'/smoke-runtime';
const vars=JSON.parse(fs.readFileSync(dir+'/env.json'));
const cli=process.env.PNPM_CLI;
if(!cli)throw Error('Set PNPM_CLI to pinned pnpm 10.34.6 CLI');
const db=new URL(vars.DATABASE_URL);
if(db.hostname!=='127.0.0.1'||db.port!=='55475'||db.pathname!=='/jokkodev_security21')throw Error('Unapproved database');
for(const port of [33310,33311])await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});
const resume=process.env.SECURITY_SMOKE_RESUME==='1';
if(fs.existsSync(runtime)&&!resume)throw Error('Runtime already exists: inspect it, never overwrite automatically');
if(!resume){
fs.mkdirSync(runtime,{recursive:true});
for(const file of ['package.json','pnpm-workspace.yaml','pnpm-lock.yaml'])fs.copyFileSync(file,runtime+'/'+file);
for(const folder of ['frontend','packages','scripts'])fs.cpSync(folder,runtime+'/'+folder,{recursive:true,filter:src=>!path.relative(root,src).split(path.sep).some(p=>['node_modules','.next','dist','.cache'].includes(p)||p.startsWith('.env')&&!p.endsWith('.example')||p.endsWith('.tsbuildinfo'))});
fs.mkdirSync(runtime+'/backend',{recursive:true});fs.cpSync('backend/dist',runtime+'/backend/dist',{recursive:true});fs.copyFileSync('backend/package.json',runtime+'/backend/package.json');
for(const folder of ['','frontend','backend','packages/api-client'])fs.symlinkSync(path.join(root,folder,'node_modules'),runtime+'/'+folder+'/node_modules','junction');
}
const env={...process.env,...vars,PATH:path.resolve(path.dirname(cli),'../../.bin')+path.delimiter+process.env.PATH,NODE_ENV:'production',API_INTERNAL_ORIGIN:'http://127.0.0.1:33311',APP_ORIGIN:'http://127.0.0.1:33310'};
async function run(name,args,extra={}){
 const p=spawn(process.execPath,[cli,...args],{cwd:runtime,env:{...env,...extra},windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);
 const code=await new Promise((r,j)=>{p.once('exit',r);p.once('error',j);});
 fs.writeFileSync(dir+'/logs/smoke-'+name+'.log',output.replace(/postgres(?:ql)?:\/\/[^\s]+/g,'postgresql://[REDACTED]'));
 console.log(name+' '+code);if(code)throw Error('Smoke failed: '+name);return{name,code};
}
await run('build',['--filter','@jokkodev/frontend','build']);
const results=[];
for(const mode of ['unavailable','dedicated'])results.push(await run(mode,['test:smoke'],{SMOKE_FRONTEND_PORT:'33310',SMOKE_BACKEND_PORT:'33311',...(mode==='dedicated'?{SMOKE_DATABASE_URL:vars.DATABASE_URL,SMOKE_CONFIRM_DATABASE:'jokkodev_security21'}:{})}));
fs.writeFileSync(dir+'/smoke-checks.json',JSON.stringify(results,null,2));
