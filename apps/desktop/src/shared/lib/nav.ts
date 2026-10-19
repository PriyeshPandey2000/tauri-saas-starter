import type { ComponentType } from "react";

import { Home } from "lucide-react";

export type NavIcon = ComponentType<{ className?: string }>;

export type NavItem = {
  id: string;
  labelKey: string;
  to: string;
  icon?: NavIcon;
  order?: number;
};

const registry = new Map<string, NavItem>();

export function registerNavItem(item: NavItem): void {
  registry.set(item.id, item);
}

export function getNavItems(): NavItem[] {
  return [...registry.values()].sort((a, b) => {
    const byOrder = (a.order ?? 0) - (b.order ?? 0);
    return byOrder !== 0 ? byOrder : a.id.localeCompare(b.id);
  });
}

registerNavItem({
  id: "home",
  labelKey: "nav.home",
  to: "/",
  icon: Home,
  order: 10,
});
