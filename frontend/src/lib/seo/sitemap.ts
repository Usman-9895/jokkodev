import {publicPages,SITE_ORIGIN} from './metadata.ts';
const xml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export type SitemapPage={data:{id:string;updatedAt:string}[];meta:{total:number;page:number;pageSize:number}};
export async function buildSitemap(read:(path:string)=>Promise<{kind:'ok';data:SitemapPage}|{kind:'missing'|'unavailable'}>,clock:()=>number=Date.now){
 const entries=publicPages.map(p=>'<url><loc>'+SITE_ORIGIN+p.path+'</loc></url>');
 const deadline=clock()+20000;
 for(const [endpoint,prefix] of [['questions','questions'],['projects','projets']]){
  let count=0;
  for(let page=1;page<=100;page++){
   if(clock()>deadline)return null;
   const result=await read('/'+endpoint+'?page='+page+'&pageSize=50');
   if(result.kind!=='ok'||!Array.isArray(result.data.data)||!result.data.meta)return null;
   const {data,meta}=result.data;
   if(meta.page!==page||meta.pageSize!==50||!Number.isSafeInteger(meta.total)||meta.total<0)return null;
   for(const row of data){if(!/^[0-9a-f-]{36}$/i.test(row.id)||!Number.isFinite(Date.parse(row.updatedAt)))return null;entries.push('<url><loc>'+xml(SITE_ORIGIN+'/'+prefix+'/'+encodeURIComponent(row.id))+'</loc><lastmod>'+new Date(row.updatedAt).toISOString()+'</lastmod></url>');}
   count+=data.length;
   if(count>=meta.total)break;
   if(!data.length||page===100)return null;
  }
 }
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+entries.join('')+'</urlset>';
}
