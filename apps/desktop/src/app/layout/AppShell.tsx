import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, Moon, PanelLeftClose, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSettingsStore } from "@/features/settings";
import { getNavItems } from "@/shared/lib/nav";
import { Button } from "@/shared/ui/button";
import { CommandPalette } from "@/shared/ui/command-palette";
import { cn } from "@/shared/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const collapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((state) => state.toggleSidebar);
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const items = getNavItems();

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved =
    theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  const toggleTheme = () => setTheme(resolved === "dark" ? "light" : "dark");

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-border transition-[width] duration-200",
          collapsed ? "w-14" : "w-60",
        )}
      >
        <nav className="flex flex-col gap-1 p-3">
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.to as never}
              activeOptions={{ exact: item.to === "/" }}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeProps={{
                className: "bg-accent text-accent-foreground font-medium",
              }}
            >
              {item.icon ? <item.icon className="size-4 shrink-0" /> : null}
              {collapsed ? null : <span>{t(item.labelKey)}</span>}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label={t("nav.toggleSidebar")}
          >
            {collapsed ? (
              <Menu className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
          <span className="font-medium">{t("app.name")}</span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={t("commands.toggleTheme")}
            >
              {resolved === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
