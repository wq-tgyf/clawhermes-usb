export function expandCommandTemplate(
  command: string,
  env: Record<string, string | undefined>,
): string {
  return command
    .replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match: string, name: string) => env[name] ?? match)
    .replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, (match: string, name: string) => env[name] ?? match);
}
