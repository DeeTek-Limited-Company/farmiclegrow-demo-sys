import { config } from "dotenv";
import fs from "fs";
import { defineConfig } from "prisma/config";

config({ path: ".env" });
if (fs.existsSync(".env.local")) {
  config({ path: ".env.local", override: true });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Just use the environment variables directly without mangling them.
    // We will ensure the terminal command or .env has the correct params.
    url:
      process.env["DATABASE_URL_MIGRATE"] ||
      process.env["DATABASE_URL"] ||
      process.env["DATABASE_URL_POOLER"] ||
      process.env["DATABASE_URL_DIRECT"],
  },
});
