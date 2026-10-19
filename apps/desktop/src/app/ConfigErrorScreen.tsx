import type { ConfigError } from "@/shared/lib/config";

interface ConfigErrorScreenProps {
  issues: ConfigError["issues"];
}

export function ConfigErrorScreen({ issues }: ConfigErrorScreenProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-8 text-foreground">
      <section className="w-full max-w-xl rounded-lg border border-destructive/40 bg-card p-6">
        <h1 className="text-xl font-semibold text-destructive">
          Invalid configuration
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The app could not start because these environment values are missing
          or invalid. Check your <code>.env</code> against{" "}
          <code>.env.example</code>.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 font-mono text-sm">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
