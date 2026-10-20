/**
 * Every user-data key is scoped by the signed-in user id, so signing in as
 * another user can never hit the previous user's cache entry.
 */
export const noteKeys = {
  root: ["notes"] as const,
  all: (userId: string) => [...noteKeys.root, userId] as const,
  list: (userId: string) => [...noteKeys.all(userId), "list"] as const,
  detail: (userId: string, id: string) =>
    [...noteKeys.all(userId), "detail", id] as const,
};
