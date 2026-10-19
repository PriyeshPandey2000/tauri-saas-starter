import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { useTranslation } from "react-i18next";

import { getCommandGroups } from "@/shared/lib/commands";
import { getNavItems } from "@/shared/lib/nav";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  const navItems = getNavItems();
  const commandGroups = getCommandGroups();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]">
      <div
        className="fixed inset-0 bg-black/40"
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />
      <Command
        label={t("commands.paletteLabel")}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
      >
        <Command.Input
          autoFocus
          placeholder={t("commands.placeholder")}
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t("commands.empty")}
          </Command.Empty>
          <Command.Group
            heading={t("commands.groupNavigation")}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {navItems.map((item) => (
              <Command.Item
                key={item.id}
                value={`nav ${item.id}`}
                onSelect={() => {
                  navigate({ to: item.to as never });
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                {item.icon ? <item.icon className="size-4" /> : null}
                {t(item.labelKey)}
              </Command.Item>
            ))}
          </Command.Group>
          {commandGroups.map((group) => (
            <Command.Group
              key={group.groupKey}
              heading={t(group.groupKey)}
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {group.commands.map((command) => (
                <Command.Item
                  key={command.id}
                  value={`command ${command.id} ${command.keywords?.join(" ") ?? ""}`}
                  onSelect={() => {
                    command.perform();
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  {t(command.labelKey)}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
