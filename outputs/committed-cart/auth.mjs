import {createHash,randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {MongoClient,ObjectId} from 'mongodb';

const scryptAsync=promisify(scrypt);
const SESSION_DAYS=30;
const SCRYPT_N=16384,SCRYPT_R=8,SCRYPT_P=1,SCRYPT_KEYLEN=64;

export function normalizeEmail(email){
 const value=String(email||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)||value.length>254)throw new Error('Enter a valid email address.');
 return value;
}

export function validatePassword(password){
 const value=String(password??'');
 if(value.length<8)throw new Error('Password must be at least 8 characters.');
 if(value.length>128)throw new Error('Password must be at most 128 characters.');
 return value;
}

export async function hashPassword(password){
 const salt=randomBytes(16);
 const hash=await scryptAsync(password,salt,SCRYPT_KEYLEN,{N:SCRYPT_N,r:SCRYPT_R,p:SCRYPT_P,maxmem:64*1024*1024});
 return{salt:salt.toString('base64'),hash:Buffer.from(hash).toString('base64')};
}

export async function verifyPassword(password,saltB64,hashB64){
 const salt=Buffer.from(saltB64,'base64');
 const expected=Buffer.from(hashB64,'base64');
 const actual=Buffer.from(await scryptAsync(password,salt,SCRYPT_KEYLEN,{N:SCRYPT_N,r:SCRYPT_R,p:SCRYPT_P,maxmem:64*1024*1024}));
 return expected.length===actual.length&&timingSafeEqual(expected,actual);
}

export function hashToken(token){
 return createHash('sha256').update(token).digest('hex');
}

export function publicUser(user){
 if(!user)return null;
 return{id:String(user._id),email:user.email,createdAt:user.createdAt};
}

export async function createAuth(env=process.env){
 const uri=String(env.MONGODB_URI||'').trim();
 const dbName=String(env.MONGODB_DB||'later').trim()||'later';
 if(!uri){
  return{
   available:false,
   reason:'Set MONGODB_URI in outputs/committed-cart/.env to enable sign-up and login.',
   async close(){},
   async signup(){throw unavailable()},
   async login(){throw unavailable()},
   async logout(){},
   async userFromRequest(){return null},
   async issueSession(){throw unavailable()},
   async revokeSession(){},
  };
 }

 const client=new MongoClient(uri,{serverSelectionTimeoutMS:8000});
 try{
  await client.connect();
  await client.db(dbName).command({ping:1});
 }catch(error){
  try{await client.close();}catch{}
  console.error('MongoDB auth unavailable:',error.name);
  return{
   available:false,
   reason:'Could not reach MongoDB. Check MONGODB_URI, network access, and Atlas credentials.',
   async close(){},
   async signup(){throw unavailable('Could not reach MongoDB. Check MONGODB_URI and Atlas network access.')},
   async login(){throw unavailable('Could not reach MongoDB. Check MONGODB_URI and Atlas network access.')},
   async logout(){},
   async userFromRequest(){return null},
   async issueSession(){throw unavailable()},
   async revokeSession(){},
  };
 }

 const db=client.db(dbName);
 const users=db.collection('users');
 const sessions=db.collection('sessions');
 await users.createIndex({email:1},{unique:true});
 await sessions.createIndex({tokenHash:1},{unique:true});
 await sessions.createIndex({expiresAt:1},{expireAfterSeconds:0});

 function unavailable(message){
  const err=new Error(message||'Sign-up and login need MongoDB. Set MONGODB_URI in outputs/committed-cart/.env.');
  err.code='AUTH_UNAVAILABLE';
  return err;
 }

 async function issueSession(userId){
  const token=randomBytes(32).toString('hex');
  const now=new Date();
  const expiresAt=new Date(now.getTime()+SESSION_DAYS*86400000);
  await sessions.insertOne({tokenHash:hashToken(token),userId:new ObjectId(userId),createdAt:now.toISOString(),expiresAt});
  return{token,expiresAt};
 }

 async function revokeSession(token){
  if(!token)return;
  await sessions.deleteOne({tokenHash:hashToken(token)});
 }

 async function userFromToken(token){
  if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
  const session=await sessions.findOne({tokenHash:hashToken(token),expiresAt:{$gt:new Date()}});
  if(!session)return null;
  return users.findOne({_id:session.userId});
 }

 function readAuthToken(req){
  const bearer=req.headers.authorization?.match(/^Bearer\s+([a-f0-9]{64})$/i)?.[1];
  if(bearer)return bearer;
  return(req.headers.cookie||'').match(/(?:^|; )later_auth=([a-f0-9]{64})(?:;|$)/)?.[1]||null;
 }

 return{
  available:true,
  reason:null,
  async close(){await client.close();},
  async signup(email,password){
   const normalized=normalizeEmail(email);
   const secret=validatePassword(password);
   const {salt,hash}=await hashPassword(secret);
   const now=new Date().toISOString();
   try{
    const inserted=await users.insertOne({email:normalized,passwordSalt:salt,passwordHash:hash,createdAt:now});
    const user={_id:inserted.insertedId,email:normalized,createdAt:now};
    const session=await issueSession(user._id);
    return{user:publicUser(user),token:session.token,expiresAt:session.expiresAt.toISOString()};
   }catch(error){
    if(error?.code===11000)throw new Error('An account with this email already exists.');
    throw error;
   }
  },
  async login(email,password){
   const normalized=normalizeEmail(email);
   const secret=validatePassword(password);
   const user=await users.findOne({email:normalized});
   if(!user||!(await verifyPassword(secret,user.passwordSalt,user.passwordHash)))throw new Error('Email or password is incorrect.');
   const session=await issueSession(user._id);
   return{user:publicUser(user),token:session.token,expiresAt:session.expiresAt.toISOString()};
  },
  async logout(req){
   await revokeSession(readAuthToken(req));
  },
  async userFromRequest(req){
   return userFromToken(readAuthToken(req));
  },
  issueSession,
  revokeSession,
  readAuthToken,
 };
}

function unavailable(message){
 const err=new Error(message||'Sign-up and login need MongoDB. Set MONGODB_URI in outputs/committed-cart/.env.');
 err.code='AUTH_UNAVAILABLE';
 return err;
}
