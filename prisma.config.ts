import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Just use the environment variables directly without mangling them.
    // We will ensure the terminal command or .env has the correct params.
    url: process.env["DATABASE_URL"] || process.env["DATABASE_URL_POOLER"],
  },
});
