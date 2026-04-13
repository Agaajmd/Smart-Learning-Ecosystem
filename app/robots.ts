import { MetadataRoute } from 'next'

// Required for static export
export const dynamic = "force-static"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://aegix-sle.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/canteen'],
        disallow: [
          '/api/',
          '/_next/',
          '/login',
          '/register',
          '/admin/*',
          '/employee/*',
          '/student/*',
          '/parent/*',
          '/canteen/*',
          '/canteen-owner/*',
          '/super-admin/*',
          '/*?*',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/', '/canteen'],
        disallow: ['/api/', '/_next/', '/login', '/register', '/*?*'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
