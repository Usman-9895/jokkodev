'use client';
import {useRouter} from 'next/navigation';
import {ProjectError} from './shared';
import {projectParams} from '../../lib/jokkoprojects/query';
import type {ProjectCriteria} from '../../lib/jokkoprojects/query';
export function ProjectPreviewError({criteria}:{criteria:ProjectCriteria}){const router=useRouter();return <ProjectError retry={()=>router.push('/dev/jokkoprojects?view=list&'+projectParams(criteria))}/>;}
