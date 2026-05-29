declare const Netlify: {
  env: { get(key: string): string | undefined };
};

export function getEnv(key: string): string | undefined {
  try {
    const value = Netlify.env.get(key);
    if (value !== undefined) return value;
  } catch {
    // Netlify global not available in local dev
  }
  return process.env[key];
}
