import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  MONGODB_URI: z
    .string()
    .default(
      'mongodb+srv://aryanvalvi323_db_user:6ZgXXJtHH5Ujprj7@cluster0.zlzgpvy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
    .min(1, 'MONGODB_URI cannot be empty')
    .or(
      z.undefined().transform(() => {
        if (process.env.NODE_ENV === 'test') {
          return 'mongodb://localhost:27017/the-space-story-test';
        }
        throw new Error('❌ MONGODB_URI is required. Please set it in your .env file or environment variables.');
      })
    ),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters')
    .default('super_secret_jwt_key_the_space_story_2026_studio_key_production'),
    .or(
      z.undefined().transform(() => {
        if (process.env.NODE_ENV === 'test') {
          return 'test_jwt_secret_key_at_least_32_chars_long_12345';
        }
        throw new Error('❌ JWT_SECRET is required. Please set it in your .env file or environment variables.');
      })
    ),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173'),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    for (const issue of error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  throw error;
}

export { env };
