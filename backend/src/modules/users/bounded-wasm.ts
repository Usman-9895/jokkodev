/** Apply a memory ceiling before instantiating the pinned single-memory wasm32 codec.
 * V8 worker heap limits do not cover WebAssembly linear memory. Original files remain unchanged. */
export function boundedWasmBytes(source: Uint8Array, maximumPages = 2048): Uint8Array {
  if (!Number.isInteger(maximumPages) || maximumPages < 1 || maximumPages > 2048 || !Buffer.from(source.subarray(0,8)).equals(Buffer.from([0,97,115,109,1,0,0,0]))) throw Error('wasm header');
  let at=8, seen=false;
  const parts:Uint8Array[]=[source.subarray(0,8)];
  const leb=(value:number)=>{const b:number[]=[];do{const low=value&127;value=Math.floor(value/128);b.push(low|(value?128:0));}while(value);return Uint8Array.from(b);};
  function read(end:number){let value=0,shift=0;for(let i=0;i<5;i++){if(at>=end)throw Error('wasm length');const byte=source[at++];value+=(byte&127)*2**shift;if(!(byte&128)){if(value>0xffffffff)throw Error('wasm length');return value;}shift+=7;}throw Error('wasm length');}
  while(at<source.length){const start=at,id=source[at++],size=read(source.length),end=at+size;if(end>source.length)throw Error('wasm section');if(id!==5){parts.push(source.subarray(start,end));at=end;continue;}if(seen||read(end)!==1)throw Error('wasm memories');seen=true;const flags=read(end);if(flags!==0&&flags!==1)throw Error('wasm memory kind');const initial=read(end),previousMaximum=flags===1?read(end):maximumPages,cap=Math.min(previousMaximum,maximumPages);if(initial>cap||at!==end)throw Error('wasm memory limits');const payload=Buffer.concat([Uint8Array.from([1,1]),leb(initial),leb(cap)]);parts.push(Uint8Array.from([5]),leb(payload.length),payload);}
  if(!seen)throw Error('wasm memory absent');return Buffer.concat(parts);
}
