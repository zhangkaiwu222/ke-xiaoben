# 课消本（ke-xiaoben）

独立项目，与 `Desktop/App`（一起算）分开。面向小生意 / 自由职业：**按课时收费的排课与消课**。

## 路径

`c:\Users\zhang\Desktop\ke-xiaoben`

## 开发

```bash
cd c:\Users\zhang\Desktop\ke-xiaoben
npm install
npx expo start
```

## 占位配置

- 应用显示名：**课消本**
- `slug`: `ke-xiaoben`
- `bundleIdentifier` / `package`: `com.zhangkaiwu222.kexiaoben`（上架前请确认未被占用）
- 图标：已从「一起算」复制 `assets/icon.png`、`splash-icon.png`，可后续替换

## 下一步

- 学员 / 课时包 / 排课 / 消课数据模型
- 本地存储（AsyncStorage 或 SQLite）
- 如需 IAP / EAS，再添加 `eas.json` 与 `expo-iap`
