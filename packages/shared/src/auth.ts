import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  image: z.string().url().nullable().optional(),
  emailVerified: z.boolean(),
});

export const SessionSchema = z.object({
  user: UserSchema,
  /** ISO-8601 expiry of the current session. */
  expiresAt: z.string().min(1),
});

export const SignInInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const SignUpInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(10).max(128),
});

export type User = z.infer<typeof UserSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type SignInInput = z.infer<typeof SignInInputSchema>;
export type SignUpInput = z.infer<typeof SignUpInputSchema>;
