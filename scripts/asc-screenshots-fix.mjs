/**
 * List / delete stuck App Store screenshots (incl. iMessage) via ASC API.
 * Usage:
 *   node scripts/asc-screenshots-fix.mjs           # list only
 *   node scripts/asc-screenshots-fix.mjs --delete  # delete incomplete / iMessage sets
 */
import fs from 'fs';
import crypto from 'crypto';

const KEY_ID = '5Q5D8MM52M';
const ISSUER_ID = 'eee92558-8a20-44d9-9ca3-49dbf97b9d15';
const KEY_PATH = new URL('../secrets/AuthKey_5Q5D8MM52M.p8', import.meta.url);
const VERSION_ID = '78f1099a-12fc-471a-b3e7-0fa899aaa975';

const DELETE = process.argv.includes('--delete');

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

async function api(path, options = {}) {
  const res = await fetch(`https://api.appstoreconnect.apple.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${signJwt()}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${path} → ${res.status}: ${text.slice(0, 800)}`);
  return text ? JSON.parse(text) : null;
}

async function apiAll(path) {
  const out = [];
  let next = path.includes('?') ? path : `${path}?limit=200`;
  while (next) {
    const page = await api(next.startsWith('/') ? next : `/${next}`);
    out.push(...(page.data ?? []));
    next = page.links?.next ? page.links.next.replace('https://api.appstoreconnect.apple.com/v1', '') : null;
  }
  return out;
}

async function deleteScreenshot(id) {
  const res = await fetch(`https://api.appstoreconnect.apple.com/v1/appScreenshots/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${signJwt()}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DELETE appScreenshots/${id} → ${res.status}: ${t.slice(0, 400)}`);
  }
}

async function deleteScreenshotSet(id) {
  const res = await fetch(`https://api.appstoreconnect.apple.com/v1/appScreenshotSets/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${signJwt()}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DELETE appScreenshotSets/${id} → ${res.status}: ${t.slice(0, 400)}`);
  }
}

const localizations = await apiAll(
  `/appStoreVersions/${VERSION_ID}/appStoreVersionLocalizations`,
);

console.log('Localizations:', localizations.map((l) => `${l.id} ${l.attributes?.locale}`).join(', '));

const stuck = [];
const imessageRelated = [];

for (const loc of localizations) {
  const sets = await apiAll(`/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`);
  for (const set of sets) {
    const dtype = set.attributes?.screenshotDisplayType;
    const line = `${loc.attributes?.locale} set=${set.id} type=${dtype}`;
    const shots = await apiAll(`/appScreenshotSets/${set.id}/appScreenshots`);
    if (shots.length === 0) {
      console.log(line, '(empty set)');
      if (DELETE && String(dtype).includes('IMESSAGE')) {
        console.log('  → delete empty iMessage set');
        await deleteScreenshotSet(set.id);
      }
      continue;
    }
    for (const sh of shots) {
      const a = sh.attributes ?? {};
      const state = a.assetDeliveryState?.state ?? a.uploaded ?? a.imageAsset?.state ?? '?';
      const err = a.assetDeliveryState?.errors;
      const delivery = a.assetDeliveryState ? JSON.stringify(a.assetDeliveryState) : '';
      console.log(line, `shot=${sh.id} state=${state} file=${a.fileName ?? ''}`);
      if (delivery && delivery !== `{"state":"COMPLETE"}`) console.log('  delivery:', delivery.slice(0, 400));
      if (err?.length) console.log('  errors:', JSON.stringify(err).slice(0, 300));
      const incomplete =
        state === 'AWAITING_UPLOAD' ||
        state === 'UPLOAD_IN_PROGRESS' ||
        state === 'FAILED' ||
        state === 'PROCESSING' ||
        (typeof state === 'string' && !['COMPLETE', 'READY', 'APPROVED'].includes(state));
      if (String(dtype).includes('IMESSAGE') || String(dtype).includes('MESSAGE')) {
        imessageRelated.push({ set, sh, state, dtype });
      }
      if (incomplete || err?.length) stuck.push({ set, sh, state, dtype, loc: loc.attributes?.locale });
    }
    if (DELETE && String(dtype).includes('IMESSAGE')) {
      for (const sh of shots) {
        console.log(`  → delete iMessage screenshot ${sh.id}`);
        await deleteScreenshot(sh.id);
      }
      const after = await apiAll(`/appScreenshotSets/${set.id}/appScreenshots`);
      if (after.length === 0) {
        console.log(`  → delete iMessage set ${set.id}`);
        await deleteScreenshotSet(set.id);
      }
    }
  }
}

console.log('\n--- summary ---');
console.log('iMessage-related assets:', imessageRelated.length);
console.log('Possibly stuck:', stuck.length);
if (!DELETE) {
  console.log('\nRe-run with --delete to remove iMessage screenshot sets (clears processing blocker if app has no iMessage).');
}
