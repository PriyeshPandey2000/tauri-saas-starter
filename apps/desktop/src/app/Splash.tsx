export function Splash() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="hidden w-60 shrink-0 border-r border-border p-4 md:block">
        <div className="mb-6 h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="flex flex-col gap-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex h-14 items-center border-b border-border px-4">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
