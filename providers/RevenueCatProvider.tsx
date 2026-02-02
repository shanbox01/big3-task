import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';

const ENTITLEMENT_ID = 'big3_pro';
const OFFERING_ID = 'big3_pro_offering';

function getRCApiKey() {
  if (__DEV__ || Platform.OS === 'web') {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
  }
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  });
}

let isConfigured = false;

function configureRevenueCat() {
  if (isConfigured) return;
  
  const apiKey = getRCApiKey();
  if (!apiKey) {
    console.warn('[RevenueCat] No API key found');
    return;
  }
  
  try {
    Purchases.configure({ apiKey });
    isConfigured = true;
    console.log('[RevenueCat] Configured successfully with key:', apiKey.substring(0, 10) + '...');
  } catch (error) {
    console.error('[RevenueCat] Configuration error:', error);
  }
}

configureRevenueCat();

export const [RevenueCatProvider, useRevenueCat] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isConfigured) {
      configureRevenueCat();
    }
    setIsInitialized(true);
    console.log('[RevenueCat] Provider initialized');
  }, []);

  const customerInfoQuery = useQuery({
    queryKey: ['revenuecat', 'customerInfo'],
    queryFn: async (): Promise<CustomerInfo | null> => {
      try {
        const info = await Purchases.getCustomerInfo();
        console.log('[RevenueCat] Customer info fetched, entitlements:', Object.keys(info.entitlements.active));
        return info;
      } catch (error) {
        console.error('[RevenueCat] Error fetching customer info:', error);
        return null;
      }
    },
    enabled: isInitialized,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  const offeringsQuery = useQuery({
    queryKey: ['revenuecat', 'offerings'],
    queryFn: async () => {
      try {
        const offerings = await Purchases.getOfferings();
        console.log('[RevenueCat] All offerings:', Object.keys(offerings.all));
        
        const targetOffering = offerings.all[OFFERING_ID] || offerings.current;
        if (targetOffering) {
          console.log('[RevenueCat] Using offering:', targetOffering.identifier);
          console.log('[RevenueCat] Available packages:', targetOffering.availablePackages.map(p => p.identifier));
        } else {
          console.warn('[RevenueCat] No offering found');
        }
        
        return targetOffering;
      } catch (error) {
        console.error('[RevenueCat] Error fetching offerings:', error);
        return null;
      }
    },
    enabled: isInitialized,
    staleTime: 1000 * 60 * 30,
  });

  const isPro = (() => {
    const customerInfo = customerInfoQuery.data;
    if (!customerInfo) return false;
    const hasEntitlement = typeof customerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== 'undefined';
    return hasEntitlement;
  })();

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      console.log('[RevenueCat] Purchasing package:', pkg.identifier, pkg.product.identifier);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: (customerInfo) => {
      console.log('[RevenueCat] Purchase successful, new entitlements:', Object.keys(customerInfo.entitlements.active));
      queryClient.setQueryData(['revenuecat', 'customerInfo'], customerInfo);
    },
    onError: (error: any) => {
      if (error.userCancelled) {
        console.log('[RevenueCat] Purchase cancelled by user');
      } else {
        console.error('[RevenueCat] Purchase error:', error);
      }
      throw error;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      console.log('[RevenueCat] Restoring purchases...');
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo;
    },
    onSuccess: (customerInfo) => {
      console.log('[RevenueCat] Restore successful, entitlements:', Object.keys(customerInfo.entitlements.active));
      queryClient.setQueryData(['revenuecat', 'customerInfo'], customerInfo);
    },
    onError: (error) => {
      console.error('[RevenueCat] Restore error:', error);
      throw error;
    },
  });

  const { mutateAsync: purchaseAsync } = purchaseMutation;
  const { mutateAsync: restoreAsync } = restoreMutation;

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    return purchaseAsync(pkg);
  }, [purchaseAsync]);

  const restorePurchases = useCallback(async () => {
    return restoreAsync();
  }, [restoreAsync]);

  const refreshCustomerInfo = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['revenuecat', 'customerInfo'] });
  }, [queryClient]);

  return {
    isInitialized,
    customerInfo: customerInfoQuery.data,
    offering: offeringsQuery.data,
    packages: offeringsQuery.data?.availablePackages || [],
    isPro,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    purchaseError: purchaseMutation.error,
    purchasePackage,
    restorePurchases,
    refreshCustomerInfo,
    entitlementId: ENTITLEMENT_ID,
  };
});
