import { serve } from "@hono/node-server";

import { createApp } from "./app";
import { createAuth } from "./auth/auth";
import { createDb } from "./db/client";
import { loadEnv } from "./env";
import { loggingMailer } from "./ports/MailerPort";

const env = loadEnv();
const { db } = createDb(env);
const auth = createAuth({ db, env, mailer: loggingMailer });
const app = createApp({ auth, env, db });

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`api listening on :${info.port}`);
});
