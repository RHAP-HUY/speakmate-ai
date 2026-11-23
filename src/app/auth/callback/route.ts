import { NextResponse, type NextRequest } from 'next/server';
import { sanitizeInternalRedirectPath } from '@/lib/security';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = sanitizeInternalRedirectPath(
    requestUrl.searchParams.get('next'),
    '/'
  );

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .maybeSingle();

          if (!profile || !profile.onboarding_completed) {
            return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
          }
        }
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }
    }
  }

  return NextResponse.redirect(
    new URL('/auth?error=auth_callback_failed', requestUrl.origin)
  );
}
