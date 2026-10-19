import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "@app/shared";

import "@/shared/i18n";

import { SettingsPage } from "../components/settings-page";
import { useSettingsStore } from "../settings-store";

afterEach(() => {
  useSettingsStore.setState({ ...DEFAULT_SETTINGS });
});

describe("SettingsPage", () => {
  it("keeps the theme when another field changes", () => {
    render(<SettingsPage />);

    act(() => {
      useSettingsStore.getState().setTheme("dark");
    });

    fireEvent.click(screen.getByRole("checkbox"));

    expect(useSettingsStore.getState().theme).toBe("dark");
    expect(useSettingsStore.getState().sidebarCollapsed).toBe(
      !DEFAULT_SETTINGS.sidebarCollapsed,
    );
  });
});
