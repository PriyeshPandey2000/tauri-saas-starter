import { render, screen } from "@testing-library/react";
import { DEFAULT_FLAGS } from "@app/shared";
import { describe, expect, it } from "vitest";

import { PortsProvider, createPorts, usePorts } from "../index";

function Probe() {
  const ports = usePorts();
  return <span>{ports.logger ? "ports-ready" : "no-ports"}</span>;
}

describe("ports composition root", () => {
  it("exposes the ports through the React context", () => {
    render(
      <PortsProvider ports={createPorts()}>
        <Probe />
      </PortsProvider>,
    );
    expect(screen.getByText("ports-ready")).toBeTruthy();
  });

  it("wires no-op adapters with safe defaults", async () => {
    const ports = createPorts();
    await expect(ports.auth.getSession()).resolves.toBeNull();
    expect(ports.featureFlags.get("newDashboard")).toBe(false);
    expect(ports.featureFlags.getAll()).toEqual(DEFAULT_FLAGS);
    await expect(ports.billing.getEntitlements()).resolves.toEqual({
      planId: null,
      features: [],
      active: false,
    });
  });

  it("keeps in-memory storage values until removed", async () => {
    const ports = createPorts();
    await ports.storage.set("k", { value: 1 });
    await expect(ports.storage.get("k")).resolves.toEqual({ value: 1 });
    await ports.storage.remove("k");
    await expect(ports.storage.get("k")).resolves.toBeNull();
  });
});
