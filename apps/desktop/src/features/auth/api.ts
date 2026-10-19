import { getConfig } from "@/shared/lib/config";

/** Ask the API to send a reset email. The dev mailer logs the link. */
export async function requestPasswordReset(email: string): Promise<void> {
  const response = await fetch(
    `${getConfig().VITE_API_URL}/api/auth/request-password-reset`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    },
  );
  if (!response.ok) {
    throw new Error("Could not request a password reset");
  }
}
