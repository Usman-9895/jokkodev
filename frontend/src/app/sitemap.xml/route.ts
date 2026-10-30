import {publicRead} from '../../lib/seo/public-data';
import {buildSitemap} from '../../lib/seo/sitemap';
import type {SitemapPage} from '../../lib/seo/sitemap';
export const dynamic='force-dynamic';
export async function GET(){
 const document=await buildSitemap(path=>publicRead<SitemapPage>(path));
 if(document===null)return new Response('Sitemap momentanément indisponible',{status:503,headers:{'Retry-After':'300','Cache-Control':'no-store'}});
 return new Response(document,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});
}
