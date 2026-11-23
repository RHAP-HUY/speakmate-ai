import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/auth', '/play', '/leaderboard'],
        disallow: ['/api/', '/auth/callback', '/onboarding', '/settings'],
      },
    ],
    sitemap: 'https://speakmate-ai-nu.vercel.app/sitemap.xml',
  };
}
