import assert from 'node:assert/strict';
import {createHash,createHmac} from 'node:crypto';
import {buildRequest} from './visa.mjs';
const config={merchant:'test_merchant',key:'test-key',secret:Buffer.from('offline-test-key').toString('base64')};
for(const action of ['authorize','capture','reverse']){
 const {url,options}=buildRequest(action,'180.00','123456789',config,'Sat, 17 Oct 2026 12:00:00 GMT');
 assert.equal(new URL(url).host,'apitest.visaacceptance.com');
 assert.equal(options.redirect,'error');
 assert.equal(options.headers.digest,'SHA-256='+createHash('sha256').update(options.body).digest('base64'));
 const headers=options.headers;
 const canonical=`host: ${headers.host}\nv-c-date: ${headers['v-c-date']}\n(request-target): post ${new URL(url).pathname}\ndigest: ${headers.digest}\nv-c-merchant-id: ${headers['v-c-merchant-id']}`;
 const signature=createHmac('sha256',Buffer.from(config.secret,'base64')).update(canonical).digest('base64');
 assert.ok(headers.signature.endsWith(`signature="${signature}"`));
 if(action==='authorize')assert.equal(JSON.parse(options.body).processingInformation.capture,false);
 else assert.ok(!JSON.parse(options.body).paymentInformation);
}
for(const amount of ['0.00','-1.00','999.00','NaN','1e2'])assert.throws(()=>buildRequest('authorize',amount,null,config));
assert.throws(()=>buildRequest('capture','10.00','../../other',config));
console.log('PASS: sandbox-only endpoints, authorization without capture, follow-on operations, signing, invalid amount/ID rejection. No network requests made.');
