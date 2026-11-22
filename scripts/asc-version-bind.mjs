/**
 * Print / attach iOS version in Prepare for Submission — subscriptions + build hints.
 */
import fs from 'fs';
import crypto from 'crypto';

const KEY_ID = '5Q5D8MM52M';
const ISSUER_ID = 'eee92558-8a20-44d9-9ca3-49dbf97b9d15';
const KEY_PATH = new URL('../secrets/AuthKey_5Q5D8MM52M.p8', import.meta.url);
const APP_ID = '6832416586';

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

async function main() {
  const versions = await api(
    `/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=5`,
  );
  for (const v of versions.data ?? []) {
    const a = v.attributes ?? {};
    console.log('Version', v.id, a.versionString, a.appStoreState, 'build:', a.build?.data?.id);
  }

  const builds = await api(`/apps/${APP_ID}/builds?limit=10`);
  for (const b of builds.data ?? []) {
    console.log(
      'Build',
      b.id,
      b.attributes?.version,
      'buildNum',
      b.attributes?.buildNumber,
      b.attributes?.processingState,
    );
  }

  const versionId = versions.data?.[0]?.id;
  const candidates = (builds.data ?? [])
    .filter((b) => b.attributes?.processingState === 'VALID')
    .sort((a, b) => Number(b.attributes?.version) - Number(a.attributes?.version));
  const latest = candidates[0];
  if (versionId && latest) {
    await api(`/appStoreVersions/${versionId}/relationships/build`, {
      method: 'PATCH',
      body: JSON.stringify({ data: { type: 'builds', id: latest.id } }),
    });
    console.log(
      'Attached build',
      latest.attributes?.version,
      latest.id,
      'to version',
      versionId,
    );
  } else {
    console.warn('No valid build or version missing');
  }

  const notes = fs.readFileSync(new URL('../store/REVIEW_NOTES_IAP.txt', import.meta.url), 'utf8');
  let detailId;
  const detail = await api(`/appStoreVersions/${versionId}/appStoreReviewDetail`);
  detailId = detail.data?.id;
  if (!detailId) {
    console.warn('No appStoreReviewDetail yet; run scripts/asc-review-contact.mjs (set ASC_REVIEW_PHONE)');
  }
  if (detailId) {
    await api(`/appStoreReviewDetails/${detailId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        data: { type: 'appStoreReviewDetails', id: detailId, attributes: { notes } },
      }),
    });
    console.log('Updated review notes on', detailId);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
