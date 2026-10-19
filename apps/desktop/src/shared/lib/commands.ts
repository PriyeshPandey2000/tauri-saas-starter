export type CommandAction = {
  id: string;
  labelKey: string;
  groupKey: string;
  perform: () => void;
  keywords?: string[];
};

const registry = new Map<string, CommandAction>();

export function registerCommand(command: CommandAction): void {
  registry.set(command.id, command);
}

export function getCommands(): CommandAction[] {
  return [...registry.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export type CommandGroup = {
  groupKey: string;
  commands: CommandAction[];
};

export function getCommandGroups(): CommandGroup[] {
  const groups = new Map<string, CommandAction[]>();
  for (const command of getCommands()) {
    const existing = groups.get(command.groupKey);
    if (existing) {
      existing.push(command);
    } else {
      groups.set(command.groupKey, [command]);
    }
  }
  return [...groups].map(([groupKey, commands]) => ({ groupKey, commands }));
}
