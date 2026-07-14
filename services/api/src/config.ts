import 'dotenv/config';
import { z } from 'zod';
export const config = z.object({
  NODE_ENV: z.string().default('development'), PORT: z.coerce.number().default(8080),
  SUPABASE_URL: z.string().url(), SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(16), REDIS_URL: z.string().default('redis://localhost:6379'),
  FIREBASE_PROJECT_ID: z.string().default('sawn-dev')
}).parse(process.env);
