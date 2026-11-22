/**
 * Quick ASC status: subscriptions + version IAP + build.
 */
import fs from 'fs';
import crypto from 'crypto';

const KEY_ID = '5Q5D8MM52M';
const ISSUER_ID = 'eee92558-8a20-44d9-9ca3-49dbf97b9d15';
const KEY_PATH = new URL('../secrets/AuthKey_5Q5D8MM52M.p8', import.meta.url);
const GROUP_ID = '22560107';
const VERSION_ID = '78f1099a-12fc-471a-b3e7-0fa899aaa975';

function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
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

async function api(path) {
  const res = await fetch(`https://api.appstoreconnect.apple.com/v1${path}`, {
    headers: { Authorization: `Bearer ${signJwt()}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : null;
}

const subs = await api(`/subscriptionGroups/${GROUP_ID}/subscriptions?limit=10`);
for (const s of subs.data ?? []) {
  const full = await api(`/subscriptions/${s.id}`);
  const a = full.data?.attributes ?? {};
  console.log('Sub:', s.id, a.productId, a.state, a.name);
}

const build = await api(`/appStoreVersions/${VERSION_ID}/build`);
console.log('Version build:', build.data?.id, build.data?.attributes?.version);

try {
  const iap = await api(`/appStoreVersions/${VERSION_ID}/appStoreVersionInAppPurchases?limit=20`);
  console.log('Version IAP count:', iap.data?.length ?? 0, iap.data?.map((x) => x.id));
} catch (e) {
  console.log('Version IAP:', e.message);
}
