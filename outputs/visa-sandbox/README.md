# Visa Acceptance sandbox — local setup

Node.js 22+; no npm dependencies. This is a standalone sandbox API harness, not yet connected to the chat UI. It never uses production endpoints or accepts personal card details.

1. Sign into your Visa Acceptance sandbox Business Center.
2. Open Payment Configuration → Key Management (menu labels may vary).
3. Generate a REST shared secret / HTTP Signature key.
4. Copy `.env.example` to `.env` in this folder. Enter the merchant ID, key ID, and Base64 shared secret locally. Do not send them in chat. `.env` is ignored by the parent project; keep it out of archives and source control.
5. From this folder run `node visa.mjs doctor`. It reports presence only, never values.
6. Run `node visa.mjs authorize 180.00` to submit an authorization-only TEST transaction. Note the returned ID and status. A sandbox authorization is simulated, not a real card hold.
7. Choose one branch for that authorization:
   - `node visa.mjs reverse 180.00 AUTHORIZATION_ID`
   - OR `node visa.mjs capture 180.00 AUTHORIZATION_ID`

Use the amount actually authorized for a reversal. Follow-on behavior and partial captures depend on processor configuration. Start by reversing a full authorization. Test capture on a separate authorization. Capture may return PENDING; do not call it settled without confirmation in the portal. Do not automatically retry an uncertain payment request; inspect the portal first.

`node test.mjs` runs offline request-signing and validation checks. No account connection has been verified until an actual sandbox request succeeds.

The merchant account remains fixed for these calls. This does not demonstrate transferring an authorization to another merchant or selecting a sub-merchant after authorization; that requires confirmation from Visa/your processor.

Official references:
- https://developer.visaacceptance.com/docs/vas/en-us/platform/get-started/all/rest/GettingStarted/authentication/GenerateHeader/httpSignatureAuthentication.html
- https://developer.visaacceptance.com/docs/vas/en-us/payments/developer/ctv/rest/payments.html
