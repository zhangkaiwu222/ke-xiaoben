/**
 * Patch appStoreVersionLocalizations from store/metadata.zh-Hans.md fields.
 */
import fs from 'fs';
import crypto from 'crypto';

const KEY_ID = '5Q5D8MM52M';
const ISSUER_ID = 'eee92558-8a20-44d9-9ca3-49dbf97b9d15';
const KEY_PATH = new URL('../secrets/AuthKey_5Q5D8MM52M.p8', import.meta.url);
const VERSION_ID = '78f1099a-12fc-471a-b3e7-0fa899aaa975';

const SUPPORT = 'https://zhangkaiwu222.github.io/ke-xiaoben/support/';

const ZH = {
  description: `课消本帮助私教老师管理学生课时，无需联网账号。

主要功能：
· 学生档案与剩余课时一目了然
· 购课、消课记录可追溯
· 排课与一周日程，支持快捷「消 1 节」
· 备份导出 JSON，换机可导入
· 当月课时统计（Pro 可切换任意月份并导出 CSV）
· 可选本地课前提醒（需允许通知权限）

免费版：最多 8 位学员、14 天排课视野。课消本 Pro（App 内自动续期订阅）可解锁不限学员、90 天排课、多月统计与 CSV、课程主题模板等。订阅由 Apple ID 扣款，可在系统「设置 → Apple ID → 订阅」中管理或取消。

所有业务数据默认仅存储在你的 iPhone/iPad 本机，不上传服务器。卸载或清空数据后无法由我们恢复，请善用备份功能。`,
  keywords: '私教,课时,消课,排课,教练,学生,记账,课表',
  promotionalText:
    '专为一对一私教设计的轻量课消本：记学生、买课、消课、排课，数据保存在本机。',
  supportUrl: SUPPORT,
  marketingUrl: SUPPORT,
};

const EN = {
  description: `Ke Xiaoben helps private coaches track lessons and schedules. Data stays on your device.

Free: up to 8 students, 14-day schedule view. Pro unlocks unlimited students, 90-day schedule, multi-month stats, CSV export, and templates via in-app auto-renewing subscriptions.`,
  keywords: 'coach,lessons,schedule,students,tutor',
  supportUrl: SUPPORT,
  marketingUrl: SUPPORT,
};

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
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${path} → ${res.status}: ${text.slice(0, 600)}`);
  return text ? JSON.parse(text) : null;
}

async function patchLocalization(id, locale, attrs) {
  await api(`/appStoreVersionLocalizations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: { type: 'appStoreVersionLocalizations', id, attributes: attrs },
    }),
  });
  console.log('Patched', locale, id);
}

async function ensureZhHans(localizations) {
  const hasZh = localizations.some((r) => r.attributes?.locale === 'zh-Hans');
  if (hasZh) return;
  const created = await api('/appStoreVersionLocalizations', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appStoreVersionLocalizations',
        attributes: { locale: 'zh-Hans', ...ZH },
        relationships: {
          appStoreVersion: { data: { type: 'appStoreVersions', id: VERSION_ID } },
        },
      },
    }),
  });
  console.log('Created zh-Hans', created.data?.id);
  localizations.push(created.data);
}

async function main() {
  const json = await api(`/appStoreVersions/${VERSION_ID}/appStoreVersionLocalizations?limit=20`);
  const rows = json.data ?? [];
  await ensureZhHans(rows);
  for (const row of rows) {
    const locale = row.attributes?.locale;
    const id = row.id;
    if (locale === 'zh-Hans') await patchLocalization(id, locale, ZH);
    else if (locale === 'en-US') await patchLocalization(id, locale, EN);
    else console.log('Skip', locale, id);
  }

}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
