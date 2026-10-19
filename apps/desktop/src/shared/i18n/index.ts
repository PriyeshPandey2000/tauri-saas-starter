import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";

export const defaultNS = "common";
export const resources = {
  en: { common: enCommon },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  defaultNS,
  ns: ["common"],
  interpolation: { escapeValue: false },
});

export default i18n;
