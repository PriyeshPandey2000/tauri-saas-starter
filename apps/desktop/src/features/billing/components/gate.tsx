import type { ReactNode } from "react";

import { useCan } from "../hooks";
import { UpgradePrompt } from "./upgrade-prompt";

interface GateProps {
  feature: string;
  fallback?: ReactNode;
  children: ReactNode;
}

/** UX gate only. The server enforces the same feature on paid routes. */
export function Gate({ feature, fallback, children }: GateProps) {
  return (
    <>
      {useCan(feature)
        ? children
        : (fallback ?? <UpgradePrompt feature={feature} />)}
    </>
  );
}
