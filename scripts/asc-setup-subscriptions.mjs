/**
 * Create 课消本 Pro subscription group + monthly/yearly subs (App Store Connect API).
 * Run: node scripts/asc-setup-subscriptions.mjs
 */
import fs from 'fs';
import crypto from 'crypto';
const IAP_PRODUCT_IDS = {
  monthly: 'com.zhangkaiwu222.kexiaoben.pro.monthly',
  yearly: 'com.zhangkaiwu222.kexiaoben.pro.yearly',
};

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
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} → ${res.status}: ${text}`);
  }
  return json;
}

async function main() {
  let groups = await api(`/apps/${APP_ID}/subscriptionGroups?limit=5`);
  let groupId = groups.data?.[0]?.id;
  if (!groupId) {
    const created = await api('/subscriptionGroups', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'subscriptionGroups',
          attributes: { referenceName: '课消本 Pro' },
          relationships: { app: { data: { type: 'apps', id: APP_ID } } },
        },
      }),
    });
    groupId = created.data.id;
    console.log('Created subscription group:', groupId);
  } else {
    console.log('Existing subscription group:', groupId);
  }

  const subs = await api(`/subscriptionGroups/${groupId}/subscriptions?limit=10`);
  const existing = new Set((subs.data ?? []).map((s) => s.attributes?.productId));

  for (const [plan, productId, name, period] of [
    ['monthly', IAP_PRODUCT_IDS.monthly, 'Pro 月度', 'ONE_MONTH'],
    ['yearly', IAP_PRODUCT_IDS.yearly, 'Pro 年度', 'ONE_YEAR'],
  ]) {
    if (existing.has(productId)) {
      console.log('Skip existing:', productId);
      continue;
    }
    try {
      const created = await api('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'subscriptions',
            attributes: {
              name,
              productId,
              subscriptionPeriod: period,
              reviewNote: '与 App 内课消本 Pro 页面一致。',
            },
            relationships: {
              group: { data: { type: 'subscriptionGroups', id: groupId } },
            },
          },
        }),
      });
      console.log('Created subscription:', productId, created.data?.id);
    } catch (e) {
      console.error('Failed', productId, e.message);
    }
  }

  groups = await api(`/apps/${APP_ID}/subscriptionGroups?limit=5&include=subscriptions`);
  console.log(JSON.stringify(groups, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
