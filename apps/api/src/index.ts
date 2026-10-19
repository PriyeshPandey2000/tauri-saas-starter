import { createServer } from "node:http";
import app from "./app.js";

const port = process.env.PORT ? Number(process.env.PORT) : 8787;

createServer(app.fetch).listen(port, () => {
  console.log(`api listening on :${port}`);
});
