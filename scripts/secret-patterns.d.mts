export interface SecretPattern {
  name: string;
  regex: RegExp;
}
export const secretPatterns: SecretPattern[];
export function findDatabaseUrlSecrets(line: string): boolean;
export function findSecretHits(lines: string[]): string[];
