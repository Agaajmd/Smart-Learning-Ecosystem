import { MetadataRoute } from 'next'

// Required for static export
export const dynamic = "force-static"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://aegix-sle.app'
  const currentDate = new Date()
  const publicImages = [
    'AegixLogo.png',
    'apple-touch-icon.png',
    'asian-boy-glasses-student.jpg',
    'asian-boy-student-athletic.jpg',
    'asian-boy-student-cap.jpg',
    'asian-boy-student-curly-hair.jpg',
    'asian-boy-student-sporty.jpg',
    'asian-boy-student-tall.jpg',
    'asian-boy-student.jpg',
    'asian-girl-student-braids.jpg',
    'asian-girl-student-glasses.jpg',
    'asian-girl-student-hijab.jpg',
    'asian-girl-student-long-hair.jpg',
    'asian-girl-student-ponytail.jpg',
    'asian-girl-student-short-hair.jpg',
    'asian-girl-student.jpg',
    'asian-male-teacher-professional.jpg',
    'favicon.png',
    'icon-192x192.png',
    'icon-512x512.png',
    'placeholder-user.jpg',
  ]

  const imageEntries: MetadataRoute.Sitemap = publicImages.map((image) => ({
    url: baseUrl,
    lastModified: currentDate,
    changeFrequency: 'monthly',
    priority: 0.5,
    images: [`${baseUrl}/${image}`],
  }))

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 1,
      images: [`${baseUrl}/AegixLogo.png`, `${baseUrl}/icon-512x512.png`],
    },
    {
      url: `${baseUrl}/canteen`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
      images: [`${baseUrl}/AegixLogo.png`],
    },
    ...imageEntries,
  ]
}
