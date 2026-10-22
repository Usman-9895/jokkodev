/** Typed surface of the Emscripten entry; the package wrapper has broken Node ESM imports.
 * See docs/licenses/profile-photos/README.md. Not an application DTO. */
declare module 'wasm-webp/dist/esm/webp-wasm.js' {
  interface Decoder { decoder_version():string; decodeRGBA(data:Uint8Array):{width:number;height:number;data:Uint8Array}|null; }
  export default function create(options:{wasmBinary:Uint8Array}):Promise<Decoder>;
}
