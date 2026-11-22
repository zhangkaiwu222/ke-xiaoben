/**
 * Ensure App Store Connect app exists for 课消本; print ascAppId (numeric Apple ID).
 */
import fs from 'fs';
import crypto from 'crypto';

const KEY_ID = '5Q5D8MM52M';
const ISSUER_ID = 'eee92558-8a20-44d9-9ca3-49dbf97b9d15';
const KEY_PATH = new URL('../secrets/AuthKey_5Q5D8MM52M.p8', import.meta.url);
const BUNDLE_ID = 'com.zhangkaiwu222.kexiaoben';
const APP_NAME = '课消本';
const SKU = 'kexiaoben001';
const LOCALE = 'zh-Hans';

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
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 1200,
    aud: 'appstoreconnect-v1',
  };
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const key = fs.readFileSync(KEY_PATH, 'utf8');
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  const sig = sign.sign({ key, dsaEncoding: 'ieee-p1363' });
  return `${data}.${base64url(sig)}`;
}

async function api(path, options = {}) {
  const token = signJwt();
  const res = await fetch(`https://api.appstoreconnect.apple.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ASC API ${path} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function getBundleIdResource() {
  const json = await api(
    `/bundleIds?filter[identifier]=${encodeURIComponent(BUNDLE_ID)}&limit=1`
  );
  const row = json.data?.[0];
  if (!row) {
    throw new Error(`Bundle ID not found in portal: ${BUNDLE_ID}`);
  }
  return row.id;
}

async function findAppByBundle(bundleResourceId) {
  const json = await api(
    `/apps?filter[bundleId]=${encodeURIComponent(bundleResourceId)}&limit=5`
  );
  if (json.data?.[0]) return json.data[0];
  const all = await api(`/apps?limit=50`);
  return (
    all.data?.find((a) => a.attributes?.bundleId === BUNDLE_ID) ??
    all.data?.find((a) => a.attributes?.name === APP_NAME) ??
    null
  );
}

async function main() {
  const bundleResourceId = await getBundleIdResource();
  let app = await findAppByBundle(bundleResourceId);
  if (!app) {
    console.error(
      'No App Store Connect record yet. Create in browser: https://appstoreconnect.apple.com/apps/create'
    );
    process.exit(2);
  }
  const ascAppId = app.id;
  const name = app.attributes?.name;
  console.log(JSON.stringify({ ascAppId, name, bundleId: BUNDLE_ID }, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
