import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const dir=await mkdtemp(join(tmpdir(),'later-auth-'));
const port=4318+Math.floor(Math.random()*1000);
const base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[fileURLToPath(new URL('server.mjs',import.meta.url))],{env:{...process.env,LATER_PORT:String(port),LATER_STATE_DIR:dir,MONGODB_URI:''},stdio:['ignore','pipe','pipe']});
let logs='';server.stderr.on('data',c=>logs+=c);server.stdout.on('data',c=>logs+=c);

async function ready(){for(let i=0;i<80;i++){try{if((await fetch(base+'/api/auth/me')).ok)return;}catch{}if(server.exitCode!==null)throw new Error(logs);await new Promise(r=>setTimeout(r,100));}throw new Error('Auth test server did not start. '+logs);}
async function req(path,body){const r=await fetch(base+path,{...(body?{method:'POST',body:JSON.stringify(body)}:{}),headers:{'Content-Type':'application/json',Origin:base}});return{status:r.status,data:await r.json(),headers:r.headers};}

try{
 await ready();
 const me=await req('/api/auth/me');
 assert.equal(me.status,200);
 assert.equal(me.data.available,false);
 assert.equal(me.data.user,null);
 assert.match(me.data.reason,/MONGODB_URI/);
 const signup=await req('/api/auth/signup',{email:'niru@example.com',password:'password1'});
 assert.equal(signup.status,503);
 assert.match(signup.data.error,/MONGODB_URI/);
 const state=await req('/api/state');
 assert.equal(state.status,200);
 assert.equal(state.data.auth.available,false);
 console.log('PASS: auth endpoints degrade cleanly without MONGODB_URI.');
}finally{
 server.kill('SIGTERM');
 await new Promise(r=>server.on('exit',r));
 await rm(dir,{recursive:true,force:true});
}
