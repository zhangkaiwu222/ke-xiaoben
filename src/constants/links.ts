import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const LINKS = {
  privacy:
    (extra.privacyPolicyUrl as string) ||
    'https://zhangkaiwu222.github.io/ke-xiaoben/privacy/',
  support:
    (extra.supportUrl as string) ||
    'https://zhangkaiwu222.github.io/ke-xiaoben/support/',
  terms:
    (extra.termsUrl as string) ||
    'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
};

/** 在 App Store Connect 创建与课消本同名的订阅产品 ID */
export const IAP_PRODUCT_IDS = {
  monthly: 'com.zhangkaiwu222.kexiaoben.pro.monthly',
  yearly: 'com.zhangkaiwu222.kexiaoben.pro.yearly',
} as const;

export const IAP_SUBSCRIPTION_SKUS = [
  IAP_PRODUCT_IDS.monthly,
  IAP_PRODUCT_IDS.yearly,
] as const;
