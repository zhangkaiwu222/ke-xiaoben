/**
 * Create/update App Store version review detail (contact + notes, no demo login).
 */
import fs from 'fs';
import crypto from 'crypto';

const KEY_ID = '5Q5D8MM52M';
const ISSUER_ID = 'eee92558-8a20-44d9-9ca3-49dbf97b9d15';
const KEY_PATH = new URL('../secrets/AuthKey_5Q5D8MM52M.p8', import.meta.url);
const APP_ID = '6832416586';
const VERSION_ID = '78f1099a-12fc-471a-b3e7-0fa899aaa975';

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
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${path} → ${res.status}: ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : null;
}

const notes = fs.readFileSync(new URL('../store/REVIEW_NOTES_IAP.txt', import.meta.url), 'utf8');

const attributes = {
  contactFirstName: 'Cleve',
  contactLastName: 'Zhang',
  contactEmail: 'zhangkaiwu555@gmail.com',
  notes,
  demoAccountRequired: false,
};

const phone = process.env.ASC_REVIEW_PHONE?.trim();
if (phone) attributes.contactPhone = phone;

async function main() {
  const existing = await api(`/appStoreVersions/${VERSION_ID}/appStoreReviewDetail`);
  let detailId = existing.data?.id;

  if (!detailId) {
    const created = await api('/appStoreReviewDetails', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'appStoreReviewDetails',
          attributes,
          relationships: {
            appStoreVersion: { data: { type: 'appStoreVersions', id: VERSION_ID } },
          },
        },
      }),
    });
    detailId = created.data?.id;
    console.log('Created appStoreReviewDetail', detailId);
  } else {
    await api(`/appStoreReviewDetails/${detailId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        data: { type: 'appStoreReviewDetails', id: detailId, attributes },
      }),
    });
    console.log('Updated appStoreReviewDetail', detailId);
  }

  const check = await api(`/appStoreReviewDetails/${detailId}`);
  console.log('State:', JSON.stringify(check.data?.attributes, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
