import type {components} from '@jokkodev/api-client';
import type {HttpQuery} from '@jokkodev/api-client/http';

export type DeletionKind='question'|'project';
export function mayDelete(phase:string,userId:string|undefined,ownerId:string|undefined,deletedAt?:string|null){return phase==='authenticated'&&!!userId&&userId===ownerId&&!deletedAt;}
type Tombstone=Pick<components['schemas']['OwnQuestionSummaryDto'],'id'|'deletedAt'>;
type PrivatePage={data:Tombstone[];meta:components['schemas']['PageMetaDto']};
/** A public 404 is not proof of deletion. Read the owner's private reference, with no mutation replay. */
export async function readDeletion(kind:DeletionKind,id:string,read:(path:string,query:HttpQuery)=>Promise<PrivatePage>):Promise<'deleted'|'active'|'unknown'>{
  for(let page=1;page<=10000;page++){
    const value=await read(kind==='question'?'/users/me/questions':'/users/me/projects',{page,pageSize:50});
    const row=value.data.find(r=>r.id===id);
    if(row)return row.deletedAt?'deleted':'active';
    if(page*value.meta.pageSize>=value.meta.total)return 'unknown';
  }
  return 'unknown';
}
