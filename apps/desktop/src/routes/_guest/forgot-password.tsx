import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import {
  AuthCard,
  FieldError,
  inputClassName,
  requestPasswordReset,
} from "@/features/auth";
import { Button } from "@/shared/ui/button";

const ForgotSchema = z.object({ email: z.string().email() });
type ForgotInput = z.infer<typeof ForgotSchema>;

export const Route = createFileRoute("/_guest/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<ForgotInput>({
    resolver: zodResolver(ForgotSchema),
    defaultValues: { email: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setError(null);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthCard
      title={t("auth.forgot.title")}
      description={t("auth.forgot.description")}
    >
      {sent ? (
        <p className="text-sm">{t("auth.forgot.sent")}</p>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium">
              {t("auth.email")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={inputClassName}
              {...form.register("email")}
            />
            <FieldError message={form.formState.errors.email?.message} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? t("auth.working") : t("auth.forgot.submit")}
          </Button>
        </form>
      )}
      <Link
        to="/sign-in"
        search={{ redirect: undefined }}
        className="text-sm text-muted-foreground underline"
      >
        {t("auth.backToSignIn")}
      </Link>
    </AuthCard>
  );
}
