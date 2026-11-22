/**
 * Upload App Store Review attachment (screen recording) via ASC API.
 * Usage: node scripts/asc-review-attachment-upload.mjs [path-to.mp4]
 */
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

const KEY_ID = '5Q5D8MM52M';
const ISSUER_ID = 'eee92558-8a20-44d9-9ca3-49dbf97b9d15';
const KEY_PATH = new URL('../secrets/AuthKey_5Q5D8MM52M.p8', import.meta.url);
const REVIEW_DETAIL_ID = 'ce8d2871-28a9-4fd1-9e20-a9c51d4ac7c2';

import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_FILE = path.join(ROOT, 'store', 'review-recording', 'device-screen-recording.mp4');
const FILE_PATH = process.argv[2] || process.env.ASC_REVIEW_ATTACHMENT || DEFAULT_FILE;

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

async function api(pathname, options = {}) {
  const token = signJwt();
  const res = await fetch(`https://api.appstoreconnect.apple.com/v1${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${pathname} → ${res.status}: ${text.slice(0, 1200)}`);
  return text ? JSON.parse(text) : null;
}

function md5File(filePath) {
  const hash = crypto.createHash('md5');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

async function deleteExisting() {
  const list = await api(`/appStoreReviewDetails/${REVIEW_DETAIL_ID}/appStoreReviewAttachments`);
  for (const item of list.data ?? []) {
    await api(`/appStoreReviewAttachments/${item.id}`, { method: 'DELETE' });
    console.log('Deleted old attachment', item.id, item.attributes?.fileName);
  }
}

async function uploadFile(resolved) {
  if (!fs.existsSync(resolved)) throw new Error(`File not found: ${resolved}`);

  const buf = fs.readFileSync(resolved);
  const fileName = path.basename(resolved);
  const fileSize = buf.length;
  const checksum = md5File(resolved);

  console.log('Uploading', resolved, fileName, fileSize, 'bytes');

  const created = await api('/appStoreReviewAttachments', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appStoreReviewAttachments',
        attributes: { fileName, fileSize },
        relationships: {
          appStoreReviewDetail: { data: { type: 'appStoreReviewDetails', id: REVIEW_DETAIL_ID } },
        },
      },
    }),
  });

  const attId = created.data.id;
  const ops = created.data.attributes?.uploadOperations ?? created.data.attributes?.uploadoperations;
  if (!ops?.length) {
    throw new Error('No uploadOperations in create response: ' + JSON.stringify(created.data?.attributes).slice(0, 500));
  }

  for (const op of ops) {
    const start = op.offset ?? 0;
    const len = op.length ?? fileSize;
    const chunk = buf.subarray(start, start + len);
    const headers = {};
    for (const h of op.requestHeaders ?? []) {
      headers[h.name] = h.value;
    }
    const method = op.method ?? 'PUT';
    const res = await fetch(op.url, { method, headers, body: chunk });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Upload part failed ${res.status}: ${errText.slice(0, 400)}`);
    }
    console.log('Uploaded bytes', start, '+', len);
  }

  await api(`/appStoreReviewAttachments/${attId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        type: 'appStoreReviewAttachments',
        id: attId,
        attributes: { uploaded: true, sourceFileChecksum: checksum },
      },
    }),
  });
  console.log('Committed attachment', attId, 'checksum', checksum);

  for (let i = 0; i < 15; i++) {
    const check = await api(`/appStoreReviewAttachments/${attId}`);
    const delivery = check.data?.attributes?.assetDeliveryState;
    const state = typeof delivery === 'object' ? delivery?.state : delivery;
    console.log('Delivery state:', state);
    if (state === 'COMPLETE' || state === 'UPLOAD_COMPLETE') break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  return attId;
}

async function main() {
  const resolved = path.resolve(FILE_PATH);
  await deleteExisting();
  const id = await uploadFile(resolved);
  console.log('Done. Attachment ID:', id);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});