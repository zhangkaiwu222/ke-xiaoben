import fs from 'fs';
import crypto from 'crypto';

const KEY_ID = '5Q5D8MM52M';
const ISSUER_ID = 'eee92558-8a20-44d9-9ca3-49dbf97b9d15';
const KEY_PATH = new URL('../secrets/AuthKey_5Q5D8MM52M.p8', import.meta.url);
const SUB_IDS = ['6832451442', '6832451341'];

function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt() {
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' };
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const key = fs.readFileSync(KEY_PATH, 'utf8');
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  return `${data}.${base64url(sign.sign({ key, dsaEncoding: 'ieee-p1363' }))}`;
}

async function main() {
  const token = signJwt();
  for (const id of SUB_IDS) {
    const body = {
      data: {
        type: 'subscriptionSubmissions',
        attributes: { submitWithNextAppStoreVersion: true },
        relationships: { subscription: { data: { type: 'subscriptions', id } } },
      },
    };
    const res = await fetch('https://api.appstoreconnect.apple.com/v1/subscriptionSubmissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log(id, res.status, (await res.text()).slice(0, 400));
  }
}

main();
