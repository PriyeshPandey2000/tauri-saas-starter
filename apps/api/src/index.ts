import { createServer } from "node:http";

import { createApp } from "./app";
import { createAuth } from "./auth/auth";
import { createDb } from "./db/client";
import { loadEnv } from "./env";
import { loggingMailer } from "./ports/MailerPort";

const env = loadEnv();
const { db } = createDb(env);
const auth = createAuth({ db, env, mailer: loggingMailer });
const app = createApp({ auth, env });

const server = createServer(async (req, res) => {
  const port = env.PORT;
  const url = `http://localhost:${port}${req.url || ""}`;
  const method = req.method || "GET";
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }
  }
  let body: Buffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    body = Buffer.concat(chunks);
  }
  const fetchReq = new Request(url, {
    method,
    headers,
    body: body ? new Uint8Array(body) : undefined,
  });
  const resp = await app.fetch(fetchReq);
  res.writeHead(resp.status, Object.fromEntries(resp.headers.entries()));
  const buf = Buffer.from(await resp.arrayBuffer());
  res.end(buf);
});

server.listen(env.PORT, () => {
  console.log(`api listening on :${env.PORT}`);
});
