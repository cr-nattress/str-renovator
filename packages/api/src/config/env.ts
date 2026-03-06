import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isDev: (process.env.NODE_ENV ?? "development") === "development",

  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),

  openaiApiKey: required("OPENAI_API_KEY"),

  clerkSecretKey: required("CLERK_SECRET_KEY"),
  clerkWebhookSecret: required("CLERK_WEBHOOK_SECRET"),

  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",

  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
} as const;
