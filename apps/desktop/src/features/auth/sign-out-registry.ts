export type SignOutHandler = () => Promise<void> | void;

const handlers = new Set<SignOutHandler>();

/** Features register cleanup that must run on sign-out or account deletion. */
export function onSignOut(handler: SignOutHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export async function runSignOutHandlers(): Promise<void> {
  for (const handler of handlers) {
    try {
      await handler();
    } catch {
      // One failing cleanup must not block the rest.
    }
  }
}
