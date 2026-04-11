import { MetadataRoute } from 'next'

// Required for static export
export const dynamic = "force-static"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://aegix-sle.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
        ],
        disallow: [
          '/api/',
          '/_next/',
          '/login',
          '/admin/*',
          '/employee/*',
          '/student/*',
          '/parent/*',
          '/canteen/*',
          '/canteen-owner/*',
          '/super-admin/*',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: ['/api/', '/_next/', '/login', '/*?*'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
