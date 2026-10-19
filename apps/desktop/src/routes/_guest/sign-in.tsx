import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import {
  AuthCard,
  FieldError,
  inputClassName,
  useAuthStore,
} from "@/features/auth";
import { Button } from "@/shared/ui/button";
import { SignInInputSchema, type SignInInput } from "@app/shared";

export const Route = createFileRoute("/_guest/sign-in")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: SignInPage,
});

function SignInPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const signIn = useAuthStore((state) => state.signIn);
  const signInWithOAuth = useAuthStore((state) => state.signInWithOAuth);

  const form = useForm<SignInInput>({
    resolver: zodResolver(SignInInputSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await signIn(values);
      await navigate({ to: (search.redirect ?? "/") as never });
    } catch {
      // The store exposes the error.
    }
  });

  return (
    <AuthCard
      title={t("auth.signIn.title")}
      description={t("auth.signIn.description")}
    >
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
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm font-medium">
            {t("auth.password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={inputClassName}
            {...form.register("password")}
          />
          <FieldError message={form.formState.errors.password?.message} />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? t("auth.working") : t("auth.signIn.submit")}
        </Button>
      </form>
      <Button
        type="button"
        variant="outline"
        onClick={() => void signInWithOAuth().catch(() => undefined)}
      >
        {t("auth.signIn.google")}
      </Button>
      <div className="flex justify-between text-sm text-muted-foreground">
        <Link to="/sign-up" className="underline">
          {t("auth.signIn.createAccount")}
        </Link>
        <Link to="/forgot-password" className="underline">
          {t("auth.signIn.forgot")}
        </Link>
      </div>
    </AuthCard>
  );
}
