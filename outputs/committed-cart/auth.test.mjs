import assert from 'node:assert/strict';
import {normalizeEmail,validatePassword,hashPassword,verifyPassword,hashToken,publicUser} from './auth.mjs';
import {createAuth} from './auth.mjs';

assert.equal(normalizeEmail('  Niru@Example.COM '), 'niru@example.com');
assert.throws(()=>normalizeEmail('not-an-email'));
assert.throws(()=>validatePassword('short'));
assert.equal(validatePassword('long-enough'),'long-enough');

const {salt,hash}=await hashPassword('correct-horse');
assert.equal(await verifyPassword('correct-horse',salt,hash),true);
assert.equal(await verifyPassword('wrong-password',salt,hash),false);
assert.match(hashToken('a'.repeat(64)),/^[a-f0-9]{64}$/);
assert.deepEqual(publicUser({_id:'abc',email:'a@b.co',createdAt:'2026-01-01'}),{id:'abc',email:'a@b.co',createdAt:'2026-01-01'});

const offline=await createAuth({MONGODB_URI:''});
assert.equal(offline.available,false);
await assert.rejects(()=>offline.signup('a@b.co','password1'),/MONGODB_URI/);
assert.equal(await offline.userFromRequest({headers:{}}),null);
await offline.close();

console.log('PASS: auth helpers, password hashing, offline MongoDB fallback.');
