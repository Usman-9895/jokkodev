import assert from 'node:assert/strict';
import test from 'node:test';
import jpeg from 'jpeg-js';
import {PNG} from 'pngjs';
import {normalizePhoto} from '../src/modules/users/photo-image';
import {publicationHash} from '../src/modules/questions/publication-policy';
import {createHash} from 'node:crypto';
test('capture : cadrage entier, JPEG neuf sans métadonnées et budget de dimensions',async()=>{
  const image=new PNG({width:200,height:100});image.data.fill(255);
  const bytes=await normalizePhoto(PNG.sync.write(image),true),result=jpeg.decode(bytes);
  assert.equal(result.width,200);assert.equal(result.height,100);assert.equal(bytes.includes(Buffer.from('Exif')),false);
  const large=new PNG({width:3000,height:10});large.data.fill(255);
  const reduced=jpeg.decode(await normalizePhoto(PNG.sync.write(large),true));assert.equal(reduced.width,2048);assert.equal(reduced.height,7);
  for(const bytes of [Buffer.from('<svg/>'),Buffer.alloc(5*1024*1024+1),Buffer.from('GIF89a'),Buffer.from([137,80,78,71,13,10,26,10])])await assert.rejects(normalizePhoto(bytes,true));
  const bomb=PNG.sync.write(image);bomb.writeUInt32BE(4097,16);await assert.rejects(normalizePhoto(bomb,true));
  const valid=PNG.sync.write(image),duplicate=Buffer.concat([valid.subarray(0,33),valid.subarray(8,33),valid.subarray(33)]);
  await assert.rejects(normalizePhoto(duplicate,true));
  const animated=Buffer.concat([valid.subarray(0,33),Buffer.alloc(4),Buffer.from('acTL'),Buffer.alloc(4),valid.subarray(33)]);
  await assert.rejects(normalizePhoto(animated,true));
});
test('empreinte historique texte conservée ; captures et ordre entrent dans l’idempotence',()=>{
  const text={title:'Texte de test',context:'Contexte',expected:'Attendu',actual:'Obtenu',attempts:'Tentatives',technologyIds:['00000000-0000-4000-8000-000000000000'],code:null,codeLanguage:null};
  assert.equal(publicationHash(text),createHash('sha256').update(JSON.stringify(text)).digest('hex'));
  assert.notEqual(publicationHash(text),publicationHash({...text,imageIds:[]}));
  assert.notEqual(publicationHash({...text,imageIds:['a','b']}),publicationHash({...text,imageIds:['b','a']}));
});
