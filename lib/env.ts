export function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const env = {
  appUrl: getEnv("NEXT_PUBLIC_APP_URL"),
  githubClientId: getEnv("GITHUB_CLIENT_ID"),
  githubClientSecret: getEnv("GITHUB_CLIENT_SECRET"),
  supabaseUrl: getEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  sessionCookieName: getEnv("SESSION_COOKIE_NAME"),
  tokenEncryptionKey: getEnv("TOKEN_ENCRYPTION_KEY"),
};
