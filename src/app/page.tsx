import { HomeClient } from '@/components/HomeClient';
import { readGoogleSession } from '@/lib/google-auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function HomePage() {
  let initialAuthenticated = false;

  try {
    const googleSession = await readGoogleSession();
    if (googleSession) {
      initialAuthenticated = true;
    } else if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        initialAuthenticated = Boolean(user);
      }
    }
  } catch {
    initialAuthenticated = false;
  }

  return <HomeClient initialAuthenticated={initialAuthenticated} />;
}
