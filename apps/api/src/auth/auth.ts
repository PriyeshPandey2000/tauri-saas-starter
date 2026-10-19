import { and, eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { bearer, jwt, oneTimeToken } from "better-auth/plugins";

import type { Database } from "../db/client";
import * as schema from "../db/schema";
import type { ApiEnv } from "../env";
import type { MailerPort } from "../ports/MailerPort";

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
export const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
export const ONE_DAY_SECONDS = 24 * 60 * 60;

/** Absolute cap: rolling expiry can never pass creation + 30 days. */
export function clampSessionExpiry(createdAt: Date, expiresAt: Date): Date {
  const cap = new Date(createdAt.getTime() + THIRTY_DAYS_MS);
  return expiresAt.getTime() > cap.getTime() ? cap : expiresAt;
}

export interface LinkCheckInput {
  providerId: string;
  emailVerified: boolean;
  hasCredentialAccount: boolean;
}

/**
 * Implicit OAuth linking is allowed only when the existing local user has a
 * verified email. New OAuth-only users (no credential account) are unaffected.
 */
export function shouldBlockImplicitLink(input: LinkCheckInput): boolean {
  return (
    input.providerId !== "credential" &&
    !input.emailVerified &&
    input.hasCredentialAccount
  );
}

export interface AuthDeps {
  db: Database;
  env: ApiEnv;
  mailer: MailerPort;
}

export function createAuth({ db, env, mailer }: AuthDeps) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
      async sendResetPassword({ user, url }) {
        await mailer.send({
          to: user.email,
          subject: "Reset your password",
          text: `Reset your password: ${url}`,
          url,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      async sendVerificationEmail({ user, url }) {
        await mailer.send({
          to: user.email,
          subject: "Verify your email",
          text: `Verify your email: ${url}`,
          url,
        });
      },
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        allowDifferentEmails: false,
      },
    },
    session: {
      expiresIn: SEVEN_DAYS_SECONDS,
      updateAge: ONE_DAY_SECONDS,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/*": { window: 60, max: 10 },
        "/sign-up/*": { window: 60, max: 5 },
        "/one-time-token/*": { window: 60, max: 20 },
      },
    },
    plugins: [
      bearer(),
      jwt({
        jwt: {
          issuer: env.BETTER_AUTH_URL,
          audience: env.BETTER_AUTH_URL,
          expirationTime: "15m",
        },
      }),
      oneTimeToken({ expiresIn: 3 }),
    ],
    databaseHooks: {
      session: {
        create: {
          async before(session) {
            return {
              data: {
                ...session,
                expiresAt: clampSessionExpiry(
                  new Date(session.createdAt),
                  new Date(session.expiresAt),
                ),
              },
            };
          },
        },
        update: {
          async before(session) {
            const token = (session as { token?: string }).token;
            const nextExpiry = (session as { expiresAt?: Date }).expiresAt;
            if (!token || !nextExpiry) {
              return;
            }
            const [existing] = await db
              .select({ createdAt: schema.session.createdAt })
              .from(schema.session)
              .where(eq(schema.session.token, token))
              .limit(1);
            if (!existing) {
              return;
            }
            return {
              data: {
                ...session,
                expiresAt: clampSessionExpiry(
                  new Date(existing.createdAt),
                  new Date(nextExpiry),
                ),
              },
            };
          },
        },
      },
      account: {
        create: {
          async before(account) {
            if (account.providerId === "credential") {
              return;
            }
            const [target] = await db
              .select({ emailVerified: schema.user.emailVerified })
              .from(schema.user)
              .where(eq(schema.user.id, account.userId))
              .limit(1);
            if (!target || target.emailVerified) {
              return;
            }
            const [credential] = await db
              .select({ id: schema.account.id })
              .from(schema.account)
              .where(
                and(
                  eq(schema.account.userId, account.userId),
                  eq(schema.account.providerId, "credential"),
                ),
              )
              .limit(1);
            if (
              shouldBlockImplicitLink({
                providerId: account.providerId,
                emailVerified: target.emailVerified,
                hasCredentialAccount: Boolean(credential),
              })
            ) {
              throw new APIError("FORBIDDEN", {
                message:
                  "Verify your email before linking a Google account to this user",
              });
            }
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
