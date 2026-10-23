import {createServer} from 'node:http';
import {parseArgs} from 'node:util';
import next from 'next';
import {apiOrigin,apiRelay,isApiPath} from './server/api-relay.mjs';

const {values}=parseArgs({options:{dev:{type:'boolean',default:false},port:{type:'string',default:'3000'},hostname:{type:'string',default:'127.0.0.1'}}});
process.env.NODE_ENV??=values.dev?'development':'production';
const port=Number(values.port),hostname=values.hostname;
if(!Number.isInteger(port)||port<1||port>65535||!['127.0.0.1','::1'].includes(hostname))throw Error('Use a loopback listener and a valid port');
const app=next({dev:values.dev,hostname,port});
await app.prepare(); // Next loads .env.local before the runtime upstream is read.
const relay=apiRelay(apiOrigin()),handle=app.getRequestHandler();
const server=createServer((request,response)=>{
 if(isApiPath(request.url)){relay(request,response);return;}
 handle(request,response).catch(()=>{if(!response.headersSent)response.writeHead(500);response.end();});
});
server.headersTimeout=15_000;
server.requestTimeout=60_000;
server.on('upgrade',app.getUpgradeHandler());
server.listen(port,hostname,()=>console.log('JokkoDev web listener ready'));
let stopping=false;
function close(){if(stopping)return;stopping=true;server.close(()=>{void app.close().then(()=>process.exit(0));});server.closeIdleConnections();setTimeout(()=>process.exit(1),5000).unref();}
process.on('SIGTERM',close);process.on('SIGINT',close);
