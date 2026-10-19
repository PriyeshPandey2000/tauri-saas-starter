import { defineConfig } from "drizzle-kit";

const directUrl = process.env.DATABASE_URL_DIRECT;

if (!directUrl) {
  throw new Error(
    "DATABASE_URL_DIRECT is required for drizzle-kit migrations (unpooled URL)",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: directUrl },
});
