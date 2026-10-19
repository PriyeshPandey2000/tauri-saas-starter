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
