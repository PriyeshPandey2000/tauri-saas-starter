import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  AuthCard,
  FieldError,
  inputClassName,
  useAuthStore,
} from "@/features/auth";
import { Button } from "@/shared/ui/button";
import { SignUpInputSchema, type SignUpInput } from "@app/shared";

export const Route = createFileRoute("/_guest/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const signUp = useAuthStore((state) => state.signUp);
  const [verificationRequired, setVerificationRequired] = useState(false);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(SignUpInputSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      const outcome = await signUp(values);
      if (outcome === "authenticated") {
        await navigate({ to: "/" });
      } else {
        setVerificationRequired(true);
      }
    } catch {
      // The store exposes the error.
    }
  });

  return (
    <AuthCard
      title={t("auth.signUp.title")}
      description={t("auth.signUp.description")}
    >
      {verificationRequired ? (
        <p className="text-sm">{t("auth.signUp.verificationSent")}</p>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-medium">
              {t("auth.name")}
            </label>
            <input
              id="name"
              autoComplete="name"
              className={inputClassName}
              {...form.register("name")}
            />
            <FieldError message={form.formState.errors.name?.message} />
          </div>
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
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">
              {t("auth.password")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className={inputClassName}
              {...form.register("password")}
            />
            <FieldError message={form.formState.errors.password?.message} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? t("auth.working") : t("auth.signUp.submit")}
          </Button>
        </form>
      )}
      <Link
        to="/sign-in"
        search={{ redirect: undefined }}
        className="text-sm text-muted-foreground underline"
      >
        {t("auth.signUp.haveAccount")}
      </Link>
    </AuthCard>
  );
}
