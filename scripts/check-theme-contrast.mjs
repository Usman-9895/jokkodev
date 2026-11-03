import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const css=readFileSync(new URL('../frontend/src/styles/tokens.css',import.meta.url),'utf8');
export function contrast(a,b){
 const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
  .reduce((value,v,i)=>value+v*[.2126,.7152,.0722][i],0);
 const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
function palette(theme){
 const values=new Map([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(match=>[match[1],match[2]]));
 function resolve(name){
  const value=values.get(name);if(!value)throw Error('Unknown color token: '+name);
  const scheme=/^light-dark\((#[\da-f]+),\s*(#[\da-f]+)\)$/i.exec(value);
  const hex=scheme?scheme[theme==='light'?1:2]:value;
  if(/^#[\da-f]{6}$/i.test(hex))return[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const mix=/^color-mix\(in srgb, var\((--[\w-]+)\) (\d+)%, var\((--[\w-]+)\)\)$/.exec(value);
  if(mix){const a=resolve(mix[1]),b=resolve(mix[3]),weight=Number(mix[2])/100;return a.map((v,i)=>v*weight+b[i]*(1-weight));}
  throw Error('Unsupported color expression: '+name);
 }
 return resolve;
}
export function checkThemeContrasts(){
 const results=[];
 for(const theme of ['light','dark']){
  const resolve=palette(theme);
  const pairs=[
   ...['--color-background','--color-surface'].flatMap(bg=>[
    ['Text','--color-ink',bg,4.5],['Secondary text','--color-muted',bg,4.5],
    ['Heading','--color-night',bg,4.5],['Link and focus','--color-petrol',bg,4.5],
    ['Control border','--color-muted',bg,3]]),
   ['Primary action','--jd-on-action','--jd-action',4.5],
   ['Primary action hover','--jd-on-action','--jd-action-hover',4.5],
   ['Destructive action','--jd-on-action','--jd-danger-action',4.5],
   ['Info','--color-petrol','--jd-surface-info',4.5],
   ['Success','--color-success','--jd-surface-success',4.5],
   ['Warning','--color-warning','--jd-surface-warning',4.5],
   ['Error','--color-danger','--jd-surface-error',4.5],
   ['Violet icon','--jd-violet','--jd-surface-violet',3],
   ['Help card text','--color-muted','--jd-surface-help',4.5],
   ['Project card text','--color-muted','--jd-surface-project',4.5],
   ['Light theme toggle','--jd-brand-night','--jd-switch-light',4.5],
   ['Dark theme toggle','--jd-on-action','--jd-switch-dark',4.5],
  ];
  for(const [name,foreground,background,minimum] of pairs){
   const ratio=contrast(resolve(foreground),resolve(background));
   results.push({theme,name,foreground,background,ratio:Number(ratio.toFixed(3)),minimum,pass:ratio>=minimum});
  }
 }
 return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const results=checkThemeContrasts();console.log(JSON.stringify(results,null,2));
 if(results.some(result=>!result.pass))process.exitCode=1;
}
