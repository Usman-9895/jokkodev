import fs from 'node:fs';import path from 'node:path';import net from 'node:net';import {spawn} from 'node:child_process';
const dir=path.resolve('.cache/verification'),env=JSON.parse(fs.readFileSync(dir+'/env.json'));
if(new URL(env.DATABASE_URL).pathname!=='/jokkodev_security21'||env.APP_ORIGIN!=='http://127.0.0.1:33300'||env.PORT!=='33301')throw Error('Dedicated environment required');
const records=[];
for(const port of [33300,33301]){
 await new Promise((r,j)=>{const s=net.createServer();s.once('error',j);s.listen(port,'127.0.0.1',()=>s.close(r));});
}
for(const [name,port,cwd,args,extra] of [['backend',33301,'backend',['dist/src/main.js'],{}],['frontend',33300,'frontend',['server.mjs','--port','33300','--hostname','127.0.0.1'],{NODE_ENV:'production'}]]){

 const log=fs.openSync(dir+'/'+name+'.log','a');const child=spawn(process.execPath,args,{cwd:path.resolve(cwd),env:{...process.env,...env,...extra},detached:true,windowsHide:true,stdio:['ignore',log,log]});child.unref();fs.closeSync(log);records.push({name,port,pid:child.pid,owned:true});fs.writeFileSync(dir+'/processes.json',JSON.stringify(records,null,2));console.log(name+' PID '+child.pid+' port '+port);
}
