import assert from 'node:assert/strict';
const origin='chrome-extension://kahjaomahjnhcppboeagnjclfbnjgjje';
const pre=await fetch('http://localhost:4318/api/state',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'Content-Type'}});
assert.equal(pre.status,204);assert.equal(pre.headers.get('access-control-allow-origin'),origin);assert.equal(pre.headers.get('access-control-allow-credentials'),'true');
const foreign=await fetch('http://localhost:4318/api/state',{method:'OPTIONS',headers:{Origin:'https://evil.example','Access-Control-Request-Method':'POST'}});assert.equal(foreign.headers.get('access-control-allow-origin'),null);
const denied=await fetch('http://localhost:4318/api/compare',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,403);
const card=await fetch('http://localhost:4318/secure-card.css');assert.equal(card.status,200);
console.log('PASS: exact-extension CORS, foreign-origin POST rejection, secure card stylesheet. No payment request sent.');
