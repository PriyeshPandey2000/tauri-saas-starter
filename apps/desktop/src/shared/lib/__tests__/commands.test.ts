import { describe, expect, it } from "vitest";

import { getCommands, getCommandGroups, registerCommand } from "../commands";

registerCommand({
  id: "beta",
  labelKey: "commands.toggleTheme",
  groupKey: "group.theme",
  perform: () => undefined,
});
registerCommand({
  id: "alpha",
  labelKey: "commands.toggleTheme",
  groupKey: "group.theme",
  perform: () => undefined,
});
registerCommand({
  id: "gamma",
  labelKey: "commands.toggleTheme",
  groupKey: "group.other",
  perform: () => undefined,
});

describe("getCommands", () => {
  it("orders commands by id", () => {
    const ids = getCommands().map((command) => command.id);
    expect(ids).toEqual(["alpha", "beta", "gamma"]);
  });
});

describe("getCommandGroups", () => {
  it("groups commands by group key", () => {
    const groups = getCommandGroups();
    const theme = groups.find((group) => group.groupKey === "group.theme");

    expect(theme?.commands.map((command) => command.id)).toEqual([
      "alpha",
      "beta",
    ]);
  });

  it("keeps each command in its own group", () => {
    for (const group of getCommandGroups()) {
      for (const command of group.commands) {
        expect(command.groupKey).toBe(group.groupKey);
      }
    }
  });
});
