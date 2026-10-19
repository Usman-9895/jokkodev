import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAccountDraft,safeExternalLink,allowedReturnPath} from '../frontend/src/lib/accounts/presentation.ts';
const blank={pseudonym:'',email:'',password:'',confirmation:''};
test('la validation locale distingue champs vides, format email et confirmation sans politique de mot de passe inventée',()=>{
 assert.deepEqual(Object.keys(validateAccountDraft('register',blank,false)),['pseudonym','email','password','confirmation']);
 assert.equal(Boolean(validateAccountDraft('forgot',{...blank,email:'incorrect'},false).email),true);
 assert.deepEqual(validateAccountDraft('login',{...blank,email:'demo@example.com',password:'x'},true),{});
 assert.equal(Boolean(validateAccountDraft('reset',{...blank,password:'a',confirmation:'b'},true).confirmation),true);
 assert.deepEqual(validateAccountDraft('reset',{...blank,password:'a',confirmation:'a'},true),{});
 assert.deepEqual(validateAccountDraft('verify',blank,false),{});
});
test('les liens publics refusent les protocoles actifs, identifiants et caractères de contrôle',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,x','file:///tmp/x','//example.com','https://user:secret@example.com','https://example.com\n','https:\\example.com'])assert.equal(safeExternalLink(value),null,value);
 assert.equal(safeExternalLink('https://example.com/portfolio'),'https://example.com/portfolio');
 assert.equal(safeExternalLink('http://example.com'),'http://example.com/');
});
test('la primitive de retour ne permet pas une destination externe, une URL privée inconnue ou des paramètres de jeton',()=>{
 for(const value of [undefined,'https://example.com','//example.com','/admin/inconnu','/espace?token=secret','/%2fexample.com','/espace\\x','/espace\n'])assert.equal(allowedReturnPath(value),'/espace');
 assert.equal(allowedReturnPath('/questions/poser'),'/questions/poser');
 assert.equal(allowedReturnPath('/projets'),'/projets');
});
