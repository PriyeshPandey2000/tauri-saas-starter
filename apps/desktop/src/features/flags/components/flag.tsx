import type { ReactNode } from "react";

import type { BooleanFlagKey, FlagValue, VariantFlagKey } from "@app/shared";

import { useFlag } from "../hooks";

interface FlagProps {
  name: BooleanFlagKey;
  fallback?: ReactNode;
  children: ReactNode;
}

/** Render children only when a boolean flag is on. */
export function Flag({ name, fallback = null, children }: FlagProps) {
  return <>{useFlag(name) ? children : fallback}</>;
}

interface FlagVariantProps<K extends VariantFlagKey> {
  name: K;
  cases: Partial<Record<FlagValue<K>, ReactNode>>;
  fallback?: ReactNode;
}

/** Render the branch for the current variant. */
export function FlagVariant<K extends VariantFlagKey>({
  name,
  cases,
  fallback = null,
}: FlagVariantProps<K>) {
  const value = useFlag(name);
  return <>{cases[value] ?? fallback}</>;
}
