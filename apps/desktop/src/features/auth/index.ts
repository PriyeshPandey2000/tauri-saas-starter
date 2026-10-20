import { User as UserIcon } from "lucide-react";

import { registerNavItem } from "@/shared/lib/nav";

export { initializeAuth, useAuthStore } from "./store";
export type { AuthStatus, SignUpOutcome } from "./store";
export { AuthCard, FieldError, inputClassName } from "./components/auth-card";
export { requestPasswordReset } from "./api";
export { onSignOut, runSignOutHandlers } from "./sign-out-registry";
export { authedRedirect, guestRedirect } from "./guards";

registerNavItem({
  id: "account",
  labelKey: "nav.account",
  to: "/account",
  icon: UserIcon,
  order: 30,
});
