export function getSupabaseConfig(): {
  url: string;
  anonKey: string;
  configured: boolean;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  const configured =
    url.startsWith('https://') && anonKey.length > 20;

  return { url, anonKey, configured };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().configured;
}
