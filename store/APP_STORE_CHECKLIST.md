# 课消本 · App Store 上架清单（仅 iOS）

Expo 项目；Windows 上可用 **EAS Build** 打正式包。审核规则与原生 App 相同。

## A. 账号与标识

- [ ] Apple ID 已开双重认证
- [ ] **Apple Developer Program**（$99/年）
- [ ] Bundle ID 固定：`com.zhangkaiwu222.kexiaoben`
- [ ] App Store Connect 已创建 App，记下数字 **Apple ID**（`ascAppId`）
- [ ] `npx eas-cli init` 已执行，`app.json` → `extra.eas.projectId` 为真实值

## B. 应用合规（当前版本）

- [x] 无账号登录即可使用核心功能
- [x] 无内购（上架后若加付费再单独接 IAP）
- [x] `ITSAppUsesNonExemptEncryption = false`（未使用自定义加密）
- [x] 通知权限文案：`NSUserNotificationsUsageDescription`（本地课前提醒）
- [ ] 商店截图与描述**不出现** Android / Google Play 字样
- [ ] App 内不做「去外链安装新版本」式热更新引导

## C. 隐私与支持（高频拒因）

- [x] 仓库内草稿：`docs/privacy/`、`docs/support/`（静态 HTML）
- [ ] 托管到 **HTTPS**（如 GitHub Pages：`zhangkaiwu222.github.io/ke-xiaoben/...`）
- [ ] 把真实 URL 写入 `app.json` → `extra.privacyPolicyUrl`、`extra.supportUrl`
- [ ] 替换支持邮箱（见 `docs/support/index.html`）
- [ ] App Store Connect 填写隐私政策 URL、技术支持 URL
- [ ] **App 隐私问卷**：数据仅存设备本地（学生姓名、课时记录、排课）；无追踪则勿勾选跨 App 追踪；通知为本地调度、非远程推送收集

## D. 测试

详见 [`IOS_TESTFLIGHT.md`](./IOS_TESTFLIGHT.md)。

- [ ] Expo Go 冒烟测试（可选）
- [ ] **TestFlight 至少一轮**（尤其本地通知）
- [ ] 大字号、深色模式（若支持）肉眼扫一眼

## E. 构建与提交

```powershell
npm i -g eas-cli
eas login
eas init
npm run build:ios
npm run submit:ios
```

- [ ] 按 `store/metadata.zh-Hans.md` 填写商店文案
- [ ] 上传 **6.7"** 与 **5.5"**（或苹果当前要求的尺寸）截图
- [ ] 年龄分级：无用户生成公开内容、无赌博等，一般为 4+
- [ ] 提交审核；被拒按 Resolution Center 修改后可再提

## F. 费用速查

| 项目 | 费用 |
|------|------|
| 开发者账号 | $99/年 |
| EAS 免费档 | 有限次数构建；超额按 Expo 定价 |
| 隐私页托管 | GitHub Pages 可 ¥0 |
| 无内购 | 无 App Store 佣金 |

## G. 与本仓库脚本对应

| 命令 | 作用 |
|------|------|
| `npm run eas:login` | 登录 Expo |
| `npm run eas:init` | 绑定 EAS 项目 |
| `npm run build:ios` | production iOS 包 |
| `npm run build:ios:preview` | 内测 Ad Hoc 包 |
| `npm run submit:ios` | 提交到 App Store Connect |
