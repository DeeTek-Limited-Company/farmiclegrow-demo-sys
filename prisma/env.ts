import dotenv from "dotenv";
import path from "path";

// Load .env.local before prisma client initialization
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
