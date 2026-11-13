import {Inject, Injectable} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import {constants} from 'node:fs';
import {lstat, mkdir, open, readdir, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {ENVIRONMENT} from '../../config/config.module';
import type {Environment} from '../../config/environment';
import {DatabaseService} from '../../database/database.service';
import type {Prisma} from '../../generated/prisma/client';
import {ApiException} from '../../common/http/api-exception';
import {RateLimiter} from '../../common/rate-limit/rate-limiter.service';

export const QUESTION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const QUESTION_IMAGE_TTL = 8 * 86400000;
const KEY = /^qi-[0-9a-f]{32}\.jpg$/;
const missing = () => new ApiException(404, 'QUESTION_IMAGE_NOT_FOUND', 'Capture indisponible.');
export const questionImageUrl = (id:string) => '/api/v1/question-images/'+id;

@Injectable()
export class QuestionImagesService {
  private processing = false;
  constructor(@Inject(ENVIRONMENT) private readonly env:Environment, private readonly db:DatabaseService, private readonly limiter:RateLimiter) {}
  private location(key:string) {
    if (!this.env.questionImageDir) throw new ApiException(503, 'IMAGE_STORAGE_UNAVAILABLE', 'Stockage des captures indisponible.');
    if (!KEY.test(key)) throw missing();
    return path.join(this.env.questionImageDir, key);
  }
  private async storage(create=false) {
    if (!this.env.questionImageDir) this.location('');
    if(create) await mkdir(this.env.questionImageDir!, {recursive:true, mode:0o700});
    const root = await lstat(this.env.questionImageDir!);
    if (!root.isDirectory() || root.isSymbolicLink()) throw new Error('storage');
  }
  private async discard(key:string) {
    try {await unlink(this.location(key));} catch(e) {if ((e as NodeJS.ErrnoException).code !== 'ENOENT') console.error(JSON.stringify({event:'question_image_cleanup_needed'}));}
  }
  async lockOwner(tx:Prisma.TransactionClient, ownerId:string) {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${ownerId}::uuid FOR UPDATE`;
    const user = await tx.user.findUnique({where:{id:ownerId}, select:{status:true}});
    if (!user || user.status !== 'ACTIVE') throw new ApiException(401,'UNAUTHORIZED','Compte indisponible.');
  }
  async prepare(ownerId:string, bytes?:Buffer) {
    const key = 'qi-'+randomUUID().replaceAll('-','')+'.jpg', destination = this.location(key);
    this.limiter.consume('question-image:'+ownerId, 30, 3600000);
    if (!bytes?.length || bytes.length > QUESTION_IMAGE_MAX_BYTES) throw new ApiException(400,'INVALID_QUESTION_IMAGE','Choisis une image PNG, JPEG ou WebP de 5 Mo maximum.');
    if (this.processing) throw new ApiException(429,'RATE_LIMITED','Un traitement de capture est en cours.',{retryAfterSeconds:2});
    this.processing = true;
    let encoded:Buffer;
    try {
      encoded = await new Promise<Buffer>((resolve,reject) => {
        const worker = new Worker(path.join(__dirname,'question-image-worker.js'),{workerData:bytes,resourceLimits:{maxOldGenerationSizeMb:128,maxYoungGenerationSizeMb:16,stackSizeMb:4}});
        let done = false;
        const finish = (value?:Uint8Array) => {if(done)return; done=true; clearTimeout(timer); void worker.terminate(); if(value)resolve(Buffer.from(value)); else reject(new ApiException(400,'INVALID_QUESTION_IMAGE','Image invalide ou animée : 4096 pixels par dimension et 4 millions de pixels maximum.'));};
        const timer = setTimeout(()=>finish(),8000);
        worker.once('message',value=>finish(value));worker.once('error',()=>finish());worker.once('exit',()=>finish());
      });
    } finally {this.processing=false;}
    try {await this.storage(true);await writeFile(destination,encoded,{flag:'wx',mode:0o600});}
    catch {await this.discard(key);throw new ApiException(503,'IMAGE_STORAGE_UNAVAILABLE','Impossible de préparer la capture.');}
    try {
      const image = await this.db.prisma.$transaction(async tx => {
        await this.lockOwner(tx,ownerId);
        if (await tx.questionImage.count({where:{ownerId,questionId:null}}) >= 12) throw new ApiException(429,'IMAGE_QUOTA','Retire des captures préparées avant d’en ajouter.');
        return tx.questionImage.create({data:{ownerId,key,expiresAt:new Date(Date.now()+QUESTION_IMAGE_TTL)}});
      });
      return {id:image.id,url:questionImageUrl(image.id),expiresAt:image.expiresAt.toISOString()};
    } catch(e) {await this.discard(key);throw e;}
  }
  /** Owner and question locks are held by the caller. Linking and question/receipt writes commit together. */
  async attach(tx:Prisma.TransactionClient, ownerId:string, questionId:string, ids?:string[]) {
    if (ids === undefined) return;
    if (ids.length > 3 || new Set(ids).size !== ids.length) throw new ApiException(400,'INVALID_QUESTION_IMAGES','Trois captures distinctes au maximum.');
    const rows = await tx.questionImage.findMany({where:{id:{in:ids}}});
    if (rows.length !== ids.length || rows.some(row => row.ownerId !== ownerId || row.questionId !== questionId && (row.questionId !== null || row.expiresAt.getTime() <= Date.now()))) throw new ApiException(400,'INVALID_QUESTION_IMAGES','Capture expirée, déjà utilisée ou appartenant à un autre compte.');
    await tx.questionImage.deleteMany({where:{questionId,id:{notIn:ids}}});
    // Detach within this transaction so position swaps cannot violate the unique constraint.
    await tx.questionImage.updateMany({where:{questionId},data:{questionId:null,position:null}});
    for (const [position,id] of ids.entries()) await tx.questionImage.update({where:{id},data:{questionId,position}});
  }
  async removePrepared(ownerId:string,id:string) {
    const key = await this.db.prisma.$transaction(async tx => {
      await this.lockOwner(tx,ownerId);
      const image = await tx.questionImage.findUnique({where:{id}});
      if (!image || image.ownerId !== ownerId || image.questionId) throw missing();
      await tx.questionImage.delete({where:{id}});return image.key;
    });
    await this.discard(key);
  }
  async read(id:string, viewerId?:string) {
    const image = await this.db.prisma.questionImage.findUnique({where:{id},include:{question:{select:{visibility:true,deletedAt:true}}}});
    if (!image || (image.question ? image.question.visibility !== 'VISIBLE' || image.question.deletedAt !== null : image.ownerId !== viewerId || image.expiresAt.getTime() <= Date.now())) throw missing();
    try {
      await this.storage();
      const entry = await lstat(this.location(image.key));
      if (!entry.isFile() || entry.isSymbolicLink()) throw missing();
      const file = await open(this.location(image.key), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      try {const info = await file.stat();if (!info.isFile() || info.size > 16 * 1024 * 1024) throw missing();return await file.readFile();} finally {await file.close();}
    } catch {throw missing();}
  }
  /** Bounded explicit maintenance; simulation by default. Hidden questions are retained for moderation review. */
  async cleanup(execute=false) {
    await this.storage();let selected=0,removed=0,orphans=0;
    const eligible = {OR:[{questionId:null,expiresAt:{lte:new Date()}},{question:{retentionErasedAt:{not:null}}}]} satisfies Prisma.QuestionImageWhereInput;
    for (const candidate of await this.db.prisma.questionImage.findMany({where:eligible,take:100,orderBy:{createdAt:'asc'}})) {
      selected++;
      if (!execute) continue;
      const key = await this.db.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id=${candidate.ownerId}::uuid FOR UPDATE`;
        const image = await tx.questionImage.findFirst({where:{id:candidate.id,...eligible}});
        if (!image) return null;
        await tx.questionImage.delete({where:{id:image.id}});return image.key;
      });
      if (key) {await this.discard(key);removed++;}
    }
    for (const key of (await readdir(this.env.questionImageDir!)).filter(key=>KEY.test(key))) {
      const info = await lstat(this.location(key));
      if (!info.isFile() || info.isSymbolicLink() || Date.now()-info.mtimeMs < 86400000 || await this.db.prisma.questionImage.count({where:{key}})) continue;
      orphans++;if (execute) await this.discard(key);
      if (orphans >= 100) break;
    }
    return {selected,removed,orphans,execute};
  }
}
