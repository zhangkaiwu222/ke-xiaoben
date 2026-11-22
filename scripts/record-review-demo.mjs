/**
 * Record App Review walkthrough (Expo Web, iPhone viewport) → store/review-recording/
 * Run: node scripts/record-review-demo.mjs
 * Requires: npx expo web on EXPO_WEB_URL (default http://127.0.0.1:8081)
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'store', 'review-recording');
const WEB_URL = process.env.EXPO_WEB_URL ?? 'http://127.0.0.1:8081';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensurePlaywright() {
  try {
    await import('playwright');
    return true;
  } catch {
    console.log('Installing playwright (one-time)…');
    await run('npm', ['install', '-D', 'playwright@1.49.1'], ROOT);
    await run('npx', ['playwright', 'install', 'chromium'], ROOT);
    return true;
  }
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, shell: true, stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

async function waitForWeb(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await sleep(1500);
  }
  throw new Error(`Web server not ready: ${url}`);
}

async function maybeStartExpo() {
  try {
    await waitForWeb(WEB_URL, 5000);
    console.log('Using existing server', WEB_URL);
    return null;
  } catch {
    console.log('Starting expo web…');
    const child = spawn(
      'npx',
      ['expo', 'start', '--web', '--port', '8081'],
      {
        cwd: ROOT,
        shell: true,
        env: { ...process.env, CI: '1', BROWSER: 'none' },
        stdio: 'ignore',
        detached: true,
      },
    );
    child.unref();
    await waitForWeb(WEB_URL);
    return child;
  }
}

async function record() {
  await ensurePlaywright();
  const { chromium, devices } = await import('playwright');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const videoDir = path.join(OUT_DIR, '_playwright-videos');
  fs.mkdirSync(videoDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 14 Pro'],
    locale: 'zh-CN',
    recordVideo: { dir: videoDir, size: { width: 393, height: 852 } },
  });
  const page = await context.newPage();

  const tap = async (name) => {
    const el = page.getByText(name, { exact: false }).first();
    await el.waitFor({ state: 'visible', timeout: 15_000 });
    await el.click();
    await sleep(800);
  };

  await page.goto(WEB_URL, { waitUntil: 'networkidle', timeout: 120_000 });
  await sleep(2500);

  await tap('学员');
  await sleep(1200);
  const addBtn = page.getByText(/添加|新建/).first();
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
    await sleep(600);
    await page.getByPlaceholder(/姓名/).fill('审核示例学员');
    await page.getByPlaceholder(/科目/).fill('瑜伽');
    const purchased = page.getByDisplayValue('0').first();
    if (await purchased.isVisible().catch(() => false)) {
      await purchased.fill('10');
    }
    await tap('保存');
    await sleep(1500);
    const buy = page.getByText(/购课|购买课时/).first();
    if (await buy.isVisible().catch(() => false)) {
      await buy.click();
      await sleep(1200);
      const confirm = page.getByText(/确认|保存|确定/).first();
      if (await confirm.isVisible().catch(() => false)) await confirm.click();
      await sleep(1000);
    }
    const consume = page.getByText(/消课|消 1/).first();
    if (await consume.isVisible().catch(() => false)) {
      await consume.click();
      await sleep(1000);
    }
    await page.goBack().catch(() => {});
    await sleep(500);
  }

  await tap('排课');
  await sleep(2000);
  await tap('更多');
  await sleep(1200);
  await tap('升级课消本 Pro');
  await sleep(2000);
  const devUnlock = page.getByText('[开发] 模拟解锁 Pro');
  if (await devUnlock.isVisible().catch(() => false)) {
    await devUnlock.click();
    await sleep(2000);
  }
  await tap('备份');
  await sleep(1500);
  await page.goBack().catch(() => {});
  await sleep(500);
  await tap('首页');
  await sleep(2000);

  const video = page.video();
  await context.close();
  await browser.close();

  const webmPath = await video.path();
  const mp4Out = path.join(OUT_DIR, '课消本-AppReview-操作演示.mp4');
  await run('ffmpeg', ['-y', '-i', webmPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4Out], ROOT);
  const movOut = path.join(OUT_DIR, '课消本-AppReview-操作演示.mov');
  await run('ffmpeg', ['-y', '-i', mp4Out, '-c', 'copy', movOut], ROOT);
  console.log('Wrote', mp4Out);
  console.log('Wrote', movOut);
}

async function main() {
  const child = await maybeStartExpo();
  try {
    await record();
  } finally {
    if (child) try { process.kill(-child.pid); } catch { /* */ }
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
