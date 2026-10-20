import { openUrl } from "@tauri-apps/plugin-opener";

import type { OpenerPort } from "../../OpenerPort";

/** Thin adapter so UI code never imports the opener plugin. */
export const tauriOpener: OpenerPort = {
  open: (url) => openUrl(url),
};
