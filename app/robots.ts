import { MetadataRoute } from 'next'

// Required for static export
export const dynamic = "force-static"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://aegix-sle.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/canteen', '/AegixLogo.png', '/icon-192x192.png', '/icon-512x512.png'],
        disallow: [
          '/api/',
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
        allow: ['/', '/canteen', '/AegixLogo.png', '/icon-192x192.png', '/icon-512x512.png'],
        disallow: ['/api/', '/login', '/register', '/*?*'],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: ['/', '/canteen', '/*.png', '/*.jpg', '/*.jpeg', '/*.webp', '/*.svg'],
        disallow: ['/api/', '/login', '/register'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
