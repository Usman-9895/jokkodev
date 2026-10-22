import { Inject, Injectable } from '@nestjs/common';
import { Worker } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { ENVIRONMENT } from '../../config/config.module';
import type { Environment } from '../../config/environment';
import { DatabaseService } from '../../database/database.service';
import { ApiException } from '../../common/http/api-exception';
import { RateLimiter } from '../../common/rate-limit/rate-limiter.service';
import { photoUrl } from './projections';

export const PHOTO_KEY = /^jd-[0-9a-f]{32}\.jpg$/;
@Injectable()
export class PhotosService {
  private processing = false;
  constructor(@Inject(ENVIRONMENT) private readonly env: Environment, private readonly db: DatabaseService, private readonly limiter: RateLimiter) {}
  private location(key: string) { if (!this.env.avatarDir) throw new ApiException(503, 'PHOTO_STORAGE_UNAVAILABLE', 'Stockage photo indisponible.'); if (!PHOTO_KEY.test(key)) throw new ApiException(404, 'PHOTO_NOT_FOUND', 'Photo introuvable.'); return path.join(this.env.avatarDir, key); }
  private async discard(key: string | null) { if (!key) return; try { await unlink(this.location(key)); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') console.error(JSON.stringify({ event: 'avatar_orphan_cleanup_needed' })); } }
  async replace(userId: string, bytes: Buffer | undefined) {
    this.limiter.consume('photo:'+userId, 12, 60 * 60 * 1000);
    const key = 'jd-'+randomUUID().replaceAll('-','')+'.jpg', destination = this.location(key);
    if (!bytes?.length || bytes.length > 2 * 1024 * 1024) throw new ApiException(400, 'INVALID_PHOTO', 'Choisis une image JPEG, PNG ou WebP non animée de 2 Mio maximum.');
    if (this.processing) throw new ApiException(429, 'RATE_LIMITED', 'Un traitement photo est en cours.', {retryAfterSeconds: 2});
    this.processing = true;
    let encoded: Buffer;
    try {
      encoded = await new Promise<Buffer>((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'photo-worker.js'), { workerData: bytes, resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 } });
        let settled = false;
        const finish = (value?: Uint8Array) => { if (settled) return; settled = true; clearTimeout(timer); void worker.terminate(); if (value) resolve(Buffer.from(value)); else reject(new ApiException(400, 'INVALID_PHOTO', 'Image invalide, animée ou dimensions excessives (4096 px et 4 millions de pixels maximum).')); };
        const timer = setTimeout(() => finish(), 8000);
        worker.once('message', value => finish(value)); worker.once('error', () => finish()); worker.once('exit', () => finish());
      });
    } finally { this.processing = false; }
    try { await mkdir(this.env.avatarDir!, {recursive: true, mode: 0o700}); await writeFile(destination, encoded, {flag: 'wx', mode: 0o600}); }
    catch { await this.discard(key); throw new ApiException(503, 'PHOTO_STORAGE_UNAVAILABLE', 'Impossible d’enregistrer la photo. L’ancienne photo est conservée.'); }
    let previous: string | null = null;
    try { await this.db.prisma.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId}::uuid FOR UPDATE`; previous = (await tx.user.findUniqueOrThrow({where:{id:userId},select:{avatarKey:true}})).avatarKey; await tx.user.update({where:{id:userId},data:{avatarKey:key}}); }); }
    catch (e) { await this.discard(key); throw e; }
    await this.discard(previous);
    return {photoUrl: photoUrl(key)};
  }
  async remove(userId: string) { let previous: string | null = null; await this.db.prisma.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId}::uuid FOR UPDATE`; previous=(await tx.user.findUniqueOrThrow({where:{id:userId},select:{avatarKey:true}})).avatarKey; await tx.user.update({where:{id:userId},data:{avatarKey:null}}); }); await this.discard(previous); return {photoUrl:null}; }
  async read(key: string) { const file=this.location(key); if (!await this.db.prisma.user.count({where:{avatarKey:key}})) throw new ApiException(404,'PHOTO_NOT_FOUND','Photo introuvable.'); try { return await readFile(file); } catch { throw new ApiException(404,'PHOTO_NOT_FOUND','Photo introuvable.'); } }
  /** Explicit maintenance only: never traverses subdirectories or follows symlinks. */
  async cleanup() { if (!this.env.avatarDir) return 0; let count=0; for (const key of await readdir(this.env.avatarDir)) { if (!PHOTO_KEY.test(key)) continue; const file=this.location(key), info=await lstat(file); if (!info.isFile() || info.isSymbolicLink() || Date.now()-info.mtimeMs < 86400000) continue; if (!await this.db.prisma.user.count({where:{avatarKey:key}})) { await unlink(file); count++; } } return count; }
}
