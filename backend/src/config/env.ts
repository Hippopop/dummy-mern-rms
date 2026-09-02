import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(5050),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  COOKIE_DOMAIN: z.string().default('localhost'),
  CLIENT_ORIGIN: z.string().default('http://localhost:3000'),
  SEED_ADMIN_NAME: z.string().default('System Admin'),
  SEED_ADMIN_EMAIL: z.string().default('admin@restaurant.local'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Password123!'),
  SEED_DEFAULT_PASSWORD: z.string().min(8).default('Password123!'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`\nInvalid environment configuration:\n${issues}\n\nCopy .env.example to .env and fill it in.\n`);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
