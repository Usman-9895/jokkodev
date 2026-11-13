import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
import { boundedWasmBytes } from './bounded-wasm';

const MAX_PIXELS = 4_000_000;
function dimensions(w: number, h: number) { if (!w || !h || w > 4096 || h > 4096 || w * h > MAX_PIXELS) throw Error('dimensions'); }
/** Only EXIF orientation is read; all metadata is discarded by the new JPEG encoder. */
function orientation(bytes: Buffer): number {
  try {
    const t = bytes.subarray(bytes.subarray(0, 6).toString('binary') === 'Exif\0\0' ? 6 : 0);
    const little = t.toString('ascii', 0, 2) === 'II';
    if (!little && t.toString('ascii', 0, 2) !== 'MM') return 1;
    const u16 = (o: number) => little ? t.readUInt16LE(o) : t.readUInt16BE(o), u32 = (o: number) => little ? t.readUInt32LE(o) : t.readUInt32BE(o);
    if (u16(2) !== 42) return 1;
    const at = u32(4), count = Math.min(u16(at), 256);
    for (let n = 0; n < count; n++) { const o = at + 2 + n * 12; if (u16(o) === 0x112 && u16(o + 2) === 3 && u32(o + 4) === 1) { const v = u16(o + 8); return v >= 1 && v <= 8 ? v : 1; } }
  } catch { /* Malformed optional metadata grants no extra allocation. */ }
  return 1;
}
export async function normalizePhoto(b: Buffer, screenshot = false): Promise<Buffer> {
  if (!b.length || b.length > (screenshot ? 5 : 2) * 1024 * 1024) throw Error('size');
  let image: {width: number; height: number; data: Uint8Array | Uint8ClampedArray}, orient = 1;
  if (b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    if (b.length < 33 || b.readUInt32BE(8) !== 13 || b.toString('ascii',12,16) !== 'IHDR') throw Error('png');
    dimensions(b.readUInt32BE(16), b.readUInt32BE(20));
    let ended = false;
    for (let p = 8, chunks = 0; p < b.length;) { if (++chunks > 1024 || ended || p+12 > b.length) throw Error('chunk'); const length = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8); if (p + length + 12 > b.length || type === 'IHDR' && p !== 8) throw Error('chunk'); if (type === 'acTL' || type === 'fcTL' || type === 'fdAT') throw Error('animated'); if (type === 'IEND') {if(length)throw Error('chunk');ended=true;} if (type === 'eXIf') orient = orientation(b.subarray(p + 8, p + 8 + length)); p += length + 12; }
    if (!ended) throw Error('png');
    image = PNG.sync.read(b, { checkCRC: true });
  } else if (b[0] === 255 && b[1] === 216) {
    let found = false;
    for (let p = 2; p < b.length;) { if (b[p++] !== 255) throw Error('jpeg'); while (b[p] === 255) p++; const marker = b[p++]; if (marker === 218 || marker === 217) break; const len = b.readUInt16BE(p); if (len < 2 || p + len > b.length) throw Error('jpeg'); if (marker === 225) orient = orientation(b.subarray(p + 2, p + len)); if ([192,193,194].includes(marker)) { dimensions(b.readUInt16BE(p + 5), b.readUInt16BE(p + 3)); found = true; } p += len; }
    if (!found) throw Error('jpeg');
    image = jpeg.decode(b, { useTArray: true, tolerantDecoding: false, maxResolutionInMP: 4, maxMemoryUsageInMB: 96 });
  } else if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    if (b.readUInt32LE(4) + 8 !== b.length) throw Error('riff');
    let w = 0, h = 0, frames = 0;
    for (let p = 12, chunks = 0; p < b.length;) { if (++chunks > 128) throw Error('chunks'); const type = b.toString('ascii', p, p + 4), len = b.readUInt32LE(p + 4), d = b.subarray(p + 8, p + 8 + len); if (p + len + 8 > b.length) throw Error('riff'); if (type === 'ANIM' || type === 'ANMF' || type === 'VP8X' && (d[0] & 2)) throw Error('animated'); if (type === 'VP8 ') { w = d.readUInt16LE(6) & 0x3fff; h = d.readUInt16LE(8) & 0x3fff; frames++; } if (type === 'VP8L') { if (d[0] !== 0x2f) throw Error('webp'); const n = d.readUInt32LE(1); w = (n & 0x3fff) + 1; h = ((n >>> 14) & 0x3fff) + 1; frames++; } if (type === 'VP8X') dimensions(d.readUIntLE(4, 3) + 1, d.readUIntLE(7, 3) + 1); if (type === 'EXIF') orient = orientation(d); p += len + 8 + (len % 2); }
    if (frames !== 1) throw Error('webp'); dimensions(w, h);
    const factory = await import('wasm-webp/dist/esm/webp-wasm.js');
    const codec = await factory.default({wasmBinary:boundedWasmBytes(readFileSync(require.resolve('wasm-webp/dist/esm/webp-wasm.wasm')))});
    if (codec.decoder_version() !== '1.3.2') throw Error('Unreviewed codec version');
    const decoded = codec.decodeRGBA(new Uint8Array(b));
    if (!decoded) throw Error('webp');
    image = decoded;
    if (image.width !== w || image.height !== h) throw Error('dimensions');
  } else throw Error('format');
  dimensions(image.width, image.height);
  const swapped = orient >= 5, width = swapped ? image.height : image.width, height = swapped ? image.width : image.height, side = Math.min(width, height);
  const scale = Math.min(1, 2048 / Math.max(width, height));
  const outWidth = screenshot ? Math.max(1, Math.round(width * scale)) : 256, outHeight = screenshot ? Math.max(1, Math.round(height * scale)) : 256;
  const out = new Uint8Array(outWidth * outHeight * 4);
  for (let y = 0; y < outHeight; y++) for (let x = 0; x < outWidth; x++) {
    const ox = screenshot ? (x + .5) * width / outWidth - .5 : (width - side) / 2 + (x + .5) * side / 256 - .5;
    const oy = screenshot ? (y + .5) * height / outHeight - .5 : (height - side) / 2 + (y + .5) * side / 256 - .5;
    let sx = ox, sy = oy;
    if (orient === 2) sx = image.width - 1 - ox;
    if (orient === 3) { sx = image.width - 1 - ox; sy = image.height - 1 - oy; }
    if (orient === 4) sy = image.height - 1 - oy;
    if (orient === 5) { sx = oy; sy = ox; }
    if (orient === 6) { sx = oy; sy = image.height - 1 - ox; }
    if (orient === 7) { sx = image.width - 1 - oy; sy = image.height - 1 - ox; }
    if (orient === 8) { sx = image.width - 1 - oy; sy = ox; }
    sx = Math.max(0, Math.min(image.width - 1, sx)); sy = Math.max(0, Math.min(image.height - 1, sy));
    const x0 = Math.floor(sx), y0 = Math.floor(sy), dx = sx - x0, dy = sy - y0, indexes = [y0 * image.width + x0, y0 * image.width + Math.min(x0 + 1, image.width - 1), Math.min(y0 + 1, image.height - 1) * image.width + x0, Math.min(y0 + 1, image.height - 1) * image.width + Math.min(x0 + 1, image.width - 1)], weights = [(1-dx)*(1-dy), dx*(1-dy), (1-dx)*dy, dx*dy], o = (y * outWidth + x) * 4;
    for (let c = 0; c < 3; c++) out[o + c] = Math.round(indexes.reduce((v, i, n) => { const alpha = image.data[i * 4 + 3] / 255; return v + weights[n] * (image.data[i * 4 + c] * alpha + 255 * (1-alpha)); }, 0));
    out[o + 3] = 255;
  }
  return jpeg.encode({ width: outWidth, height: outHeight, data: out }, screenshot ? 90 : 85).data;
}
