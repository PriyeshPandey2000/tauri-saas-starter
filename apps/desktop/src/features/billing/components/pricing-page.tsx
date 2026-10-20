import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BillingPlan, PlanSummary } from "@app/shared";

import { ports } from "@/ports";
import { getConfig } from "@/shared/lib/config";
import { useEntitlementStore } from "../entitlement-store";

export function PricingPage() {
  const { t } = useTranslation();
  const entitlement = useEntitlementStore((state) => state.entitlement);
  const offline = useEntitlementStore((state) => state.offline);
  const startPolling = useEntitlementStore((state) => state.startPolling);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const missingKeys =
    import.meta.env.VITE_APP_ENV !== "prod" &&
    !getConfig().VITE_ENTITLEMENT_PUBLIC_KEYS;

  useEffect(() => {
    let cancelled = false;
    void ports.billing
      .getPlans()
      .then((value) => {
        if (!cancelled) {
          setPlans(value);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function upgrade(planKey: BillingPlan) {
    setBusy(planKey);
    setError(null);
    try {
      await ports.billing.startCheckout(planKey);
      void ports.analytics.track("checkout_started", { plan: planKey });
      startPolling();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  }

  async function manage() {
    setBusy("portal");
    setError(null);
    try {
      await ports.billing.openPortal();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("billing.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("billing.description")}
        </p>
      </header>

      {offline && (
        <p className="text-xs text-muted-foreground">{t("billing.offline")}</p>
      )}
      {missingKeys && (
        <p className="text-xs text-amber-600">
          {t("billing.entitlementKeysMissing")}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md border border-input p-4">
        <p className="text-sm font-medium">{t("billing.currentPlan")}</p>
        <p className="text-sm text-muted-foreground">
          {t(`billing.status.${entitlement?.status ?? "none"}`)}
          {entitlement?.plan ? ` — ${entitlement.plan}` : ""}
        </p>
        {entitlement?.plan === "pro" && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void manage()}
            className="mt-2 h-8 rounded-md border border-input px-3 text-xs"
          >
            {t("billing.manage")}
          </button>
        )}
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <li
            key={plan.key}
            className="flex flex-col gap-2 rounded-md border border-input p-4"
          >
            <p className="text-lg font-semibold">{plan.name}</p>
            <p className="text-xs text-muted-foreground">
              {plan.features.length > 0
                ? plan.features.join(", ")
                : t("billing.freeFeatures")}
            </p>
            {plan.key !== "free" && (
              <button
                type="button"
                disabled={busy !== null || entitlement?.plan === plan.key}
                onClick={() => void upgrade(plan.key)}
                className="mt-auto h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {entitlement?.plan === plan.key
                  ? t("billing.current")
                  : t("billing.upgrade")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
