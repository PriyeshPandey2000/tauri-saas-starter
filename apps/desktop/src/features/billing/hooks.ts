import { useEntitlementStore } from "./entitlement-store";

export function useEntitlement() {
  return useEntitlementStore((state) => state.entitlement);
}

export function useCan(feature: string): boolean {
  return useEntitlementStore(
    (state) => state.entitlement?.features.includes(feature) ?? false,
  );
}
