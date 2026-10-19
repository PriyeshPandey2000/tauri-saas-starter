import { createServer } from "node:http";
import app from "./app.js";

const port = process.env.PORT ? Number(process.env.PORT) : 8787;

const server = createServer(async (req, res) => {
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
  let body: any;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    body = Buffer.concat(chunks);
  }
  const fetchReq = new Request(url, { method, headers, body: body ? new Uint8Array(body) : undefined });
  const resp = await app.fetch(fetchReq);
  res.writeHead(resp.status, Object.fromEntries(resp.headers.entries()));
  const buf = Buffer.from(await resp.arrayBuffer());
  res.end(buf);
});

server.listen(port, () => {
  console.log(`api listening on :${port}`);
});
