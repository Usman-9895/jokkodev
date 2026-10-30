import type {MetadataRoute} from 'next';
import {SITE_ORIGIN} from '../lib/seo/metadata';
// Les pages privées restent explorables afin que les robots puissent lire noindex.
// Leur protection est assurée par les autorisations serveur, jamais par robots.txt.
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:'/api/'},sitemap:SITE_ORIGIN+'/sitemap.xml',host:SITE_ORIGIN};}
