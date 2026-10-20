import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Entitlement } from "@app/shared";

import "@/shared/i18n";

import { useEntitlementStore } from "../entitlement-store";
import { Gate } from "../components/gate";

function entitlement(features: string[]): Entitlement {
  return {
    v: 1,
    kid: "k1",
    userId: "user-a",
    plan: "pro",
    status: "active",
    currentPeriodEnd: null,
    features,
    issuedAt: new Date().toISOString(),
    validUntil: new Date(Date.now() + 86_400_000).toISOString(),
    signature: "sig",
  };
}

describe("Gate", () => {
  beforeEach(() => {
    useEntitlementStore.setState({
      userId: "user-a",
      entitlement: entitlement([]),
      loading: false,
      error: null,
      offline: false,
    });
  });

  it("shows the fallback for a free user", () => {
    render(
      <Gate feature="export" fallback={<p>upgrade</p>}>
        <p>paid feature</p>
      </Gate>,
    );
    expect(screen.getByText("upgrade")).toBeTruthy();
    expect(screen.queryByText("paid feature")).toBeNull();
  });

  it("renders children when the feature is present", () => {
    useEntitlementStore.setState({ entitlement: entitlement(["export"]) });
    render(
      <Gate feature="export">
        <p>paid feature</p>
      </Gate>,
    );
    expect(screen.getByText("paid feature")).toBeTruthy();
  });
});
