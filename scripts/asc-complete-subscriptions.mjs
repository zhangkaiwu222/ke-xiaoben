/**
 * Fill localizations + CN prices for 课消本 Pro subscriptions.
 */
import fs from 'fs';
import crypto from 'crypto';

const KEY_ID = '5Q5D8MM52M';
const ISSUER_ID = 'eee92558-8a20-44d9-9ca3-49dbf97b9d15';
const KEY_PATH = new URL('../secrets/AuthKey_5Q5D8MM52M.p8', import.meta.url);

const SUBS = {
  monthly: { id: '6832451442', display: '课消本 Pro · 月度', target: 15 },
  yearly: { id: '6832451341', display: '课消本 Pro · 年度', target: 98 },
};

const DESC =
  '解锁不限学员、90天排课、多月统计与CSV、课程模板。自动续期，可在系统订阅管理中取消。';

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
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function pickPricePoint(points, target) {
  const list = points.data ?? [];
  let best = list[0];
  let bestDiff = Infinity;
  for (const p of list) {
    const price = Number.parseFloat(p.attributes?.customerPrice ?? '9999');
    const diff = Math.abs(price - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best;
}

async function ensureLocalization(subId, name) {
  try {
    await api('/subscriptionLocalizations', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'subscriptionLocalizations',
          attributes: { locale: 'zh-Hans', name, description: DESC },
          relationships: { subscription: { data: { type: 'subscriptions', id: subId } } },
        },
      }),
    });
    console.log('Localization OK:', subId);
  } catch (e) {
    if (String(e.message).includes('409')) console.log('Localization exists:', subId);
    else throw e;
  }
}

async function ensureAvailability(subId) {
  try {
    await api('/subscriptionAvailabilities', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'subscriptionAvailabilities',
          attributes: { availableInNewTerritories: true },
          relationships: {
            subscription: { data: { type: 'subscriptions', id: subId } },
            availableTerritories: {
              data: [{ type: 'territories', id: 'CHN' }, { type: 'territories', id: 'USA' }],
            },
          },
        },
      }),
    });
    console.log('Availability OK:', subId);
  } catch (e) {
    if (String(e.message).includes('409')) console.log('Availability may exist:', subId);
    else console.warn('Availability:', e.message.split('\n')[0]);
  }
}

async function setPrice(subId, target) {
  const points = await api(
    `/subscriptions/${subId}/pricePoints?filter[territory]=USA&limit=200`,
  );
  if (!points?.data?.length) {
    console.warn('No USA price points for', subId);
    return;
  }
  const pick = pickPricePoint(points, target);
  try {
    await api('/subscriptionPrices', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'subscriptionPrices',
          attributes: { startDate: null },
          relationships: {
            subscription: { data: { type: 'subscriptions', id: subId } },
            subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: pick.id } },
          },
        },
      }),
    });
    console.log(`Price OK ${subId}: $${pick.attributes?.customerPrice} (target ~${target})`);
  } catch (e) {
    if (String(e.message).includes('409')) console.log('Price may exist:', subId);
    else throw e;
  }
  const eq = await api(
    `/subscriptionPricePoints/${pick.id}/equalizations?limit=200`,
  );
  for (const p of eq.data ?? []) {
    try {
      await api('/subscriptionPrices', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'subscriptionPrices',
            attributes: { startDate: null },
            relationships: {
              subscription: { data: { type: 'subscriptions', id: subId } },
              subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: p.id } },
            },
          },
        }),
      });
    } catch {
      /* skip duplicate territory */
    }
  }
  console.log('Equalized prices for', subId);
}

async function main() {
  for (const [key, meta] of Object.entries(SUBS)) {
    await ensureLocalization(meta.id, meta.display);
    await ensureAvailability(meta.id);
    await setPrice(meta.id, meta.target);
    const sub = await api(`/subscriptions/${meta.id}`);
    console.log(key, sub.data?.attributes?.state, sub.data?.attributes?.productId);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
