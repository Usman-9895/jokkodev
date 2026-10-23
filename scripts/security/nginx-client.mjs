// Runs only in the dedicated Docker network, against its entry alias. No real account/password.
import {randomBytes} from 'node:crypto';
import {networkInterfaces} from 'node:os';
const addresses=Object.values(networkInterfaces()).flat().filter(a=>a&&!a.internal&&a.family==='IPv4').map(a=>a.address);
const base='http://entry:8080/api/v1',cookie=new Map(),records=[];
const email='security-nginx-'+process.env.SECURITY_TEST_ID+'@example.test',password=randomBytes(24).toString('base64url');
let csrf;
async function call(method,path,body,extra={}){
 const r=await fetch(base+path,{method,headers:{Origin:'http://security21.test',...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{}),...(cookie.size?{Cookie:[...cookie].map(([k,v])=>k+'='+v).join('; ')}:{}),...extra},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
 for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0],i=pair.indexOf('=');cookie.set(pair.slice(0,i),pair.slice(i+1));}
 const data=await r.json();if(data.csrfToken)csrf=data.csrfToken;return{status:r.status,code:data.code,retryAfterPresent:r.headers.has('Retry-After')};
}
try{
 await call('GET','/auth/csrf');
 const mutate=extra=>call('POST','/auth/login',{email,password},extra);
 for(let i=0;i<5;i++){const r=await mutate();records.push({step:'invalid '+(i+1),...r});if(r.status!==401)throw Error();}
 const blocked=await mutate();records.push({step:'sixth',...blocked});if(blocked.status!==429||blocked.code!=='RATE_LIMITED'||!blocked.retryAfterPresent)throw Error();
 for(const headers of [{'X-Forwarded-For':'10.9.1.1'},{'X-Forwarded-For':'10.9.1.2, 127.0.0.1',Forwarded:'for=10.9.1.3'},{Forwarded:'for="[::1]"','X-Real-IP':'10.9.1.4','CF-Connecting-IP':'10.9.1.5'}]){const r=await mutate(headers);records.push({step:'forged forwarding headers',...r});if(r.status!==429||r.code!=='RATE_LIMITED')throw Error();}
 console.log(JSON.stringify({pass:true,addresses,records}));
}catch{console.log(JSON.stringify({pass:false,addresses,records}));process.exitCode=1;}
