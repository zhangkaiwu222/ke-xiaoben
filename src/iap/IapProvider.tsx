import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import {
  fetchProducts as fetchProductsDirect,
  getUserFriendlyErrorMessage,
  isUserCancelledError,
  useIAP,
  type ProductSubscription,
  type Purchase,
} from 'expo-iap';
import { IAP_PRODUCT_IDS, IAP_SUBSCRIPTION_SKUS } from '../constants/links';
import { useApp } from '../context/AppContext';

function isOurSubscription(productId: string | undefined): boolean {
  if (!productId) return false;
  return (IAP_SUBSCRIPTION_SKUS as readonly string[]).includes(productId);
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

type IapContextValue = {
  storeReady: boolean;
  connected: boolean;
  purchasing: boolean;
  monthly?: ProductSubscription;
  yearly?: ProductSubscription;
  subscribe: (plan: 'monthly' | 'yearly') => Promise<{ ok: boolean; reason?: string }>;
  restore: () => Promise<{ ok: boolean; reason?: string }>;
  retryLoadStore: () => Promise<void>;
  lastError: string | null;
};

const noopIap: IapContextValue = {
  storeReady: false,
  connected: false,
  purchasing: false,
  subscribe: async () => ({ ok: false, reason: 'unsupported' }),
  restore: async () => ({ ok: false, reason: 'unsupported' }),
  retryLoadStore: async () => {},
  lastError: null,
};

const IapContext = createContext<IapContextValue>(noopIap);

function findSub(subs: ProductSubscription[], sku: string) {
  return subs.find((s) => s.id === sku);
}

function IapProviderIOS({ children }: { children: React.ReactNode }) {
  const { syncProFromStore } = useApp();
  const iapRef = useRef<ReturnType<typeof useIAP> | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const loadGen = useRef(0);

  const iap = useIAP({
    onPurchaseSuccess: async (purchase: Purchase) => {
      if (!isOurSubscription(purchase.productId)) return;
      try {
        await iapRef.current?.finishTransaction({ purchase, isConsumable: false });
        syncProFromStore(true, purchase.productId);
      } catch (e) {
        setLastError(e instanceof Error ? e.message : String(e));
      } finally {
        setPurchasing(false);
      }
    },
    onPurchaseError: (error) => {
      setPurchasing(false);
      if (isUserCancelledError(error)) return;
      setLastError(getUserFriendlyErrorMessage(error));
    },
    onError: (error) => {
      setLastError(error.message);
    },
  });

  // expo-iap 的 useIAP() 每次渲染都返回一个全新的对象字面量。
  // 若把整个 iap 对象放进 useCallback/useEffect 依赖，会导致每次渲染依赖都变化，
  // 进而反复执行 loadProducts -> setLastError -> 重渲染 -> 依赖又变，形成无限循环
  // （表现为 Pro 页黄色警告与加载状态疯狂闪烁）。
  // 因此这里统一用 iapRef 读取最新值，依赖只保留稳定的原语/方法引用。
  iapRef.current = iap;
  const connected = iap.connected;
  const subscriptions = iap.subscriptions;
  // expo-iap 内部用 useCallback 包裹，reconnect 引用稳定，可安全放进依赖数组。
  const reconnect = iap.reconnect;

  const refreshEntitlement = useCallback(async () => {
    try {
      const active = await iapRef.current?.hasActiveSubscriptions([...IAP_SUBSCRIPTION_SKUS]);
      syncProFromStore(active ?? false);
    } catch {
      /* keep cached entitlement */
    }
  }, [syncProFromStore]);

  const loadProducts = useCallback(async () => {
    const gen = ++loadGen.current;
    setLastError(null);
    try {
      const result = await withTimeout(
        fetchProductsDirect({ skus: [...IAP_SUBSCRIPTION_SKUS], type: 'subs' }),
        20_000,
        'fetchProducts timeout',
      );
      if (gen !== loadGen.current) return;
      await iapRef.current?.fetchProducts({ skus: [...IAP_SUBSCRIPTION_SKUS], type: 'subs' });
      await refreshEntitlement();
      const subs = (result ?? []) as ProductSubscription[];
      const hasMonthly = subs.some((s) => s.id === IAP_PRODUCT_IDS.monthly);
      const hasYearly = subs.some((s) => s.id === IAP_PRODUCT_IDS.yearly);
      if (!hasMonthly && !hasYearly) {
        setLastError('store_no_products');
      }
    } catch (e) {
      if (gen !== loadGen.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      setLastError(msg.includes('timeout') ? 'store_fetch_timeout' : msg);
    }
  }, [refreshEntitlement]);

  const retryLoadStore = useCallback(async () => {
    setLastError(null);
    if (!iapRef.current?.connected) {
      await iapRef.current?.reconnect();
    }
    if (iapRef.current?.connected) {
      await loadProducts();
    }
  }, [loadProducts]);

  useEffect(() => {
    if (!connected) return;
    void loadProducts();
  }, [connected, loadProducts]);

  useEffect(() => {
    if (connected) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled || iapRef.current?.connected) return;
      attempts += 1;
      const ok = await iapRef.current?.reconnect();
      if (!ok && attempts >= 4 && !cancelled) {
        setLastError('store_connect_failed');
      }
    };
    void tick();
    const id = setInterval(() => {
      if (iapRef.current?.connected || attempts >= 4) {
        clearInterval(id);
        return;
      }
      void tick();
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [connected, reconnect]);

  const subscribe = useCallback(
    async (plan: 'monthly' | 'yearly') => {
      if (!iapRef.current?.connected) {
        await iapRef.current?.reconnect();
      }
      if (!iapRef.current?.connected) {
        return { ok: false, reason: 'not_connected' };
      }
      const sku = plan === 'monthly' ? IAP_PRODUCT_IDS.monthly : IAP_PRODUCT_IDS.yearly;
      setPurchasing(true);
      setLastError(null);
      try {
        await iapRef.current?.requestPurchase({
          type: 'subs',
          request: {
            apple: { sku },
            google: { skus: [sku] },
          },
        });
        return { ok: true };
      } catch (e) {
        setPurchasing(false);
        if (isUserCancelledError(e)) return { ok: false, reason: 'cancelled' };
        const msg = e instanceof Error ? e.message : String(e);
        setLastError(msg);
        return { ok: false, reason: 'error' };
      }
    },
    [],
  );

  const restore = useCallback(async () => {
    if (!iapRef.current?.connected) {
      await iapRef.current?.reconnect();
    }
    if (!iapRef.current?.connected) return { ok: false, reason: 'not_connected' };
    setPurchasing(true);
    setLastError(null);
    try {
      await iapRef.current?.restorePurchases();
      const active = await iapRef.current?.hasActiveSubscriptions([...IAP_SUBSCRIPTION_SKUS]);
      syncProFromStore(active ?? false);
      setPurchasing(false);
      return { ok: true, reason: active ? undefined : 'none' };
    } catch (e) {
      setPurchasing(false);
      const msg = e instanceof Error ? e.message : String(e);
      setLastError(msg);
      return { ok: false, reason: 'error' };
    }
  }, [syncProFromStore]);

  const value = useMemo(
    (): IapContextValue => ({
      storeReady: connected,
      connected,
      purchasing,
      monthly: findSub(subscriptions, IAP_PRODUCT_IDS.monthly),
      yearly: findSub(subscriptions, IAP_PRODUCT_IDS.yearly),
      subscribe,
      restore,
      retryLoadStore,
      lastError,
    }),
    [connected, subscriptions, purchasing, subscribe, restore, retryLoadStore, lastError],
  );

  return <IapContext.Provider value={value}>{children}</IapContext.Provider>;
}

export function IapProvider({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'ios') {
    return <IapContext.Provider value={noopIap}>{children}</IapContext.Provider>;
  }
  return <IapProviderIOS>{children}</IapProviderIOS>;
}

export function useIap() {
  return useContext(IapContext);
}
