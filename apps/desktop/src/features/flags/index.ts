import { Flag as FlagIcon } from "lucide-react";

import { registerNavItem } from "@/shared/lib/nav";

export { useFlag, useFlagSource } from "./hooks";
export { Flag, FlagVariant } from "./components/flag";
export { FlagsPage } from "./components/flags-page";
export { BetaExportPage } from "./components/beta-export-page";

if (import.meta.env.VITE_APP_ENV !== "prod") {
  registerNavItem({
    id: "flags",
    labelKey: "nav.flags",
    to: "/settings/flags",
    icon: FlagIcon,
    order: 25,
  });
}
