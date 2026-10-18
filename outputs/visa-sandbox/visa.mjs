import {createHash,createHmac,randomUUID} from 'node:crypto';
import {existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
const envPath=fileURLToPath(new URL('.env',import.meta.url));
export const host='apitest.visaacceptance.com'; // Intentionally no production switch.
export function buildRequest(action,amount,id,config,date=new Date().toUTCString(),payment=null) {
 if(!/^\d{1,3}\.\d{2}$/.test(amount)||Number(amount)<=0||Number(amount)>500)throw new Error('Use a sandbox amount from 0.01 to 500.00');
 if(!['authorize','capture','reverse'].includes(action))throw new Error('Unknown operation');
 if(action!=='authorize'&&!/^\d{1,60}$/.test(id||''))throw new Error('Supply the sandbox authorization transaction ID');
 for(const name of ['merchant','key','secret'])if(!config[name])throw new Error('Missing sandbox configuration');
 if(!/^[A-Za-z0-9_-]+$/.test(config.merchant)||!/^[A-Za-z0-9_-]+$/.test(config.key))throw new Error('Invalid merchant ID or key ID format');
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(config.secret))throw new Error('Shared secret must be Base64');
 const path=action==='authorize'?'/pts/v2/payments':`/pts/v2/payments/${id}/${action==='capture'?'captures':'reversals'}`;
 const data={clientReferenceInformation:{code:'intent-demo-'+randomUUID()},orderInformation:{amountDetails:{totalAmount:amount,currency:'USD'}}};
 if(action==='authorize'){
  data.processingInformation={capture:false};
  data.paymentInformation={card:{number:'4111111111111111',expirationMonth:'12',expirationYear:String(new Date().getUTCFullYear()+2),securityCode:'123'}};
  data.orderInformation.billTo={firstName:'Test',lastName:'Shopper',address1:'1 Market St',locality:'San Francisco',administrativeArea:'CA',postalCode:'94105',country:'US',email:'test@example.com'};
 }
 if(action==='authorize'&&payment){delete data.paymentInformation;data.tokenInformation={transientTokenJwt:payment};}
 return signedPost(path,data,config,date);
}
export function signedPost(path,data,config,date=new Date().toUTCString()){
 if(!['/microform/v2/sessions','/pts/v2/payments'].includes(path)&&!/^\/pts\/v2\/payments\/\d{1,60}\/(captures|reversals)$/.test(path))throw new Error('Invalid sandbox endpoint');
 const body=JSON.stringify(data),digest='SHA-256='+createHash('sha256').update(body).digest('base64');
 const fields=['host','v-c-date','(request-target)','digest','v-c-merchant-id'];
 const canonical=`host: ${host}\nv-c-date: ${date}\n(request-target): post ${path}\ndigest: ${digest}\nv-c-merchant-id: ${config.merchant}`;
 const signature=createHmac('sha256',Buffer.from(config.secret,'base64')).update(canonical).digest('base64');
 return {url:`https://${host}${path}`,options:{method:'POST',redirect:'error',headers:{host,'v-c-date':date,'v-c-merchant-id':config.merchant,digest,signature:`keyid="${config.key}", algorithm="HmacSHA256", headers="${fields.join(' ')}", signature="${signature}"`,'Content-Type':'application/json'},body,signal:AbortSignal.timeout(30000)}};
}
async function main(){
 if(existsSync(envPath))process.loadEnvFile(envPath);
 const config={merchant:process.env.VISA_MERCHANT_ID,key:process.env.VISA_KEY_ID,secret:process.env.VISA_SHARED_SECRET};
 const [action='doctor',amount='180.00',id]=process.argv.slice(2);
 if(action==='doctor'){for(const [name,value]of Object.entries(config))console.log(`${name}: ${value?'configured':'MISSING'}`);console.log('Endpoint: '+host+' (sandbox only)');console.log('No request sent.');return}
 const {url,options}=buildRequest(action,amount,id,config);
 const response=await fetch(url,options);
 let result;try{result=await response.json()}catch{throw new Error(`Sandbox returned HTTP ${response.status}, without JSON. No automatic retry.`)}
 // Deliberately print only an allowlist; never dump payment data or credentials.
 console.log(JSON.stringify({environment:'sandbox',httpStatus:response.status,id:result.id,status:result.status,reason:result.errorInformation?.reason,invalidFields:result.errorInformation?.details?.map(x=>x.field),amount:result.orderInformation?.amountDetails},null,2));
 if(!response.ok||result.errorInformation)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Request failed. Check local configuration, operation, transaction ID, and network connectivity. No automatic retry; check the sandbox portal for uncertain outcomes.');process.exitCode=1});
