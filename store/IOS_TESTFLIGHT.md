# 课消本 · iOS 真机验证（Windows + EAS）

在 **Windows** 上开发时，不要依赖本机 Xcode。用 **EAS 云构建 → TestFlight** 在 iPhone 上验证（含本地通知）。

| 方案 | Windows 可行 | 装真机 | 说明 |
|------|-------------|--------|------|
| **EAS → TestFlight**（推荐） | ✅ | ✅ | 苹果官方测试通道 |
| EAS `preview` 内部分发 | ✅ | ✅ | Ad Hoc，需登记设备 UDID |
| 仅 Expo Go | ✅ | ✅ | 功能可先摸一遍；**课前提醒**建议用 TestFlight 再测 |

## 前置条件

1. 已付费 **Apple Developer Program**
2. 在开发者后台注册 Bundle ID：`com.zhangkaiwu222.kexiaoben`
3. 在 App Store Connect **新建 App**（见下方「首次建 App」）
4. [expo.dev](https://expo.dev) 已登录；`app.json` 的 `owner` 与账号一致更佳
5. 本机可执行 `npx eas-cli`

## 0. 首次建 App

### 0.1 注册 Bundle ID

1. 打开 [Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. **+** → **App IDs** → **App**
3. Bundle ID（Explicit）：`com.zhangkaiwu222.kexiaoben`
4. 默认 Capabilities 即可；本地通知不需额外 Capability

### 0.2 App Store Connect 创建 App

1. [App Store Connect](https://appstoreconnect.apple.com) → **我的 App** → **+** → **新建 App**
2. 平台：**iOS**；名称：`课消本`；语言：**简体中文**
3. Bundle ID：选 `com.zhangkaiwu222.kexiaoben`
4. SKU：例如 `kexiaoben001`
5. 记下 **Apple ID**（数字）——`eas submit` 时可填为 `ascAppId`（也可交互输入）

## A. 推荐流程：production → TestFlight

在项目根目录（PowerShell）：

```powershell
# 1) 登录 Expo
npx eas-cli login

# 2) 绑定 EAS 项目（会把 projectId 写入 app.json）
npx eas-cli init

# 3) 配置 Apple 凭证（首次交互）
npx eas-cli credentials --platform ios

# 4) 云端打 iOS 包（约 15–30 分钟）
npm run build:ios

# 5) 上传到 App Store Connect
npm run submit:ios
```

然后在 App Store Connect → **TestFlight** 等待处理，把自己的 Apple ID 加为**内部测试**成员，用 iPhone 安装 TestFlight 再安装「课消本」。

## B. 更快迭代：preview 内测包

```powershell
npm run build:ios:preview
```

构建完成后按 EAS 页面说明安装；需事先在 Apple 开发者后台登记测试机 UDID。

## C. TestFlight 功能自检（课消本）

- [ ] 新增/编辑学生，课时购买与消课
- [ ] 排课、日程列表、「消 1 节」
- [ ] 首页统计、学生搜索
- [ ] 备份导出/从剪贴板导入
- [ ] 月度统计与 CSV
- [ ] **设置 → 课前提醒**：开权限后新增未来排课，到点是否触发本地通知
- [ ] 冷启动后数据仍在（AsyncStorage）

## D. `eas.json` 与 submit

- `build.production` 已开 `autoIncrement`，版本号建议在 EAS 远程管理（`appVersionSource: remote`）
- `submit.production.ios` 留空即可：首次 `eas submit` 会提示输入 **ascAppId**、Apple 团队等
- 若使用 App Store Connect API Key，可把 `.p8` 放在 `secrets/`（已 gitignore），再在 `eas.json` 里配置 `ascApiKeyPath` / `ascApiKeyId` / `ascApiKeyIssuerId`（勿提交密钥到公开仓库）

详细上架项见 [`APP_STORE_CHECKLIST.md`](./APP_STORE_CHECKLIST.md)。
