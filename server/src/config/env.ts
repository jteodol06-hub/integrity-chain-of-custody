import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load root .env or server-level .env
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config(); // fallback to local directory

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('5000'),
  API_PREFIX: z.string().default('/api'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/iccf_db?schema=public'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security')
    .default('iccf_development_secure_jwt_secret_key_minimum_32_chars'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  EVIDENCE_STORAGE_PATH: z.string().default('./storage/evidence'),
  MAX_FILE_SIZE_BYTES: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('52428800'),
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('200'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
